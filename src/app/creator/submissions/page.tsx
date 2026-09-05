'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreatorSubmissionsList } from '~/components/creator/creator-submissions-list'
import { api } from '~/trpc/react'

export default function CreatorSubmissionsPage() {
  const router = useRouter()
  const { data: user, isLoading } = api.user.me.useQuery()

  useEffect(() => {
    if (!isLoading && user?.role === 'admin') {
      router.replace('/admin/campaigns')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="h-8 w-48 bg-muted/40 animate-pulse rounded mb-4" />
        <div className="h-4 w-72 bg-muted/20 animate-pulse rounded mb-8" />
        <div className="h-64 bg-muted/20 animate-pulse rounded-lg" />
      </div>
    )
  }

  if (user?.role === 'admin') {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Submission Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track clip approvals, live view performance, and estimated payouts.
        </p>
      </div>

      <CreatorSubmissionsList />
    </div>
  )
}
