import { z } from 'zod'

export const CAMPAIGN_PLATFORMS = ['tiktok', 'instagram', 'youtube'] as const
export type Platform = (typeof CAMPAIGN_PLATFORMS)[number]

export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed'] as const
export const campaignStatusEnum = z.enum(CAMPAIGN_STATUSES)
export type CampaignStatus = z.infer<typeof campaignStatusEnum>

export const CAMPAIGN_STATUS_FILTERS = [...CAMPAIGN_STATUSES, 'all'] as const
export const campaignStatusFilterEnum = z.enum(CAMPAIGN_STATUS_FILTERS)
export type CampaignStatusFilter = z.infer<typeof campaignStatusFilterEnum>

export const CAMPAIGN_PLATFORM_FILTERS = [...CAMPAIGN_PLATFORMS, 'all'] as const
export const campaignPlatformFilterEnum = z.enum(CAMPAIGN_PLATFORM_FILTERS)
export type CampaignPlatformFilter = z.infer<typeof campaignPlatformFilterEnum>



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

export const listActiveCampaignsSchema = z.object({
  search: z.string().optional(),
  platform: campaignPlatformFilterEnum.optional(),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type ListCampaignsInput = z.infer<typeof listCampaignsSchema>
export type ListActiveCampaignsInput = z.infer<typeof listActiveCampaignsSchema>

