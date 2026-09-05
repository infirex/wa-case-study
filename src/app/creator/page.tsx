import { redirect } from 'next/navigation'
import { api } from '~/trpc/server'

export default async function CreatorRootPage() {
  const me = await api.user.me()

  if (me?.role === 'admin') {
    redirect('/admin/campaigns')
  }

  redirect('/creator/campaigns')
}
