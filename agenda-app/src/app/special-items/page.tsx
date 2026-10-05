import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { apiPath } from '@/lib/base-path'
import { parseSpecialItemCsv } from '@/lib/special-item-csv'
import { DeleteSpecialItemButton } from '@/components/delete-special-item-button'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, ListChecks, Pencil, Plus, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SpecialItemsPage() {
  const specialItems = await prisma.specialItem.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Special items</h1>
          <p className="text-muted-foreground">
            Predefined value lists with times (e.g. Pathways projects) — pick
            from them when adding an agenda item.
          </p>
        </div>
        <Link href="/special-items/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          New special item
        </Link>
      </div>

      {specialItems.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
          <p className="text-muted-foreground mb-4">No special items yet.</p>
          <Link href="/special-items/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Create your first special item
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {specialItems.map(special => {
            const valueCount = parseSpecialItemCsv(special.csv).values.length
            return (
              <Card key={special.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{special.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ListChecks className="h-3.5 w-3.5" />
                      {valueCount} {valueCount === 1 ? 'value' : 'values'}
                    </p>
                  </div>
                  <a
                    href={apiPath(`/api/special-items/${special.id}/csv`)}
                    className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                    aria-label="Export CSV"
                    title="Export CSV"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <Link
                    href={`/special-items/${special.id}`}
                    className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                    aria-label="Edit special item"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <DeleteSpecialItemButton id={special.id} name={special.name} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
