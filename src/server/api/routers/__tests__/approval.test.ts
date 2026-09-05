import { describe, expect, it, vi } from 'vitest'

import { submissionRouter } from '~/server/api/routers/submission'
import type { db } from '~/server/db'

type DB = typeof db

describe('Submission Approval & Budget Ceiling', () => {
  const mockCampaignId = '123e4567-e89b-12d3-a456-426614174000'
  const mockSubmissionId = '987e6543-e89b-12d3-a456-426614174999'

  it('rejects approval with PRECONDITION_FAILED when campaign status is completed', async () => {
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation(() => {
          return {
            where: vi.fn().mockImplementation(() => {
              return {
                for: vi.fn().mockResolvedValue([
                  {
                    id: mockCampaignId,
                    totalBudget: 0,
                    status: 'completed',
                    payoutPer1kViews: 10,
                  },
                ]),
                then: <T>(cb: (res: unknown[]) => T): Promise<T> =>
                  Promise.resolve([
                    {
                      id: mockSubmissionId,
                      campaignId: mockCampaignId,
                      status: 'pending',
                    },
                  ]).then(cb),
              }
            }),
          }
        }),
      }),
    }

    const mockDb = {
      transaction: vi.fn().mockImplementation((callback: (tx: unknown) => unknown) =>
        callback(mockTx),
      ),
    } as unknown as DB

    const caller = submissionRouter.createCaller({
      db: mockDb,
      user: { userId: 'usr_admin', role: 'admin' },
      headers: new Headers(),
    })

    await expect(caller.approve({ submissionId: mockSubmissionId })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: 'Campaign budget is exhausted',
    })
  })

  it('clamps payout to remaining budget and completes campaign when budget drops to zero', async () => {
    const updateSets: Record<string, unknown>[] = []

    const mockTx = {
      select: () => ({
        from: () => ({
          where: () => ({
            for: () =>
              Promise.resolve([
                {
                  id: mockCampaignId,
                  totalBudget: 15,
                  payoutPer1kViews: 10,
                  status: 'active',
                },
              ]),
            orderBy: () => ({
              limit: () => Promise.resolve([{ views: 3000 }]),
            }),
            then: <T>(cb: (res: unknown[]) => T): Promise<T> =>
              Promise.resolve([
                {
                  id: mockSubmissionId,
                  campaignId: mockCampaignId,
                  status: 'pending',
                },
              ]).then(cb),
          }),
        }),
      }),
      update: () => ({
        set: (data: Record<string, unknown>) => {
          updateSets.push(data)
          return {
            where: () => Promise.resolve(),
          }
        },
      }),
    }

    const mockDb = {
      transaction: vi.fn().mockImplementation((callback: (tx: unknown) => unknown) =>
        callback(mockTx),
      ),
    } as unknown as DB

    const caller = submissionRouter.createCaller({
      db: mockDb,
      user: { userId: 'usr_admin', role: 'admin' },
      headers: new Headers(),
    })

    const res = await caller.approve({ submissionId: mockSubmissionId })

    expect(res.payout).toBe(15)
    expect(res.budgetRemaining).toBe(0)
    expect(res.campaignCompleted).toBe(true)

    const campaignUpdate = updateSets.find((u) => 'totalBudget' in u)
    expect(campaignUpdate).toBeDefined()
    expect(campaignUpdate?.status).toBe('completed')
    expect(campaignUpdate?.totalBudget).toBe(0)
  })

  it('handles concurrent approvals: second approval fails once budget is exhausted', async () => {
    let currentBudget = 20
    let campaignStatus = 'active'

    const createConcurrentTxMock = () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            for: () => {
              if (campaignStatus === 'completed' || currentBudget === 0) {
                return Promise.resolve([
                  {
                    id: mockCampaignId,
                    totalBudget: 0,
                    payoutPer1kViews: 10,
                    status: 'completed',
                  },
                ])
              }
              return Promise.resolve([
                {
                  id: mockCampaignId,
                  totalBudget: currentBudget,
                  payoutPer1kViews: 10,
                  status: campaignStatus,
                },
              ])
            },
            orderBy: () => ({
              limit: () => Promise.resolve([{ views: 3000 }]),
            }),
            then: <T>(cb: (res: unknown[]) => T): Promise<T> =>
              Promise.resolve([
                {
                  id: mockSubmissionId,
                  campaignId: mockCampaignId,
                  status: 'pending',
                },
              ]).then(cb),
          }),
        }),
      }),
      update: () => ({
        set: (data: { totalBudget?: number; status?: string }) => {
          if (data.totalBudget !== undefined) {
            currentBudget = data.totalBudget
            if (data.status) campaignStatus = data.status
          }
          return { where: () => Promise.resolve() }
        },
      }),
    })

    const mockDb = {
      transaction: vi.fn().mockImplementation((callback: (tx: unknown) => unknown) =>
        callback(createConcurrentTxMock()),
      ),
    } as unknown as DB

    const caller = submissionRouter.createCaller({
      db: mockDb,
      user: { userId: 'usr_admin', role: 'admin' },
      headers: new Headers(),
    })

    const res1 = await caller.approve({ submissionId: mockSubmissionId })
    expect(res1.payout).toBe(20)
    expect(res1.budgetRemaining).toBe(0)
    expect(res1.campaignCompleted).toBe(true)

    await expect(caller.approve({ submissionId: mockSubmissionId })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: 'Campaign budget is exhausted',
    })
  })
})
