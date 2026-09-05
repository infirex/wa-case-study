'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  XCircleIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { toast } from '~/components/ui/toast'
import {
  createSubmissionSchema,
  detectPlatformFromUrl,
  type CreateSubmissionInput,
} from '~/lib/schemas/submission'
import type { Platform } from '~/lib/schemas/campaign'
import { formatCents } from '~/lib/utils'
import { api } from '~/trpc/react'

interface SubmitClipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign: {
    id: string
    title: string
    platforms: Platform[]
    payoutPer1kViews: number
  } | null
}

export function SubmitClipModal({
  open,
  onOpenChange,
  campaign,
}: SubmitClipModalProps) {
  const utils = api.useUtils()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateSubmissionInput>({
    resolver: zodResolver(createSubmissionSchema),
    defaultValues: {
      campaignId: campaign?.id ?? '',
      postUrl: '',
    },
    values: campaign ? { campaignId: campaign.id, postUrl: '' } : undefined,
  })

  const currentUrl = watch('postUrl')
  const detectedPlatform = currentUrl ? detectPlatformFromUrl(currentUrl) : null
  const isSupportedPlatform = detectedPlatform
    ? Boolean(campaign?.platforms.includes(detectedPlatform))
    : false

  const isFormValid =
    Boolean(currentUrl) && !errors.postUrl && isSupportedPlatform

  const submitMutation = api.submission.create.useMutation({
    onSuccess: () => {
      toast.add({
        title: 'Clip Submitted Successfully!',
        description: 'Your clip URL is submitted and awaiting admin approval.',
        type: 'success',
      })
      void utils.campaign.listActive.invalidate()
      void utils.submission.invalidate()
      reset()
      setServerError(null)
      onOpenChange(false)
    },
    onError: (err) => {
      setServerError(err.message)
    },
  })

  const onSubmit = (data: CreateSubmissionInput) => {
    setServerError(null)
    submitMutation.mutate(data)
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
      setServerError(null)
    }
    onOpenChange(newOpen)
  }

  if (!campaign) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Submit Clip URL
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Submit your published video link to enter this campaign.
          </DialogDescription>
        </DialogHeader>

        {/* Campaign Info Card */}
        <div className="bg-muted/40 space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground font-semibold">{campaign.title}</h3>
            <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">
              {formatCents(campaign.payoutPer1kViews)} / 1k views
            </span>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span>Allowed Platforms:</span>
            <div className="flex gap-1">
              {campaign.platforms.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="text-[10px] capitalize"
                >
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <input type="hidden" {...register('campaignId')} />

          <div className="space-y-2">
            <label
              htmlFor="submit-post-url"
              className="text-foreground text-sm font-medium"
            >
              Video Post URL <span className="text-rose-500">*</span>
            </label>
            <Input
              id="submit-post-url"
              placeholder="https://www.tiktok.com/@creator/video/123456789"
              {...register('postUrl')}
              disabled={submitMutation.isPending}
            />

            {/* Live platform detection helper indicator */}
            {currentUrl && !errors.postUrl && (
              <div className="flex items-center gap-1.5 pt-1 text-xs">
                {detectedPlatform && isSupportedPlatform ? (
                  <>
                    <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-500" />
                    <span className="text-muted-foreground">
                      Platform:{' '}
                      <strong className="text-emerald-400 capitalize">
                        {detectedPlatform}
                      </strong>
                    </span>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="text-destructive size-3.5 shrink-0" />
                    <span className="text-destructive font-medium">
                      Platform:{' '}
                      <strong className="capitalize">
                        {detectedPlatform ?? 'Unknown'}
                      </strong>
                    </span>
                  </>
                )}
              </div>
            )}

            {errors.postUrl && (
              <p className="text-destructive text-xs font-medium">
                {errors.postUrl.message}
              </p>
            )}
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border p-3 text-xs font-medium">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Submission Failed</p>
                <p className="mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={submitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending || !isFormValid}
              id="btn-submit-clip-confirm"
            >
              {submitMutation.isPending && (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              )}
              Submit Clip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
