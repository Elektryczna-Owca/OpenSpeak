'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiPath } from '@/lib/base-path'

// The control page can force a display onto this report page (it renders a
// live "report so far" for an open run). This invisible watcher polls for
// that enforcement being released and sends the display back to /run once
// it's gone, so it doesn't get stranded here after the control page moves on.
export function ReportModeWatcher({
  agendaId,
  runId,
}: {
  agendaId: string
  runId: string
}) {
  const router = useRouter()
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(apiPath(`/api/runs/${runId}`), {
          cache: 'no-store',
        })
        if (!res.ok) return
        const state = await res.json()
        if (!state.endedAt && state.enforcedDisplayMode !== 'report') {
          router.push(`/agendas/${agendaId}/run`)
        }
      } catch {
        // transient network error — next poll retries
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [agendaId, runId, router])
  return null
}
