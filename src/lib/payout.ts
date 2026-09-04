/**
 * Payout logic — all values in integer cents (or abstract units).
 * Pure functions: no DB, no side effects.
 */

/**
 * Earnings for a single submission.
 * Formula: floor(views / 1000) * payoutPer1kViews
 */
export function calcSubmissionPayout(views: number, payoutPer1kViews: number): number {
  return Math.floor(views / 1000) * payoutPer1kViews
}

/**
 * Clamp payout to remaining budget.
 * Returns the actual amount that can be paid out.
 */
export function clampToBudget(payout: number, budgetRemaining: number): number {
  return Math.min(payout, budgetRemaining)
}

/**
 * Total budget spent across approved submissions (pre-approval snapshot).
 * Each entry: { views, payoutPer1kViews }
 */
export function calcTotalSpent(
  approvedSubmissions: Array<{ views: number; payoutPer1kViews: number }>,
): number {
  return approvedSubmissions.reduce(
    (sum, s) => sum + calcSubmissionPayout(s.views, s.payoutPer1kViews),
    0,
  )
}
