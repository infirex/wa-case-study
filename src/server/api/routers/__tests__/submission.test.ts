import { describe, expect, it } from 'vitest'

import { submissionRouter } from '~/server/api/routers/submission'
import type { db } from '~/server/db'

type DB = typeof db

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
