import { Badge } from '~/components/ui/badge'
import type { CampaignStatus } from '~/lib/schemas/campaign'

const VARIANT: Record<CampaignStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  active: 'default',
  paused: 'secondary',
  completed: 'secondary',
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant={VARIANT[status]}>{status}</Badge>
}

