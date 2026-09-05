import { Badge } from '~/components/ui/badge'

type Status = 'draft' | 'active' | 'paused' | 'completed'

const VARIANT: Record<Status, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  active: 'default',
  paused: 'secondary',
  completed: 'secondary',
}

export function CampaignStatusBadge({ status }: { status: Status }) {
  return <Badge variant={VARIANT[status]}>{status}</Badge>
}
