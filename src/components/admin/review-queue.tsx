'use client'

import { useState } from 'react'
import { CheckIcon, ExternalLinkIcon, Loader2Icon, XIcon } from 'lucide-react'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { calcSubmissionPayout } from '~/lib/payout'
import type { SubmissionStatus, SubmissionStatusFilter } from '~/lib/schemas/submission'
import { formatCents } from '~/lib/utils'
import { api } from '~/trpc/react'

import { RejectSubmissionDialog } from './reject-submission-dialog'

type Props = {
  campaignId: string
  payoutPer1kViews: number
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ReviewQueue({ campaignId, payoutPer1kViews }: Props) {
  const utils = api.useUtils()
  const [statusFilter, setStatusFilter] = useState<SubmissionStatusFilter>('all')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingSub, setRejectingSub] = useState<{ id: string; email?: string | null } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: submissions, isLoading } = api.submission.listByCampaign.useQuery({
    campaignId,
    status: statusFilter,
  })

  const approveMutation = api.submission.approve.useMutation({
    onSuccess: () => {
      void utils.submission.listByCampaign.invalidate({ campaignId })
      void utils.campaign.getById.invalidate({ id: campaignId })
      void utils.campaign.getOverview.invalidate({ id: campaignId })
      void utils.campaign.list.invalidate()
      setApprovingId(null)
      setErrorMsg(null)
    },
    onError: (err) => {
      setErrorMsg(err.message)
      setApprovingId(null)
    },
  })

  const handleApprove = (id: string) => {
    setApprovingId(id)
    setErrorMsg(null)
    approveMutation.mutate({ submissionId: id })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Filter */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Review Queue</h2>
          <p className="text-xs text-muted-foreground">
            Approve or reject creator submissions
          </p>
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v!)}
        >
          <SelectTrigger className="w-35">
            <SelectValue placeholder="Status filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Submissions Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Creator</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Clip URL</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Est. Payout</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Loading submissions…
                </TableCell>
              </TableRow>
            ) : !submissions || submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No submissions found.
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((sub) => {
                const payoutCents = calcSubmissionPayout(sub.views, payoutPer1kViews)
                const isApproving = approvingId === sub.id

                return (
                  <TableRow key={sub.id}>
                    {/* Creator */}
                    <TableCell className="font-medium">
                      {sub.creatorEmail ?? sub.creatorId}
                    </TableCell>

                    {/* Platform */}
                    <TableCell>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold capitalize">
                        {sub.platform}
                      </span>
                    </TableCell>

                    {/* Clip URL */}
                    <TableCell>
                      <a
                        href={sub.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline max-w-50 truncate"
                      >
                        <span className="truncate">{sub.postUrl}</span>
                        <ExternalLinkIcon className="size-3 shrink-0" />
                      </a>
                    </TableCell>

                    {/* Views */}
                    <TableCell className="tabular-nums font-mono text-xs">
                      {formatNumber(sub.views)}
                    </TableCell>

                    {/* Est. Payout */}
                    <TableCell className="tabular-nums font-mono text-xs font-semibold">
                      {formatCents(payoutCents)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <SubmissionStatusBadge
                        status={sub.status}
                        rejectionReason={sub.rejectionReason}
                      />
                    </TableCell>

                    {/* Submitted date */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(sub.createdAt)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      {sub.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-1 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={isApproving}
                            onClick={() => handleApprove(sub.id)}
                          >
                            {isApproving ? (
                              <Loader2Icon className="size-3 animate-spin" />
                            ) : (
                              <CheckIcon className="size-3" />
                            )}
                            Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isApproving}
                            onClick={() =>
                              setRejectingSub({ id: sub.id, email: sub.creatorEmail })
                            }
                          >
                            <XIcon className="size-3" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reject Modal */}
      <RejectSubmissionDialog
        open={!!rejectingSub}
        onOpenChange={(v) => !v && setRejectingSub(null)}
        submissionId={rejectingSub?.id ?? null}
        campaignId={campaignId}
        creatorEmail={rejectingSub?.email}
      />
    </div>
  )
}

function SubmissionStatusBadge({
  status,
  rejectionReason,
}: {
  status: SubmissionStatus
  rejectionReason?: string | null
}) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">
          Pending
        </Badge>
      )
    case 'approved':
      return (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          Approved
        </Badge>
      )
    case 'rejected':
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className="w-fit border-rose-500/30 bg-rose-500/10 text-rose-400">
            Rejected
          </Badge>
          {rejectionReason && (
            <span className="text-[10px] text-muted-foreground max-w-40 truncate" title={rejectionReason}>
              Reason: {rejectionReason}
            </span>
          )}
        </div>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
