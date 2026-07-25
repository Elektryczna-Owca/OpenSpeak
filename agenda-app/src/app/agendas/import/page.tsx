import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ImportForm } from '@/components/import-form'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ImportAgendaPage() {
  const templates = await prisma.template.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, csv: true },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/agendas"
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <ChevronLeft className="h-4 w-4" />
        All agendas
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import agenda</h1>
        <p className="text-muted-foreground">
          Paste agenda items as CSV, or start from a saved template.
        </p>
      </div>
      <ImportForm templates={templates} />
    </div>
  )
}
