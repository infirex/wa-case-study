import { describe, expect, it } from 'vitest'

import {
  createCampaignSchema,
  updateCampaignSchema,
  listCampaignsSchema,
} from '~/lib/schemas/campaign'
import { campaignRouter } from '~/server/api/routers/campaign'
import type { db } from '~/server/db'

type DB = typeof db



describe('createCampaignSchema', () => {
  const base = {
    title: 'Test',
    platforms: ['tiktok' as const],
    payoutPer1kViews: 100,
    totalBudget: 1000,
    status: 'draft' as const,
    startsAt: '2025-01-01T00:00:00.000Z',
    endsAt: '2025-06-01T00:00:00.000Z',
  }

  it('accepts valid input', () => {
    expect(() => createCampaignSchema.parse(base)).not.toThrow()
  })

  it('rejects payoutPer1kViews < 1', () => {
    expect(() => createCampaignSchema.parse({ ...base, payoutPer1kViews: 0 })).toThrow()
  })

  it('rejects totalBudget < 100', () => {
    expect(() => createCampaignSchema.parse({ ...base, totalBudget: 99 })).toThrow()
  })

  it('rejects endsAt <= startsAt', () => {
    expect(() =>
      createCampaignSchema.parse({ ...base, endsAt: '2025-01-01T00:00:00.000Z' }),
    ).toThrow()

    expect(() =>
      createCampaignSchema.parse({ ...base, endsAt: '2024-12-31T00:00:00.000Z' }),
    ).toThrow()
  })

  it('rejects empty platforms array', () => {
    expect(() => createCampaignSchema.parse({ ...base, platforms: [] })).toThrow()
  })

  it('rejects empty title', () => {
    expect(() => createCampaignSchema.parse({ ...base, title: '' })).toThrow()
  })
})

describe('updateCampaignSchema', () => {
  it('accepts partial input with id', () => {
    const result = updateCampaignSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Updated',
    })
    expect(result.title).toBe('Updated')
  })

  it('rejects missing id', () => {
    expect(() => updateCampaignSchema.parse({ title: 'No ID' })).toThrow()
  })
})

describe('listCampaignsSchema defaults', () => {
  it('defaults page to 1 and pageSize to 20', () => {
    const result = listCampaignsSchema.parse({})
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
  })
})

// ── Router access control ─────────────────────────────────────────────────────

describe('campaignRouter access control', () => {
  it('blocks creator from campaign.list', async () => {
    const caller = campaignRouter.createCaller({
      db: {} as DB,
      user: { userId: 'usr_creator', role: 'creator' },
      headers: new Headers(),
    })
    await expect(caller.list({ page: 1, pageSize: 20 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('blocks unauthenticated from campaign.create', async () => {
    const caller = campaignRouter.createCaller({
      db: {} as DB,
      user: null,
      headers: new Headers(),
    })
    await expect(
      caller.create({
        title: 'x',
        platforms: ['tiktok'],
        payoutPer1kViews: 100,
        totalBudget: 1000,
        status: 'draft',
        startsAt: '2025-01-01T00:00:00.000Z',
        endsAt: '2025-06-01T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
