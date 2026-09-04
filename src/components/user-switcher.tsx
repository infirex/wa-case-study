'use client'

import { useRouter } from 'next/navigation'
import { api } from '~/trpc/react'
import { switchUserAction, logoutAction } from '~/server/auth/actions'

export function UserSwitcher() {
  const router = useRouter()
  const utils = api.useUtils()
  const { data: users, isLoading: usersLoading } = api.user.list.useQuery()
  const { data: currentUser, isLoading: meLoading } = api.user.me.useQuery()

  const handleSelect = async (userId: string) => {
    if (!userId) {
      await logoutAction()
    } else {
      const targetUser = users?.find((u) => u.id === userId)
      if (!targetUser) return
      await switchUserAction({
        userId: targetUser.id,
        role: targetUser.role,
        email: targetUser.email,
      })
    }
    await utils.user.me.invalidate()
    router.refresh()
  }

  if (usersLoading || meLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        Loading...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 backdrop-blur">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-slate-400">Active Role:</span>
        {currentUser ? (
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              currentUser.role === 'admin'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {currentUser.role}
          </span>
        ) : (
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
            Guest
          </span>
        )}
      </div>

      <select
        value={currentUser?.userId ?? ''}
        onChange={(e) => void handleSelect(e.target.value)}
        disabled={usersLoading || meLoading}
        className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-200 outline-none transition hover:border-slate-600 focus:border-indigo-500 disabled:opacity-50"
      >
        <option value="">-- Switch User --</option>
        {users?.map((u) => (
          <option key={u.id} value={u.id}>
            {u.email} ({u.role})
          </option>
        ))}
      </select>
    </div>
  )
}
