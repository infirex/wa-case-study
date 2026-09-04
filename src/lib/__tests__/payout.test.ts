import { describe, expect, it } from 'vitest'

import { calcSubmissionPayout, calcTotalSpent, clampToBudget } from '~/lib/payout'

describe('calcSubmissionPayout', () => {
  it('returns 0 when views < 1000', () => {
    expect(calcSubmissionPayout(999, 10)).toBe(0)
  })

  it('floors to nearest 1k', () => {
    expect(calcSubmissionPayout(1500, 10)).toBe(10) // floor(1.5) * 10
    expect(calcSubmissionPayout(9999, 10)).toBe(90) // floor(9.999) * 10
  })

  it('exact multiple', () => {
    expect(calcSubmissionPayout(5000, 20)).toBe(100)
  })

  it('zero views → zero payout', () => {
    expect(calcSubmissionPayout(0, 50)).toBe(0)
  })
})

describe('clampToBudget', () => {
  it('returns payout when within budget', () => {
    expect(clampToBudget(50, 100)).toBe(50)
  })

  it('clamps to remaining budget', () => {
    expect(clampToBudget(150, 100)).toBe(100)
  })

  it('returns 0 when budget is 0', () => {
    expect(clampToBudget(50, 0)).toBe(0)
  })

  it('returns exact budget when payout equals budget', () => {
    expect(clampToBudget(100, 100)).toBe(100)
  })
})

describe('calcTotalSpent', () => {
  it('sums payout across multiple submissions', () => {
    const submissions = [
      { views: 2000, payoutPer1kViews: 10 }, // 20
      { views: 5000, payoutPer1kViews: 10 }, // 50
    ]
    expect(calcTotalSpent(submissions)).toBe(70)
  })

  it('empty list → 0', () => {
    expect(calcTotalSpent([])).toBe(0)
  })
})

describe('budget ceiling — approval simulation', () => {
  /**
   * Simulates the approval flow without DB.
   * Real concurrency is tested at DB level; this ensures the math is correct.
   */
  function simulateApproval(
    views: number,
    payoutPer1kViews: number,
    currentBudget: number,
  ): { payout: number; newBudget: number; exhausted: boolean } | { error: string } {
    const raw = calcSubmissionPayout(views, payoutPer1kViews)
    const payout = clampToBudget(raw, currentBudget)

    if (payout === 0 && currentBudget === 0) {
      return { error: 'Campaign budget is exhausted' }
    }

    const newBudget = currentBudget - payout
    return { payout, newBudget, exhausted: newBudget <= 0 }
  }

  it('approves within budget', () => {
    const result = simulateApproval(3000, 10, 100)
    expect(result).toEqual({ payout: 30, newBudget: 70, exhausted: false })
  })

  it('clamps payout to remaining budget when partial', () => {
    // Budget has only 15 left, payout would be 30
    const result = simulateApproval(3000, 10, 15)
    expect(result).toEqual({ payout: 15, newBudget: 0, exhausted: true })
  })

  it('marks campaign completed when budget reaches 0', () => {
    const result = simulateApproval(5000, 20, 100)
    expect(result).toEqual({ payout: 100, newBudget: 0, exhausted: true })
  })

  it('rejects when budget is already 0', () => {
    const result = simulateApproval(5000, 10, 0)
    expect(result).toEqual({ error: 'Campaign budget is exhausted' })
  })

  it('sequential approvals correctly drain budget', () => {
    let budget = 100
    const submissions = [
      { views: 3000, payoutPer1kViews: 10 }, // payout 30, budget → 70
      { views: 5000, payoutPer1kViews: 10 }, // payout 50, budget → 20
      { views: 4000, payoutPer1kViews: 10 }, // payout clamped to 20, budget → 0
      { views: 2000, payoutPer1kViews: 10 }, // rejected — budget 0
    ]

    const payouts: number[] = []
    for (const s of submissions) {
      const result = simulateApproval(s.views, s.payoutPer1kViews, budget)
      if ('error' in result) {
        payouts.push(-1) // signals rejection
      } else {
        budget = result.newBudget
        payouts.push(result.payout)
      }
    }

    expect(payouts).toEqual([30, 50, 20, -1])
    expect(budget).toBe(0)
  })
})
