'use client'

import { useTransition } from 'react'
import { deleteRunAction } from '@/actions/run-actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteRunButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={`Delete run from ${label}`}
      onClick={() => {
        if (confirm(`Delete the run from ${label}?`)) {
          startTransition(() => deleteRunAction(id))
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
