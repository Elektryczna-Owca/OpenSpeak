import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AgendaBoard } from '@/components/agenda-board'
import { AddItemForm } from '@/components/add-item-form'
import { AgendaForm } from '@/components/agenda-form'
import { DeleteAgendaButton } from '@/components/delete-agenda-button'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatMeetingStart } from '@/lib/datetime'
import { CalendarClock, ChevronLeft, Clock, ListChecks, Play, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agenda = await prisma.agenda.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: 'asc' } },
      people: { orderBy: { name: 'asc' } },
    },
  })

  if (!agenda) notFound()

  const totalMin = agenda.items.reduce((sum, i) => sum + i.durationMinutes, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/agendas"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ChevronLeft className="h-4 w-4" />
          All agendas
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/agendas/${agenda.id}/run`} className={buttonVariants()}>
            <Play className="h-4 w-4" />
            Run meeting
          </Link>
          <DeleteAgendaButton id={agenda.id} title={agenda.title} />
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <AgendaForm
            key={agenda.updatedAt.toISOString()}
            mode="edit"
            id={agenda.id}
            defaultTitle={agenda.title}
            defaultDescription={agenda.description}
            defaultStartAt={agenda.startAt?.toISOString() ?? null}
            defaultTimezone={agenda.timezone}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <ListChecks className="h-4 w-4" />
          {agenda.items.length} {agenda.items.length === 1 ? 'item' : 'items'}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {totalMin} min total
        </span>
        <Link
          href={`/agendas/${agenda.id}/people`}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <Users className="h-4 w-4" />
          {agenda.people.length}{' '}
          {agenda.people.length === 1 ? 'participant' : 'participants'}
        </Link>
        {agenda.startAt && agenda.timezone && (
          <span className="flex items-center gap-1">
            <CalendarClock className="h-4 w-4" />
            {formatMeetingStart(agenda.startAt, agenda.timezone)}
          </span>
        )}
      </div>

      <AgendaBoard
        agendaId={agenda.id}
        initialItems={agenda.items}
        people={agenda.people}
      />

      <AddItemForm agendaId={agenda.id} people={agenda.people} />
    </div>
  )
}
