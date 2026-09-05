import { Loader2Icon } from 'lucide-react'

export default function LoadingPage() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-8">
      <Loader2Icon className="text-primary size-8 animate-spin" />
    </main>
  )
}
