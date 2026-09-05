'use client'

import Link from 'next/link'
import { api } from '~/trpc/react'
import { ThemeToggle } from './theme-toggle'
import { UserSwitcher } from './user-switcher'

export function Header() {
  const { data: currentUser } = api.user.me.useQuery()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
            <span className="rounded-md bg-primary px-2 py-1 text-xs tracking-wider text-primary-foreground">
              WAYV
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Clipping Marketplace
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {currentUser?.role === 'admin' && (
              <Link
                href="/admin/campaigns"
                className="text-muted-foreground hover:text-foreground transition-colors"
                id="nav-admin-campaigns"
              >
                Campaigns
              </Link>
            )}

            {currentUser?.role === 'creator' && (
              <>
                <Link
                  href="/creator/campaigns"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  id="nav-creator-explore"
                >
                  Explore Campaigns
                </Link>
                <Link
                  href="/creator/submissions"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  id="nav-creator-submissions"
                >
                  My Submissions
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <UserSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

