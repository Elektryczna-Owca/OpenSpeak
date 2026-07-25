'use client'

import { useTransition } from 'react'
import { deleteTemplateAction } from '@/actions/template-actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Delete template"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete template "${name}"?`)) {
          startTransition(() => deleteTemplateAction(id))
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
