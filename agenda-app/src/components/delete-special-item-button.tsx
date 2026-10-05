'use client'

import { useTransition } from 'react'
import { deleteSpecialItemAction } from '@/actions/special-item-actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteSpecialItemButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Delete special item"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            `Delete special item "${name}"? Agenda items picked from it keep their title and times.`,
          )
        ) {
          startTransition(() => deleteSpecialItemAction(id))
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
