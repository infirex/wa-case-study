import { TRPCError } from '@trpc/server'
import { and, count, eq, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  createCampaignSchema,
  listCampaignsSchema,
  updateCampaignSchema,
} from '~/lib/schemas/campaign'
import { adminProcedure, createTRPCRouter } from '~/server/api/trpc'
import { campaigns } from '~/server/db/schema'

export const campaignRouter = createTRPCRouter({
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
