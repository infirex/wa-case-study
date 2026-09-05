import { TRPCError } from '@trpc/server'
import { and, count, eq, ilike, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'

import { calcSubmissionPayout } from '~/lib/payout'
import {
  createCampaignSchema,
  listCampaignsSchema,
  updateCampaignSchema,
} from '~/lib/schemas/campaign'
import { adminProcedure, createTRPCRouter, protectedProcedure } from '~/server/api/trpc'
import { campaigns, submissionMetrics, submissions } from '~/server/db/schema'

export const campaignRouter = createTRPCRouter({
  listActive: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          platform: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const search = input?.search
      const platform = input?.platform

      const whereConditions = [eq(campaigns.status, 'active')]

      if (search) {
        whereConditions.push(ilike(campaigns.title, `%${search}%`))
      }

      const rows = await ctx.db
        .select()
        .from(campaigns)
        .where(and(...whereConditions))
        .orderBy(sql`${campaigns.createdAt} DESC`)

      if (platform && platform !== 'all') {
        return rows.filter(
          (c) => Array.isArray(c.platforms) && c.platforms.includes(platform),
        )
      }

      return rows
    }),

  list: adminProcedure
    .input(listCampaignsSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, status } = input
      const offset = (page - 1) * pageSize

      const where = and(
        status ? eq(campaigns.status, status) : undefined,
        search ? ilike(campaigns.title, `%${search}%`) : undefined,
      )

      const [rows, countRows] = await Promise.all([
        ctx.db
          .select()
          .from(campaigns)
          .where(where)
          .orderBy(sql`${campaigns.createdAt} DESC`)
          .limit(pageSize)
          .offset(offset),
        ctx.db.select({ total: count() }).from(campaigns).where(where),
      ])

      const total = Number(countRows[0]?.total ?? 0)

      return {
        items: rows,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    }),

  getById: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [campaign] = await ctx.db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, input.id))

      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' })
      return campaign
    }),

  getOverview: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [campaign] = await ctx.db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, input.id))

      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' })
      }

      // Fetch all approved or paid submissions for this campaign
      const approvedSubmissions = await ctx.db
        .select({ id: submissions.id })
        .from(submissions)
        .where(
          and(
            eq(submissions.campaignId, input.id),
            inArray(submissions.status, ['approved', 'paid']),
          ),
        )

      const approvedIds = approvedSubmissions.map((s) => s.id)

      let totalApprovedViews = 0
      let totalBudgetSpent = 0
      const latestViewsMap: Record<string, number> = {}
      const dailyMap: Record<string, number> = {}

      if (approvedIds.length > 0) {
        const metrics = await ctx.db
          .select({
            submissionId: submissionMetrics.submissionId,
            capturedAt: submissionMetrics.capturedAt,
            views: submissionMetrics.views,
          })
          .from(submissionMetrics)
          .where(inArray(submissionMetrics.submissionId, approvedIds))
          .orderBy(sql`${submissionMetrics.capturedAt} ASC`)

        for (const m of metrics) {
          latestViewsMap[m.submissionId] = m.views
          const dateStr = m.capturedAt.toISOString().split('T')[0]!
          dailyMap[dateStr] = (dailyMap[dateStr] ?? 0) + m.views
        }

        totalApprovedViews = Object.values(latestViewsMap).reduce((a, b) => a + b, 0)
        totalBudgetSpent = calcSubmissionPayout(totalApprovedViews, campaign.payoutPer1kViews)
      }

      // Generate daily series between campaign startsAt and endsAt (or today)
      const startDate = new Date(campaign.startsAt)
      const endDate = new Date(campaign.endsAt)

      const cur = new Date(startDate)
      cur.setHours(0, 0, 0, 0)

      const end = new Date(endDate)
      end.setHours(0, 0, 0, 0)

      const dailyViewsList: Array<{ date: string; views: number }> = []

      let loopCount = 0
      while (cur <= end && loopCount < 90) {
        const dateStr = cur.toISOString().split('T')[0]!
        dailyViewsList.push({
          date: dateStr,
          views: dailyMap[dateStr] ?? 0,
        })
        cur.setDate(cur.getDate() + 1)
        loopCount++
      }

      return {
        campaignId: campaign.id,
        totalApprovedSubmissions: approvedIds.length,
        totalApprovedViews,
        payoutPer1kViews: campaign.payoutPer1kViews,
        budgetSpent: totalBudgetSpent,
        budgetRemaining: campaign.totalBudget,
        status: campaign.status,
        dailyViews: dailyViewsList,
      }
    }),

  create: adminProcedure
    .input(createCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await ctx.db
        .insert(campaigns)
        .values({
          title: input.title,
          platforms: input.platforms,
          payoutPer1kViews: input.payoutPer1kViews,
          totalBudget: input.totalBudget,
          status: input.status,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
        })
        .returning()

      return campaign!
    }),

  update: adminProcedure
    .input(updateCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input

      const [existing] = await ctx.db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(eq(campaigns.id, id))

      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' })

      const [updated] = await ctx.db
        .update(campaigns)
        .set({
          ...rest,
          startsAt: rest.startsAt ? new Date(rest.startsAt) : undefined,
          endsAt: rest.endsAt ? new Date(rest.endsAt) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id))
        .returning()

      return updated!
    }),
})
