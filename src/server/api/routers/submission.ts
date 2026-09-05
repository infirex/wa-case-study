import { TRPCError } from '@trpc/server'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'

import { calcSubmissionPayout, clampToBudget } from '~/lib/payout'
import { createSubmissionSchema, detectPlatformFromUrl } from '~/lib/schemas/submission'
import { adminProcedure, createTRPCRouter, creatorProcedure } from '~/server/api/trpc'
import {
  campaigns,
  submissionMetrics,
  submissions,
  users,
} from '~/server/db/schema'

export const submissionRouter = createTRPCRouter({
  /**
   * Submit a video clip URL for an active campaign (Creator only).
   */
  create: creatorProcedure
    .input(createSubmissionSchema)
    .mutation(async ({ ctx, input }) => {
      const detectedPlatform = detectPlatformFromUrl(input.postUrl)
      if (!detectedPlatform) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'URL must be from a supported platform (TikTok, Instagram, or YouTube)',
        })
      }

      const [campaign] = await ctx.db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, input.campaignId))

      if (!campaign) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        })
      }

      if (campaign.status !== 'active') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot submit to a campaign with status '${campaign.status}'`,
        })
      }

      const supportedPlatforms = Array.isArray(campaign.platforms)
        ? (campaign.platforms)
        : []

      if (!supportedPlatforms.includes(detectedPlatform)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Campaign does not support ${detectedPlatform}. Supported platforms: ${supportedPlatforms.join(', ')}`,
        })
      }

      const [existing] = await ctx.db
        .select({ id: submissions.id })
        .from(submissions)
        .where(
          and(
            eq(submissions.campaignId, input.campaignId),
            eq(submissions.postUrl, input.postUrl),
          ),
        )

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This URL has already been submitted to this campaign',
        })
      }

      try {
        const [newSubmission] = await ctx.db
          .insert(submissions)
          .values({
            campaignId: input.campaignId,
            creatorId: ctx.user.userId,
            postUrl: input.postUrl,
            platform: detectedPlatform,
            status: 'pending',
          })
          .returning()

        return newSubmission!
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('submission_campaign_post_unique')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This URL has already been submitted to this campaign',
          })
        }
        throw err
      }
    }),

  /**
   * List submissions for a campaign (for admin review queue).
   */
  listByCampaign: adminProcedure
    .input(
      z.object({
        campaignId: z.uuid(),
        status: z
          .enum(['pending', 'approved', 'rejected', 'paid', 'all'])
          .optional()
          .default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { campaignId, status } = input

      const whereConditions = [eq(submissions.campaignId, campaignId)]
      if (status && status !== 'all') {
        whereConditions.push(eq(submissions.status, status))
      }

      const rows = await ctx.db
        .select({
          id: submissions.id,
          campaignId: submissions.campaignId,
          creatorId: submissions.creatorId,
          creatorEmail: users.email,
          postUrl: submissions.postUrl,
          platform: submissions.platform,
          status: submissions.status,
          rejectionReason: submissions.rejectionReason,
          createdAt: submissions.createdAt,
          updatedAt: submissions.updatedAt,
        })
        .from(submissions)
        .leftJoin(users, eq(submissions.creatorId, users.id))
        .where(and(...whereConditions))
        .orderBy(sql`${submissions.createdAt} DESC`)

      const subIds = rows.map((r) => r.id)
      const metricsMap: Record<string, number> = {}

      if (subIds.length > 0) {
        const metrics = await ctx.db
          .select({
            submissionId: submissionMetrics.submissionId,
            views: submissionMetrics.views,
          })
          .from(submissionMetrics)
          .where(inArray(submissionMetrics.submissionId, subIds))
          .orderBy(sql`${submissionMetrics.capturedAt} DESC`)

        for (const m of metrics) {
          metricsMap[m.submissionId] ??= m.views
        }
      }

      return rows.map((r) => ({
        ...r,
        views: metricsMap[r.id] ?? 0,
      }))
    }),

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
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Submission not found',
          })
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
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Campaign not found',
          })
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Submission not found',
        })
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

  /**
   * List creator's own submissions (Creator only).
   */
  listMine: creatorProcedure
    .input(
      z.object({
        status: z
          .enum(['pending', 'approved', 'rejected', 'paid', 'all'])
          .optional()
          .default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { status } = input

      const whereConditions = [eq(submissions.creatorId, ctx.user.userId)]
      if (status && status !== 'all') {
        whereConditions.push(eq(submissions.status, status))
      }

      const rows = await ctx.db
        .select({
          id: submissions.id,
          campaignId: submissions.campaignId,
          campaignTitle: campaigns.title,
          payoutPer1kViews: campaigns.payoutPer1kViews,
          postUrl: submissions.postUrl,
          platform: submissions.platform,
          status: submissions.status,
          rejectionReason: submissions.rejectionReason,
          createdAt: submissions.createdAt,
          updatedAt: submissions.updatedAt,
        })
        .from(submissions)
        .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
        .where(and(...whereConditions))
        .orderBy(sql`${submissions.createdAt} DESC`)

      const subIds = rows.map((r) => r.id)
      const metricsMap: Record<string, number> = {}

      if (subIds.length > 0) {
        const metrics = await ctx.db
          .select({
            submissionId: submissionMetrics.submissionId,
            views: submissionMetrics.views,
          })
          .from(submissionMetrics)
          .where(inArray(submissionMetrics.submissionId, subIds))
          .orderBy(sql`${submissionMetrics.capturedAt} DESC`)

        for (const m of metrics) {
          metricsMap[m.submissionId] ??= m.views
        }
      }

      return rows.map((r) => {
        const views = metricsMap[r.id] ?? 0
        const payoutPer1k = r.payoutPer1kViews ?? 0
        const estimatedEarnings = calcSubmissionPayout(views, payoutPer1k)

        return {
          ...r,
          views,
          estimatedEarnings,
        }
      })
    }),
})
