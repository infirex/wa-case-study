'use client'

import { PencilIcon, PlusIcon, SearchIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { CampaignForm } from '~/components/admin/campaign-form'
import { CampaignStatusBadge } from '~/components/admin/campaign-status-badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import type { CampaignStatusFilter } from '~/lib/schemas/campaign'
import { formatCents } from '~/lib/utils'
import { api } from '~/trpc/react'

const PAGE_SIZE = 20

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' })
}

export default function CampaignsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>(undefined)

  const { data: me, isLoading: meLoading } = api.user.me.useQuery()

  useEffect(() => {
    if (!meLoading && me?.role !== 'admin') {
      router.replace('/creator/campaigns')
    }
  }, [me, meLoading, router])

  const { data, isLoading, isError } = api.campaign.list.useQuery(
    {
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    },
    { enabled: me?.role === 'admin' },
  )

  if (meLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    )
  }

  if (me?.role !== 'admin') {
    return null
  }

  const openCreate = () => {
    setEditId(undefined)
    setFormOpen(true)
  }

  const openEdit = (id: string) => {
    setEditId(id)
    setFormOpen(true)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage clipping campaigns and budgets
          </p>
        </div>
        <Button onClick={openCreate} size="sm" id="btn-new-campaign">
          <PlusIcon className="mr-1.5 size-4" />
          New Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            id="campaign-search"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v ?? 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-36" id="campaign-status-filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead className="text-right">Payout / 1k</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground py-12 text-center"
                >
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-destructive py-12 text-center"
                >
                  Failed to load campaigns.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground py-12 text-center"
                >
                  No campaigns found.
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/40 cursor-pointer">
                <TableCell>
                  <Link
                    href={`/admin/campaigns/${c.id}`}
                    className="font-medium hover:underline"
                  >
                    {c.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <CampaignStatusBadge status={c.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.platforms.map((p) => (
                      <Badge
                        key={p}
                        variant="outline"
                        className="text-xs capitalize"
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(c.payoutPer1kViews)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(c.totalBudget)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(c.startsAt)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(c.endsAt)}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => openEdit(c.id)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded p-1 transition-colors"
                    aria-label="Edit campaign"
                    id={`btn-edit-${c.id}`}
                  >
                    <PencilIcon className="size-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="text-muted-foreground mt-4 flex items-center justify-between text-sm">
          <span>
            {data.total} campaign{data.total !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-2">
              Page {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Sheet */}
      <CampaignForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editId={editId}
      />
    </main>
  )
}
