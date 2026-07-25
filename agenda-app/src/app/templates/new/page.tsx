import Link from 'next/link'
import { TemplateForm } from '@/components/template-form'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function NewTemplatePage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">New template</h1>
        <p className="text-muted-foreground">
          Save an agenda CSV to reuse on the import page.
        </p>
      </div>
      <TemplateForm mode="create" />
    </div>
  )
}
