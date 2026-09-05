'use client'

import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { Loader2Icon } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '~/components/ui/sheet'
import {
  CAMPAIGN_PLATFORMS,
  createCampaignSchema,
  type CreateCampaignInput,
} from '~/lib/schemas/campaign'
import { api } from '~/trpc/react'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  editId?: string
}

function toDatetimeLocal(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocal(s: string): string {
  if (!s) return ''
  return new Date(s).toISOString()
}

export function CampaignForm({ open, onOpenChange, editId }: Props) {
  const utils = api.useUtils()

  const { data: existing, isLoading: isExistingLoading } =
    api.campaign.getById.useQuery(
      { id: editId! },
      { enabled: !!editId && open },
    )

  const defaultValues: CreateCampaignInput = useMemo(() => {
    return {
      title: '',
      platforms: [],
      payoutPer1kViews: 100,
      totalBudget: 10000,
      status: 'draft',
      startsAt: '',
      endsAt: '',
    }
  }, [])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateCampaignInput>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues,
  })

  // Reset form when sheet opens or existing campaign data loads
  useEffect(() => {
    if (!open) return

    if (editId && existing) {
      reset({
        title: existing.title,
        platforms: existing.platforms as CreateCampaignInput['platforms'],
        payoutPer1kViews: existing.payoutPer1kViews,
        totalBudget: existing.totalBudget,
        status: existing.status,
        startsAt: toDatetimeLocal(existing.startsAt),
        endsAt: toDatetimeLocal(existing.endsAt),
      })
    } else if (!editId) {
      reset(defaultValues)
    }
  }, [open, editId, existing, reset, defaultValues])

  const create = api.campaign.create.useMutation({
    onSuccess: () => {
      void utils.campaign.list.invalidate()
      reset()
      onOpenChange(false)
    },
  })

  const update = api.campaign.update.useMutation({
    onSuccess: () => {
      void utils.campaign.list.invalidate()
      if (editId) {
        void utils.campaign.getById.invalidate({ id: editId })
        void utils.campaign.getOverview.invalidate({ id: editId })
      }
      onOpenChange(false)
    },
  })

  const isLoading =
    create.isPending || update.isPending || isSubmitting || isExistingLoading

  const onSubmit = (data: CreateCampaignInput) => {
    const payload = {
      ...data,
      startsAt: fromDatetimeLocal(data.startsAt),
      endsAt: fromDatetimeLocal(data.endsAt),
    }

    if (editId) {
      update.mutate({ id: editId, ...payload })
    } else {
      create.mutate(payload)
    }
  }

  const error = create.error ?? update.error

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{editId ? 'Edit Campaign' : 'New Campaign'}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 p-4"
        >
          <fieldset
            disabled={isLoading}
            className="m-0 flex flex-col gap-4 border-none p-0"
          >
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Summer clip campaign"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-destructive text-xs">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-destructive text-xs">
                  {errors.status.message}
                </p>
              )}
            </div>

            {/* Platforms */}
            <div className="flex flex-col gap-1.5">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_PLATFORMS.map((p) => (
                  <Controller
                    key={p}
                    control={control}
                    name="platforms"
                    render={({ field }) => {
                      const checked = field.value?.includes(p) ?? false
                      return (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => {
                            const current = field.value ?? []
                            field.onChange(
                              checked
                                ? current.filter((x) => x !== p)
                                : [...current, p],
                            )
                          }}
                          className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            checked
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    }}
                  />
                ))}
              </div>
              {errors.platforms && (
                <p className="text-destructive text-xs">
                  {errors.platforms.message}
                </p>
              )}
            </div>

            {/* Payout per 1k */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payout">Payout per 1k views (cents)</Label>
              <Input
                id="payout"
                type="number"
                min={1}
                placeholder="100"
                {...register('payoutPer1kViews', { valueAsNumber: true })}
              />
              {errors.payoutPer1kViews && (
                <p className="text-destructive text-xs">
                  {errors.payoutPer1kViews.message}
                </p>
              )}
            </div>

            {/* Total budget */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget">Total budget (cents)</Label>
              <Input
                id="budget"
                type="number"
                min={100}
                placeholder="10000"
                {...register('totalBudget', { valueAsNumber: true })}
              />
              {errors.totalBudget && (
                <p className="text-destructive text-xs">
                  {errors.totalBudget.message}
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startsAt">Starts at</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  {...register('startsAt')}
                />
                {errors.startsAt && (
                  <p className="text-destructive text-xs">
                    {errors.startsAt.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="endsAt">Ends at</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  {...register('endsAt')}
                />
                {errors.endsAt && (
                  <p className="text-destructive text-xs">
                    {errors.endsAt.message}
                  </p>
                )}
              </div>
            </div>

            {/* Server error */}
            {error && (
              <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error.message}
              </p>
            )}

            <SheetFooter className="px-0 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
              >
                {editId ? 'Save changes' : 'Create campaign'}
                {isLoading && <Loader2Icon className="size-4 animate-spin" />}
              </Button>
            </SheetFooter>
          </fieldset>
        </form>
      </SheetContent>
    </Sheet>
  )
}
