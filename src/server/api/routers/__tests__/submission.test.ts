import { describe, expect, it } from 'vitest'

import {
  createSubmissionSchema,
  detectPlatformFromUrl,
} from '~/lib/schemas/submission'
import { submissionRouter } from '~/server/api/routers/submission'
import type { db } from '~/server/db'

type DB = typeof db

describe('detectPlatformFromUrl', () => {
  it('correctly detects TikTok URLs', () => {
    expect(detectPlatformFromUrl('https://www.tiktok.com/@user/video/123456789')).toBe('tiktok')
    expect(detectPlatformFromUrl('https://tiktok.com/@user/video/123')).toBe('tiktok')
  })

  it('correctly detects Instagram URLs', () => {
    expect(detectPlatformFromUrl('https://www.instagram.com/reel/C123456789/')).toBe('instagram')
  })

  it('correctly detects YouTube URLs', () => {
    expect(detectPlatformFromUrl('https://www.youtube.com/watch?v=abc1234')).toBe('youtube')
    expect(detectPlatformFromUrl('https://youtu.be/abc1234')).toBe('youtube')
    expect(detectPlatformFromUrl('https://www.youtube.com/shorts/abc1234')).toBe('youtube')
  })

  it('returns null for unsupported platform URLs', () => {
    expect(detectPlatformFromUrl('https://twitter.com/user/status/123')).toBeNull()
    expect(detectPlatformFromUrl('https://example.com/video')).toBeNull()
  })
})

describe('createSubmissionSchema', () => {
  const validCampaignId = '123e4567-e89b-12d3-a456-426614174000'

  it('accepts valid TikTok URL', () => {
    expect(() =>
      createSubmissionSchema.parse({
        campaignId: validCampaignId,
        postUrl: 'https://www.tiktok.com/@user/video/123456',
      }),
    ).not.toThrow()
  })

  it('rejects invalid URL format', () => {
    expect(() =>
      createSubmissionSchema.parse({
        campaignId: validCampaignId,
        postUrl: 'not-a-url',
      }),
    ).toThrow()
  })

  it('rejects unsupported platform URL', () => {
    expect(() =>
      createSubmissionSchema.parse({
        campaignId: validCampaignId,
        postUrl: 'https://facebook.com/video/123',
      }),
    ).toThrow()
  })

  it('rejects invalid campaignId UUID', () => {
    expect(() =>
      createSubmissionSchema.parse({
        campaignId: 'invalid-uuid',
        postUrl: 'https://www.tiktok.com/@user/video/123456',
      }),
    ).toThrow()
  })
})

describe('submissionRouter access control', () => {
  it('blocks non-admin users from listByCampaign', async () => {
    const caller = submissionRouter.createCaller({
      db: {} as DB,
      user: { userId: 'usr_creator', role: 'creator' },
      headers: new Headers(),
    })
    await expect(
      caller.listByCampaign({
        campaignId: '123e4567-e89b-12d3-a456-426614174000',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('blocks unauthenticated users from approve', async () => {
    const caller = submissionRouter.createCaller({
      db: {} as DB,
      user: null,
      headers: new Headers(),
    })
    await expect(
      caller.approve({
        submissionId: '123e4567-e89b-12d3-a456-426614174000',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('blocks unauthenticated users from reject', async () => {
    const caller = submissionRouter.createCaller({
      db: {} as DB,
      user: null,
      headers: new Headers(),
    })
    await expect(
      caller.reject({
        submissionId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'Violation of guidelines',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('blocks unauthenticated users from submission.create', async () => {
    const caller = submissionRouter.createCaller({
      db: {} as DB,
      user: null,
      headers: new Headers(),
    })
    await expect(
      caller.create({
        campaignId: '123e4567-e89b-12d3-a456-426614174000',
        postUrl: 'https://www.tiktok.com/@user/video/123456',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('blocks admin users from submission.create', async () => {
    const caller = submissionRouter.createCaller({
      db: {} as DB,
      user: { userId: 'usr_admin', role: 'admin' },
      headers: new Headers(),
    })
    await expect(
      caller.create({
        campaignId: '123e4567-e89b-12d3-a456-426614174000',
        postUrl: 'https://www.tiktok.com/@user/video/123456',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('validates empty rejection reason', async () => {
    const caller = submissionRouter.createCaller({
      db: {} as DB,
      user: { userId: 'usr_admin', role: 'admin' },
      headers: new Headers(),
    })
    await expect(
      caller.reject({
        submissionId: '123e4567-e89b-12d3-a456-426614174000',
        reason: '',
      }),
    ).rejects.toThrow()
  })
})
