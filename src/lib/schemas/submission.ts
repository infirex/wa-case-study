import { z } from 'zod'
import { CAMPAIGN_PLATFORMS, type Platform } from './campaign'

export const SUPPORTED_PLATFORMS = CAMPAIGN_PLATFORMS
export type { Platform }

export const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected', 'paid'] as const
export const submissionStatusEnum = z.enum(SUBMISSION_STATUSES)
export type SubmissionStatus = z.infer<typeof submissionStatusEnum>

export const SUBMISSION_STATUS_FILTERS = [...SUBMISSION_STATUSES, 'all'] as const
export const submissionStatusFilterEnum = z.enum(SUBMISSION_STATUS_FILTERS)
export type SubmissionStatusFilter = z.infer<typeof submissionStatusFilterEnum>

export const TIKTOK_REGEX = /tiktok\.com/i
export const INSTAGRAM_REGEX = /instagram\.com/i
export const YOUTUBE_REGEX = /(youtube\.com|youtu\.be)/i

export function detectPlatformFromUrl(url: string): Platform | null {
  if (TIKTOK_REGEX.test(url)) return 'tiktok'
  if (INSTAGRAM_REGEX.test(url)) return 'instagram'
  if (YOUTUBE_REGEX.test(url)) return 'youtube'
  return null
}

export const createSubmissionSchema = z.object({
  campaignId: z.uuid('Invalid campaign ID'),
  postUrl: z
    .string()
    .url('Please enter a valid URL')
    .refine(
      (url) => detectPlatformFromUrl(url) !== null,
      'URL must be from a supported platform (TikTok, Instagram, or YouTube)',
    ),
})

export const listSubmissionsSchema = z.object({
  campaignId: z.uuid(),
  status: submissionStatusFilterEnum.optional().default('all'),
})

export const listMineSubmissionsSchema = z.object({
  status: submissionStatusFilterEnum.optional().default('all'),
})

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>
export type ListSubmissionsInput = z.infer<typeof listSubmissionsSchema>
export type ListMineSubmissionsInput = z.infer<typeof listMineSubmissionsSchema>

