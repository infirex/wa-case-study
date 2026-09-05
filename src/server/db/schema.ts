import { index, pgEnum, pgTable, unique } from 'drizzle-orm/pg-core'

import type { Platform } from '~/lib/schemas/campaign'

export const userRoleEnum = pgEnum('user_role', ['admin', 'creator'])

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'active',
  'paused',
  'completed',
])

export const submissionStatusEnum = pgEnum('submission_status', [
  'pending',
  'approved',
  'rejected',
  'paid',
])

export const users = pgTable(
  'user',
  (d) => ({
    id: d.text('id').primaryKey(),
    email: d.text('email').notNull().unique(),
    role: userRoleEnum('role').notNull().default('creator'),
    createdAt: d
      .timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: d
      .timestamp('updated_at', { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [index('user_email_idx').on(t.email)],
)

export const campaigns = pgTable(
  'campaign',
  (d) => ({
    id: d.uuid('id').defaultRandom().primaryKey(),
    title: d.text('title').notNull(),
    platforms: d.json('platforms').$type<Platform[]>().notNull(),
    payoutPer1kViews: d.integer('payout_per_1k_views').notNull(),
    totalBudget: d.integer('total_budget').notNull(),
    status: campaignStatusEnum('status').notNull().default('draft'),
    startsAt: d.timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: d.timestamp('ends_at', { withTimezone: true }).notNull(),
    createdAt: d
      .timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: d
      .timestamp('updated_at', { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [index('campaign_status_idx').on(t.status)],
)

export const submissions = pgTable(
  'submission',
  (d) => ({
    id: d.uuid('id').defaultRandom().primaryKey(),
    campaignId: d
      .uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    creatorId: d
      .text('creator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postUrl: d.text('post_url').notNull(),
    platform: d.text('platform').$type<Platform>().notNull(),
    status: submissionStatusEnum('status').notNull().default('pending'),
    rejectionReason: d.text('rejection_reason'),
    createdAt: d
      .timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: d
      .timestamp('updated_at', { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index('submission_campaign_idx').on(t.campaignId),
    index('submission_creator_idx').on(t.creatorId),
    index('submission_status_idx').on(t.status),
    unique('submission_campaign_post_unique').on(t.campaignId, t.postUrl),
  ],
)

export const submissionMetrics = pgTable(
  'submission_metric',
  (d) => ({
    id: d.uuid('id').defaultRandom().primaryKey(),
    submissionId: d
      .uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    capturedAt: d.timestamp('captured_at', { withTimezone: true }).notNull(),
    views: d.integer('views').notNull().default(0),
    likes: d.integer('likes').notNull().default(0),
    comments: d.integer('comments').notNull().default(0),
    createdAt: d
      .timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (t) => [
    index('metric_submission_idx').on(t.submissionId),
    unique('metric_submission_captured_unique').on(
      t.submissionId,
      t.capturedAt,
    ),
  ],
)
