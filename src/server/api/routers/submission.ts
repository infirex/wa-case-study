import { TRPCError } from '@trpc/server'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { calcSubmissionPayout, clampToBudget } from '~/lib/payout'
import { adminProcedure, createTRPCRouter } from '~/server/api/trpc'
import { campaigns, submissions, submissionMetrics } from '~/server/db/schema'

export const submissionRouter = createTRPCRouter({
  /**
   * Approve a submission.
   *
   * Concurrency strategy:
   *   1. Open a transaction.
   *   2. Lock the campaign row with SELECT FOR UPDATE — concurrent approvals queue here.
   *   3. Re-read budget state inside the lock.
   *   4. Compute payout clamped to remaining budget.
   *   5. If payout == 0 (budget exhausted), reject with PRECONDITION_FAILED.
   *   6. Mark submission approved and decrement budget.
   *   7. If budget reaches 0, mark campaign completed.
   */
  approve: adminProcedure
    .input(z.object({ submissionId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        // 1. Fetch submission first (no lock needed yet)
        const [submission] = await tx
          .select()
          .from(submissions)
          .where(eq(submissions.id, input.submissionId))

        if (!submission) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found' })
        }

        if (submission.status !== 'pending') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Submission is already ${submission.status}`,
          })
        }

        // 2. Lock the campaign row — serializes concurrent approvals for same campaign
        const [campaign] = await tx
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, submission.campaignId))
          .for('update')

        if (!campaign) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' })
        }

        if (campaign.status === 'completed') {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Campaign budget is exhausted',
          })
        }

        // 3. Get latest view count for this submission (max capturedAt)
        const [latestMetric] = await tx
          .select({ views: submissionMetrics.views })
          .from(submissionMetrics)
          .where(eq(submissionMetrics.submissionId, submission.id))
          .orderBy(sql`${submissionMetrics.capturedAt} DESC`)
          .limit(1)

        const views = latestMetric?.views ?? 0

        // 4. Compute payout clamped to remaining budget
        const rawPayout = calcSubmissionPayout(views, campaign.payoutPer1kViews)
        const payout = clampToBudget(rawPayout, campaign.totalBudget)

        if (payout === 0 && campaign.totalBudget === 0) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Campaign budget is exhausted',
          })
        }

        // 5. Deduct from budget
        const newBudget = campaign.totalBudget - payout

        // 6. Mark submission approved
        await tx
          .update(submissions)
          .set({ status: 'approved', updatedAt: new Date() })
          .where(eq(submissions.id, submission.id))

        // 7. Update campaign budget (and auto-complete if exhausted)
        await tx
          .update(campaigns)
          .set({
            totalBudget: newBudget,
            status: newBudget <= 0 ? 'completed' : campaign.status,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, campaign.id))

        return {
          submissionId: submission.id,
          payout,
          budgetRemaining: newBudget,
          campaignCompleted: newBudget <= 0,
        }
      })
    }),

  /**
   * Reject a submission (requires a reason).
   */
  reject: adminProcedure
    .input(
      z.object({
        submissionId: z.uuid(),
        reason: z.string().min(1, 'Rejection reason is required'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [submission] = await ctx.db
        .select({ id: submissions.id, status: submissions.status })
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))

      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found' })
      }

      if (submission.status !== 'pending') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Submission is already ${submission.status}`,
        })
      }

      await ctx.db
        .update(submissions)
        .set({
          status: 'rejected',
          rejectionReason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, input.submissionId))

      return { submissionId: input.submissionId }
    }),
})
