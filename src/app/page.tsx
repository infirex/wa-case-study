import Link from 'next/link'
import { SparklesIcon, LayoutDashboardIcon, UserIcon } from 'lucide-react'
import { api, HydrateClient } from '~/trpc/server'
import { Badge } from '~/components/ui/badge'
import { buttonVariants } from '~/components/ui/button'
import { cn } from '~/lib/utils'

export default async function Home() {
  const me = await api.user.me()

  return (
    <HydrateClient>
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center">
        <div className="container flex max-w-2xl flex-col items-center justify-center gap-8 px-4 py-16 text-center">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              Wayv Agency <span className="text-primary">Case Study</span>
            </h1>
            <p className="mx-auto max-w-lg text-sm text-muted-foreground sm:text-base">
              Creator Marketplace Platform — Campaign Management & View Ingestion Case Study
            </p>
          </div>

          <div className="w-full rounded-xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <UserIcon className="h-4 w-4" />
              <span>Current Authenticated Session (RSC)</span>
            </div>

            {me ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-4">
                <p className="text-lg font-medium text-card-foreground">{me.email}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    User ID: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{me.userId}</code>
                  </span>
                  <Badge
                    variant={me.role === 'admin' ? 'destructive' : 'secondary'}
                    className="uppercase text-[10px] tracking-wider"
                  >
                    {me.role}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No active user session. Select a user from top right dropdown.
              </p>
            )}
          </div>
        </div>
      </main>
    </HydrateClient>
  )
}

