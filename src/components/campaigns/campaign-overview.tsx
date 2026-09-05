'use client'

import { EyeIcon, FilmIcon, DollarSignIcon, WalletIcon } from 'lucide-react'

import { api } from '~/trpc/react'

import { DailyViewsChart } from './daily-views-chart'

type Props = {
  campaignId: string
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export function CampaignOverview({ campaignId }: Props) {
  const { data: overview, isLoading, isError } = api.campaign.getOverview.useQuery({
    id: campaignId,
  })

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        Loading campaign overview…
      </div>
    )
  }

  if (isError || !overview) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load campaign overview metrics.
      </div>
    )
  }

  const initialTotalBudget = overview.budgetSpent + overview.budgetRemaining
  const percentSpent = initialTotalBudget > 0
    ? Math.min(Math.round((overview.budgetSpent / initialTotalBudget) * 100), 100)
    : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Approved Views */}
        <div className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Approved Views</span>
            <EyeIcon className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight font-mono">
            {formatNumber(overview.totalApprovedViews)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Across {overview.totalApprovedSubmissions} approved clips
          </p>
        </div>

        {/* Approved Clips */}
        <div className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Approved Clips</span>
            <FilmIcon className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight font-mono">
            {formatNumber(overview.totalApprovedSubmissions)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Payout: {formatCents(overview.payoutPer1kViews)} / 1k views
          </p>
        </div>

        {/* Budget Spent */}
        <div className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Budget Spent</span>
            <DollarSignIcon className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight font-mono text-emerald-500">
            {formatCents(overview.budgetSpent)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${percentSpent}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground font-mono">
              {percentSpent}%
            </span>
          </div>
        </div>

        {/* Remaining Budget */}
        <div className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Remaining Budget</span>
            <WalletIcon className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight font-mono">
            {formatCents(overview.budgetRemaining)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {overview.budgetRemaining <= 0
              ? 'Budget exhausted'
              : `Available for future approvals`}
          </p>
        </div>
      </div>

      {/* Daily Views Chart */}
      <DailyViewsChart data={overview.dailyViews} />
    </div>
  )
}
