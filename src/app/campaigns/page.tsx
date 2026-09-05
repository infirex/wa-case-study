'use client'

import Link from 'next/link'
import { api } from '~/trpc/react'

export default function CreatorCampaignsPage() {
  const { data: me } = api.user.me.useQuery()

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Creator Campaigns</h1>
      <p className="mt-2 text-muted-foreground">
        Active campaigns open for clip submissions will appear here.
      </p>
      {me && (
        <p className="mt-4 text-xs text-muted-foreground">
          Logged in as <span className="font-semibold">{me.email}</span> ({me.role})
        </p>
      )}
      <div className="mt-6">
        <Link
          href="/"
          className="text-sm font-medium text-primary hover:underline"
        >
          &larr; Back to Home
        </Link>
      </div>
    </main>
  )
}
