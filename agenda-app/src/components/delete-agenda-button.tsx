'use client'

import { useTransition } from 'react'
import { deleteAgendaAction } from '@/actions/agenda-actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteAgendaButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete "${title}"? This will remove all its items.`)) {
          startTransition(() => deleteAgendaAction(id))
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  )
}
