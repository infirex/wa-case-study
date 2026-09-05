import { z } from 'zod'

export const CAMPAIGN_PLATFORMS = ['tiktok', 'instagram', 'youtube'] as const

export const campaignStatusEnum = z.enum(['draft', 'active', 'paused', 'completed'])

const validDateString = z
  .string()
  .min(1, 'Date is required')
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid date format' })

export const campaignBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  platforms: z
    .array(z.enum(CAMPAIGN_PLATFORMS))
    .min(1, 'Select at least one platform'),
  payoutPer1kViews: z.number().int().min(1, 'Minimum 1 cent'),
  totalBudget: z.number().int().min(100, 'Minimum $1.00 (100 cents)'),
  status: campaignStatusEnum,
  startsAt: validDateString,
  endsAt: validDateString,
})

export const createCampaignSchema = campaignBaseSchema.refine(
  (d) => new Date(d.endsAt) > new Date(d.startsAt),
  { message: 'End date must be after start date', path: ['endsAt'] },
)

export const updateCampaignSchema = campaignBaseSchema
  .partial()
  .extend({
    id: z.uuid(),
  })
  .refine(
    (d) => {
      if (d.startsAt && d.endsAt) {
        return new Date(d.endsAt) > new Date(d.startsAt)
      }
      return true
    },
    { message: 'End date must be after start date', path: ['endsAt'] },
  )

export const listCampaignsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: campaignStatusEnum.optional(),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type ListCampaignsInput = z.infer<typeof listCampaignsSchema>
