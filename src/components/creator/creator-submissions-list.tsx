'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ExternalLink,
  Video,
  Eye,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import type { SubmissionStatusFilter } from '~/lib/schemas/submission'
import { formatCents } from '~/lib/utils'
import { api } from '~/trpc/react'

function formatViews(views: number) {
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M`
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1)}K`
  }
  return views.toLocaleString()
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CreatorSubmissionsList() {
  const [statusFilter, setStatusFilter] = useState<SubmissionStatusFilter>('all')

  const { data: submissions, isLoading, isError } = api.submission.listMine.useQuery({
    status: statusFilter,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-muted/40 h-24 rounded-xl border" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-muted/20 h-32 rounded-xl border" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm font-medium text-destructive">
        Failed to load your submissions. Please refresh or try again later.
      </div>
    )
  }

  const allSubmissions = submissions ?? []

  // Stats calculation
  const totalSubmissions = allSubmissions.length
  const approvedCount = allSubmissions.filter((s) => s.status === 'approved' || s.status === 'paid').length
  const pendingCount = allSubmissions.filter((s) => s.status === 'pending').length
  const totalEarnings = allSubmissions
    .filter((s) => s.status === 'approved' || s.status === 'paid')
    .reduce((sum, s) => sum + s.estimatedEarnings, 0)

  return (
    <div className="space-y-8">
      {/* Stats Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Submissions
            </span>
            <Video className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalSubmissions}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {approvedCount} approved, {pendingCount} pending review
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Estimated Earnings
            </span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatCents(totalEarnings)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            From approved clip views
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Approval Rate
            </span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {totalSubmissions > 0
              ? `${Math.round((approvedCount / totalSubmissions) * 100)}%`
              : '0%'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on overall submissions
          </p>
        </div>
      </div>

      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            My Submissions
          </h2>
          <p className="text-xs text-muted-foreground">
            Track clip views, review statuses, and payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (val) setStatusFilter(val)
            }}
          >
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submissions List */}
      {allSubmissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No submissions found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {statusFilter !== 'all'
              ? `You have no ${statusFilter} clip submissions.`
              : 'You have not submitted any clips to active campaigns yet.'}
          </p>
          <div className="mt-6">
            <Link href="/creator/campaigns">
              <Button size="sm" className="gap-2 cursor-pointer">
                Explore Campaigns
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {allSubmissions.map((sub) => {
            const isApproved = sub.status === 'approved' || sub.status === 'paid'
            const isRejected = sub.status === 'rejected'
            const isPending = sub.status === 'pending'

            return (
              <div
                key={sub.id}
                className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 hover:border-border/80 transition-all shadow-xs"
                id={`submission-card-${sub.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Campaign & Clip Info */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base text-foreground truncate">
                        {sub.campaignTitle ?? 'Campaign'}
                      </h3>
                      <Badge
                        variant="outline"
                        className="capitalize text-[10px] bg-muted/30"
                      >
                        {sub.platform}
                      </Badge>
                      {/* Status Badge */}
                      {isPending && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          Pending Review
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {sub.status === 'paid' ? 'Paid' : 'Approved'}
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs gap-1">
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </Badge>
                      )}
                    </div>

                    {/* Video Link */}
                    <div>
                      <a
                        href={sub.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono truncate max-w-md"
                      >
                        <span className="truncate">{sub.postUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Submitted on {formatDate(sub.createdAt)}
                    </p>
                  </div>

                  {/* Views & Earnings */}
                  <div className="flex items-start gap-6 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <div className="flex items-center sm:justify-end gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Views</span>
                      </div>
                      <p className="font-bold text-base text-foreground mt-0.5 font-mono">
                        {formatViews(sub.views)}
                      </p>
                    </div>

                    <div className="h-10 w-px bg-border hidden sm:block self-center" />

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>Estimated Earnings</span>
                      </div>
                      <p className={`font-bold text-base mt-0.5 font-mono ${isApproved ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {formatCents(sub.estimatedEarnings)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCents(sub.payoutPer1kViews ?? 0)} / 1k
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason Alert if Rejected */}
                {isRejected && sub.rejectionReason && (
                  <div className="mt-4 rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-rose-200">Rejection Reason: </span>
                      <span>{sub.rejectionReason}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
