import Link from 'next/link'
import { AgendaForm } from '@/components/agenda-form'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function NewAgendaPage() {
  return (
    <div className="max-w-xl space-y-6">
      <Link
        href="/agendas"
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <ChevronLeft className="h-4 w-4" />
        All agendas
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New agenda</h1>
        <p className="text-muted-foreground">
          Give your meeting a title, then add items on the next screen.
        </p>
      </div>
      <AgendaForm mode="create" />
    </div>
  )
}
