import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { apiPath } from '@/lib/base-path'
import { SpecialItemForm } from '@/components/special-item-form'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EditSpecialItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const special = await prisma.specialItem.findUnique({ where: { id } })
  if (!special) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/special-items"
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <ChevronLeft className="h-4 w-4" />
        All special items
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Edit special item</h1>
        <a
          href={apiPath(`/api/special-items/${special.id}/csv`)}
          className={buttonVariants({ variant: 'outline' })}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>
      <SpecialItemForm
        key={special.updatedAt.toISOString()}
        mode="edit"
        id={special.id}
        defaultName={special.name}
        defaultCsv={special.csv}
      />
    </div>
  )
}
