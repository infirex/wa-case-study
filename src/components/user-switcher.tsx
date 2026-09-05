'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'
import { api } from '~/trpc/react'
import { switchUserAction, logoutAction } from '~/server/auth/actions'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

export function UserSwitcher() {
  const router = useRouter()
  const utils = api.useUtils()
  const [isPending, setIsPending] = useState(false)
  const { data: users, isLoading: usersLoading } = api.user.list.useQuery()
  const { data: currentUser, isLoading: meLoading } = api.user.me.useQuery()

  const handleSelect = async (userId: string | null) => {
    setIsPending(true)
    try {
      if (!userId || userId === 'logout') {
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
    } finally {
      setIsPending(false)
    }
  }

  if (usersLoading || meLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading...
      </div>
    )
  }

  const selectedValue = currentUser?.userId ?? 'logout'

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/90 px-3 py-1.5 backdrop-blur">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Active Role:</span>
        {currentUser ? (
          <Badge
            variant={currentUser.role === 'admin' ? 'destructive' : 'secondary'}
            className="uppercase text-[10px] tracking-wider"
          >
            {currentUser.role}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Guest
          </Badge>
        )}
      </div>

      <Select
        value={selectedValue}
        onValueChange={handleSelect}
        disabled={usersLoading || meLoading || isPending}
      >
        <SelectTrigger size="sm" className="h-8 text-xs font-medium min-w-45 max-w-56 sm:max-w-72">
          {isPending ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              Switching...
            </span>
          ) : (
            <SelectValue placeholder="-- Guest User --" className="truncate" />
          )}
        </SelectTrigger>
        <SelectContent className="w-auto min-w-45 max-w-80">
          <SelectItem value="logout">-- Guest User --</SelectItem>
          {users?.map((u) => (
            <SelectItem key={u.id} value={u.id} title={`${u.email} (${u.role})`}>
              {u.email} ({u.role})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

