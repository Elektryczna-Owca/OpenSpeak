import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TemplateForm } from '@/components/template-form'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const template = await prisma.template.findUnique({ where: { id } })
  if (!template) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/templates"
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <ChevronLeft className="h-4 w-4" />
        All templates
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit template</h1>
      </div>
      <TemplateForm
        key={template.updatedAt.toISOString()}
        mode="edit"
        id={template.id}
        defaultName={template.name}
        defaultCsv={template.csv}
      />
    </div>
  )
}
