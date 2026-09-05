import Link from 'next/link'
import { UserSwitcher } from './user-switcher'

export function Header() {
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
            <Link
              href="/admin/campaigns"
              className="text-muted-foreground hover:text-foreground transition-colors"
              id="nav-campaigns"
            >
              Campaigns
            </Link>
          </nav>
        </div>
        <UserSwitcher />
      </div>
    </header>
  )
}
