import Link from 'next/link'
import { UserSwitcher } from './user-switcher'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-100">
          <span className="rounded-md bg-indigo-600 px-2 py-1 text-xs tracking-wider text-white">
            WAYV
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-200">
            Clipping Marketplace
          </span>
        </Link>
        <UserSwitcher />
      </div>
    </header>
  )
}
