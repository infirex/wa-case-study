import { UserIcon } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { api, HydrateClient } from '~/trpc/server'

export default async function Home() {
  const me = await api.user.me()

  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center">
        <div className="container flex max-w-2xl flex-col items-center justify-center gap-8 px-4 py-16 text-center">
          <div className="space-y-3">
            <h1 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-6xl">
              Wayv Agency <span className="text-primary">Clipping Marketplace</span>
            </h1>
            <p className="text-muted-foreground mx-auto max-w-lg text-sm sm:text-base">
              Creator Marketplace Platform — Campaign & Clipping Management & View
              Ingestion
            </p>
          </div>

          <div className="border-border bg-card/80 w-full rounded-xl border p-6 shadow-sm backdrop-blur">
            <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs font-semibold tracking-wider uppercase">
              <UserIcon className="h-4 w-4" />
              <span>Current Authenticated Session (RSC)</span>
            </div>

            {me ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-4">
                <p className="text-card-foreground text-lg font-medium">
                  {me.email}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    User ID:{' '}
                    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                      {me.userId}
                    </code>
                  </span>
                  <Badge
                    variant={me.role === 'admin' ? 'destructive' : 'secondary'}
                    className="text-[10px] tracking-wider uppercase"
                  >
                    {me.role}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground mt-4 text-sm">
                No active user session. Select a user from top right dropdown.
              </p>
            )}
          </div>
        </div>
      </main>
    </HydrateClient>
  )
}
