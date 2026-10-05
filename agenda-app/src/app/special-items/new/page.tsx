import Link from 'next/link'
import { SpecialItemForm } from '@/components/special-item-form'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function NewSpecialItemPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/special-items"
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <ChevronLeft className="h-4 w-4" />
        All special items
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New special item</h1>
        <p className="text-muted-foreground">
          Paste or load a CSV of values to pick from when adding agenda items.
        </p>
      </div>
      <SpecialItemForm mode="create" />
    </div>
  )
}
