'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiPath } from '@/lib/base-path'

// The idle run/control pages are server-rendered, so on their own they never
// notice a meeting being started from another device. This invisible watcher
// polls for an open run and refreshes the page when one appears, switching it
// to the live meeting view.
export function RunStartWatcher({ agendaId }: { agendaId: string }) {
  const router = useRouter()
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(apiPath(`/api/agendas/${agendaId}/open-run`), {
          cache: 'no-store',
        })
        if (res.ok && (await res.json()).runId) router.refresh()
      } catch {
        // transient network error — next poll retries
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [agendaId, router])
  return null
}
