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
})
