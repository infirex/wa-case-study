import { redirect } from 'next/navigation'
import { api, HydrateClient } from '~/trpc/server'
import { ActiveCampaignsList } from '~/components/creator/active-campaigns-list'

export const metadata = {
  title: 'Explore Active Campaigns | Wayv Agency',
  description: 'Browse active clipping campaigns, review payout rates, and submit your content.',
}

export default async function CreatorCampaignsPage() {
  const me = await api.user.me()

  if (me?.role === 'admin') {
    redirect('/admin/campaigns')
  }

  return (
    <HydrateClient>
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Explore Active Campaigns
          </h1>
          <p className="text-muted-foreground">
            Find active clipping campaigns, check rates per 1,000 views, and submit your short-form video URLs.
          </p>
        </header>

        <section aria-label="Active Campaigns Directory">
          <ActiveCampaignsList />
        </section>
      </main>
    </HydrateClient>
  )
}
