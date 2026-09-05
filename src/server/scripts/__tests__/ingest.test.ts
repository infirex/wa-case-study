import { describe, expect, it, vi } from 'vitest'

import { getStartOfDay, runIngestion } from '~/server/scripts/ingest'
import { db } from '~/server/db'

describe('Ingest Script Logic & Idempotency', () => {
  it('getStartOfDay zeroes out hours, minutes, seconds, and milliseconds', () => {
    const testDate = new Date('2025-06-15T14:35:45.123Z')
    const startOfDay = getStartOfDay(testDate)
    expect(startOfDay.toISOString()).toBe('2025-06-15T00:00:00.000Z')
  })

  it('runIngestion returns summary statistics for processed submissions', async () => {
    const selectSpy = vi.spyOn(db, 'select').mockImplementation(() => {
      return {
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
            then: <T>(cb: (data: unknown[]) => T): Promise<T> =>
              Promise.resolve(
                cb([
                  { id: 'sub-1', campaignId: 'camp-1', status: 'approved' },
                  { id: 'sub-2', campaignId: 'camp-1', status: 'approved' },
                ]),
              ),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>
    })

    const insertSpy = vi.spyOn(db, 'insert').mockImplementation(() => {
      return {
        values: () => ({
          onConflictDoNothing: () => ({
            returning: () => Promise.resolve([{ submissionId: 'sub-1', views: 500 }]),
          }),
        }),
      } as unknown as ReturnType<typeof db.insert>
    })

    const result = await runIngestion(new Date('2025-06-15'))

    expect(result.total).toBe(2)
    expect(result.successCount).toBe(2)

    selectSpy.mockRestore()
    insertSpy.mockRestore()
  })

  it('idempotency: handles skipped records when onConflictDoNothing returns empty array', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => {
      return {
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
            then: <T>(cb: (data: unknown[]) => T): Promise<T> =>
              Promise.resolve(cb([{ id: 'sub-1', status: 'approved' }])),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>
    })

    vi.spyOn(db, 'insert').mockImplementation(() => {
      return {
        values: () => ({
          onConflictDoNothing: () => ({
            returning: () => Promise.resolve([]),
          }),
        }),
      } as unknown as ReturnType<typeof db.insert>
    })

    const result = await runIngestion(new Date('2025-06-15'))

    expect(result.skippedCount).toBe(1)
    expect(result.successCount).toBe(0)

    vi.restoreAllMocks()
  })

  it('fault tolerance: continues processing when one submission fails', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => {
      return {
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
            then: <T>(cb: (data: unknown[]) => T): Promise<T> =>
              Promise.resolve(
                cb([
                  { id: 'sub-fail', status: 'approved' },
                  { id: 'sub-ok', status: 'approved' },
                ]),
              ),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>
    })

    let callCount = 0
    vi.spyOn(db, 'insert').mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        throw new Error('Database error on first submission')
      }
      return {
        values: () => ({
          onConflictDoNothing: () => ({
            returning: () => Promise.resolve([{ submissionId: 'sub-ok', views: 500 }]),
          }),
        }),
      } as unknown as ReturnType<typeof db.insert>
    })

    const result = await runIngestion(new Date('2025-06-15'))

    expect(result.errorCount).toBe(1)
    expect(result.successCount).toBe(1)
    expect(result.total).toBe(2)

    vi.restoreAllMocks()
  })

  it('updates campaign totalBudget when new metrics yield incremental payout', async () => {
    let updatedCampaignBudget: number | undefined
    let campaignStatus: string | undefined

    // Mock insert for submissionMetrics returning 2000 views
    vi.spyOn(db, 'insert').mockImplementation(() => {
      return {
        values: () => ({
          onConflictDoNothing: () => ({
            returning: () => Promise.resolve([{ submissionId: 'sub-1', views: 2000 }]),
          }),
        }),
      } as unknown as ReturnType<typeof db.insert>
    })

    // Mock second select inside loop for fetching campaign
    let selectCallIndex = 0
    vi.spyOn(db, 'select').mockImplementation(() => {
      selectCallIndex++
      if (selectCallIndex === 1) {
        // First select: approved submissions
        return {
          from: () => ({
            where: () => ({
              then: <T>(cb: (data: unknown[]) => T): Promise<T> =>
                Promise.resolve(cb([{ id: 'sub-1', campaignId: 'camp-1', status: 'approved' }])),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>
      } else if (selectCallIndex === 2) {
        // Second select: latest metric before insert (800 views)
        return {
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => Promise.resolve([{ views: 800 }]),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>
      } else {
        // Third select: campaign row
        return {
          from: () => ({
            where: () =>
              Promise.resolve([
                { id: 'camp-1', payoutPer1kViews: 100, totalBudget: 1000, status: 'active' },
              ]),
          }),
        } as unknown as ReturnType<typeof db.select>
      }
    })

    // Mock campaign update
    vi.spyOn(db, 'update').mockImplementation(() => {
      return {
        set: (data: { totalBudget?: number; status?: string }) => {
          updatedCampaignBudget = data.totalBudget
          campaignStatus = data.status
          return { where: () => Promise.resolve() }
        },
      } as unknown as ReturnType<typeof db.update>
    })

    const result = await runIngestion(new Date('2025-06-15'))

    expect(result.successCount).toBe(1)
    // 800 views + ~200 added views = ~1000 views -> 100 payout. Budget drops from 1000 to 900.
    expect(updatedCampaignBudget).toBe(900)
    expect(campaignStatus).toBe('active')

    vi.restoreAllMocks()
  })
})
