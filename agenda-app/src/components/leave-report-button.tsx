'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setEnforcedDisplayModeAction } from '@/actions/run-actions'
import { Button } from '@/components/ui/button'
import { MonitorPlay } from 'lucide-react'

// Escape hatch for a "report so far" of a still-open run: the control page may
// have forced this report onto the display and then been closed, leaving
// nobody to release it. Clears the enforcement and returns to the display.
export function LeaveReportButton({
  agendaId,
  runId,
}: {
  agendaId: string
  runId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setEnforcedDisplayModeAction(runId, null)
          router.push(`/agendas/${agendaId}/run`)
        })
      }
    >
      <MonitorPlay className="h-4 w-4" />
      Back to display
    </Button>
  )
}
