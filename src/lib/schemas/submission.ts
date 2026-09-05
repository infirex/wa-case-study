import { z } from 'zod'

export const SUPPORTED_PLATFORMS = ['tiktok', 'instagram', 'youtube'] as const
export type Platform = (typeof SUPPORTED_PLATFORMS)[number]

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

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>
