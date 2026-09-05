'use client'

import { Loader2Icon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { api } from '~/trpc/react'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  submissionId: string | null
  campaignId: string
  creatorEmail?: string | null
}

export function RejectSubmissionDialog({
  open,
  onOpenChange,
  submissionId,
  campaignId,
  creatorEmail,
}: Props) {
  const utils = api.useUtils()
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const reject = api.submission.reject.useMutation({
    onSuccess: () => {
      void utils.submission.listByCampaign.invalidate({ campaignId })
      setReason('')
      setErrorMsg(null)
      onOpenChange(false)
    },
    onError: (err) => {
      setErrorMsg(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setErrorMsg('Rejection reason is required.')
      return
    }
    if (!submissionId) return

    setErrorMsg(null)
    reject.mutate({ submissionId, reason: reason.trim() })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setReason('')
          setErrorMsg(null)
        }
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Submission</DialogTitle>
          <DialogDescription>
            {creatorEmail ? (
              <>
                Provide a clear rejection reason for{' '}
                <span className="text-foreground font-semibold">
                  {creatorEmail}
                </span>
                .
              </>
            ) : (
              'Provide a clear rejection reason.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="Clip does not follow brand guidelines / incorrect link..."
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={reject.isPending}
            />
            {errorMsg && <p className="text-destructive text-xs">{errorMsg}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reject.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={reject.isPending}
            >
              {reject.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2Icon className="size-4 animate-spin" />
                  Rejecting...
                </span>
              ) : (
                'Reject Clip'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
