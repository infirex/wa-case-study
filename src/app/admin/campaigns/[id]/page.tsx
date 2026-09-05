'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PencilIcon } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { CampaignForm } from '~/components/campaigns/campaign-form'
import { CampaignOverview } from '~/components/campaigns/campaign-overview'
import { CampaignStatusBadge } from '~/components/campaigns/campaign-status-badge'
import { ReviewQueue } from '~/components/campaigns/review-queue'
import { api } from '~/trpc/react'

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { dateStyle: 'long' })
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)

  const { data: me, isLoading: meLoading } = api.user.me.useQuery()

  useEffect(() => {
    if (!meLoading && me?.role !== 'admin') {
      router.replace('/campaigns')
    }
  }, [me, meLoading, router])

  const { data: campaign, isLoading, isError } = api.campaign.getById.useQuery(
    { id },
    { enabled: me?.role === 'admin' },
  )

  if (meLoading || isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    )
  }

  if (me?.role !== 'admin') {
    return null
  }

  if (isError || !campaign) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-destructive">Campaign not found.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 flex flex-col gap-8">
      {/* Top Header Navigation */}
      <div>
        <Link
          href="/admin/campaigns"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          All campaigns
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{campaign.title}</h1>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>
                Duration: <strong className="text-foreground font-normal">{formatDate(campaign.startsAt)}</strong> – <strong className="text-foreground font-normal">{formatDate(campaign.endsAt)}</strong>
              </span>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span>Platforms:</span>
                {campaign.platforms.map((p) => (
                  <span
                    key={p}
                    className="capitalize rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            id="btn-edit-campaign"
          >
            <PencilIcon className="mr-1.5 size-4" />
            Edit Campaign
          </Button>
        </div>
      </div>

      {/* Overview Metrics & Daily Views Chart */}
      <CampaignOverview campaignId={id} />

      {/* Review Queue */}
      <ReviewQueue campaignId={id} payoutPer1kViews={campaign.payoutPer1kViews} />

      <CampaignForm open={editOpen} onOpenChange={setEditOpen} editId={id} />
    </main>
  )
}
