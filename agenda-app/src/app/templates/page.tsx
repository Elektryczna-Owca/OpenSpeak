import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { parseAgendaCsv } from '@/lib/agenda-csv'
import { DeleteTemplateButton } from '@/components/delete-template-button'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, ListChecks, Pencil, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Reusable agenda CSVs — use them on the import page.
          </p>
        </div>
        <Link href="/templates/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          New template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
          <p className="text-muted-foreground mb-4">No templates yet.</p>
          <Link href="/templates/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map(template => {
            const itemCount = parseAgendaCsv(template.csv).items.length
            return (
              <Card key={template.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{template.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ListChecks className="h-3.5 w-3.5" />
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <Link
                    href={`/templates/${template.id}`}
                    className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                    aria-label="Edit template"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <DeleteTemplateButton id={template.id} name={template.name} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
