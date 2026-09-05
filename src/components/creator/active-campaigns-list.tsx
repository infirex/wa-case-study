'use client'

import { useState } from 'react'
import { Calendar, DollarSign, Filter, Layers, Search, Video } from 'lucide-react'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { SubmitClipModal } from '~/components/creator/submit-clip-modal'
import type { CampaignPlatformFilter, Platform } from '~/lib/schemas/campaign'
import { formatCents } from '~/lib/utils'
import { api } from '~/trpc/react'

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getPlatformBadge(platform: Platform) {
  const normalized = platform.toLowerCase()
  if (normalized === 'tiktok') {
    return (
      <Badge
        key={platform}
        variant="outline"
        className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-medium"
      >
        TikTok
      </Badge>
    )
  }
  if (normalized === 'instagram') {
    return (
      <Badge
        key={platform}
        variant="outline"
        className="border-pink-500/30 bg-pink-500/10 text-pink-400 font-medium"
      >
        Instagram
      </Badge>
    )
  }
  if (normalized === 'youtube') {
    return (
      <Badge
        key={platform}
        variant="outline"
        className="border-red-500/30 bg-red-500/10 text-red-400 font-medium"
      >
        YouTube
      </Badge>
    )
  }
  return (
    <Badge key={platform} variant="secondary">
      {platform}
    </Badge>
  )
}

export function ActiveCampaignsList() {
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<CampaignPlatformFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<{
    id: string
    title: string
    platforms: Platform[]
    payoutPer1kViews: number
  } | null>(null)

  const { data: campaigns, isLoading, isError } = api.campaign.listActive.useQuery({
    search: search || undefined,
    platform: platformFilter !== 'all' ? platformFilter : undefined,
  })

  const openSubmitModal = (c: {
    id: string
    title: string
    platforms: Platform[]
    payoutPer1kViews: number
  }) => {
    setSelectedCampaign(c)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaigns by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            id="search-campaigns"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={platformFilter} onValueChange={(val) => setPlatformFilter(val ?? 'all')}>
            <SelectTrigger className="w-45" id="filter-platform">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-64 animate-pulse rounded-xl border border-border bg-card/50 p-6"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive">
          Failed to load active campaigns. Please try again later.
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && campaigns?.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Video className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No Active Campaigns Found
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search || platformFilter !== 'all'
              ? 'Try adjusting your search query or platform filter.'
              : 'There are currently no active campaigns available for clip submission.'}
          </p>
        </div>
      )}

      {/* Campaigns Grid */}
      {!isLoading && !isError && campaigns && campaigns.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:border-border/80 hover:shadow-md"
              id={`campaign-card-${campaign.id}`}
            >
              <div className="space-y-4">
                {/* Header: Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg text-foreground line-clamp-1">
                    {campaign.title}
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0 capitalize"
                  >
                    {campaign.status}
                  </Badge>
                </div>

                {/* Platforms */}
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(campaign.platforms) &&
                    campaign.platforms.map((p) => getPlatformBadge(p))}
                </div>

                {/* Payout & Budget Info */}
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Rate</span>
                    </div>
                    <p className="mt-1 font-semibold text-sm text-foreground">
                      {formatCents(campaign.payoutPer1kViews)}
                      <span className="text-xs font-normal text-muted-foreground">
                        {' '}/ 1k views
                      </span>
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Layers className="h-3.5 w-3.5" />
                      <span>Budget</span>
                    </div>
                    <p className="mt-1 font-semibold text-sm text-foreground">
                      {formatCents(campaign.totalBudget)}
                    </p>
                  </div>
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {formatDate(campaign.startsAt)} - {formatDate(campaign.endsAt)}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  className="w-full cursor-pointer"
                  id={`btn-submit-${campaign.id}`}
                  onClick={() => openSubmitModal(campaign)}
                >
                  <Video className="mr-2 h-4 w-4" />
                  Submit Clip
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Clip Dialog */}
      <SubmitClipModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        campaign={selectedCampaign}
      />
    </div>
  )
}
