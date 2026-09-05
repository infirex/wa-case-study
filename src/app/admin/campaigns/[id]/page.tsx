'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PencilIcon } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { CampaignForm } from '~/components/campaigns/campaign-form'
import { CampaignStatusBadge } from '~/components/campaigns/campaign-status-badge'
import { ReviewQueue } from '~/components/campaigns/review-queue'
import { api } from '~/trpc/react'

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

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
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Back */}
      <Link
        href="/admin/campaigns"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        All campaigns
      </Link>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.title}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          id="btn-edit-campaign"
        >
          <PencilIcon className="mr-1.5 size-4" />
          Edit
        </Button>
      </div>

      {/* Stats grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Payout / 1k views" value={formatCents(campaign.payoutPer1kViews)} />
        <StatCard label="Total budget" value={formatCents(campaign.totalBudget)} />
        <StatCard label="Starts" value={formatDate(campaign.startsAt)} />
        <StatCard label="Ends" value={formatDate(campaign.endsAt)} />
      </div>

      {/* Platforms */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Platforms</h2>
        <div className="flex gap-2">
          {campaign.platforms.map((p) => (
            <span
              key={p}
              className="capitalize rounded-md border border-border px-3 py-1 text-sm"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Review Queue */}
      <div className="mt-10">
        <ReviewQueue campaignId={id} payoutPer1kViews={campaign.payoutPer1kViews} />
      </div>

      <CampaignForm open={editOpen} onOpenChange={setEditOpen} editId={id} />
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
