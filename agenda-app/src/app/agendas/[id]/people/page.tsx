import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AddPersonForm } from '@/components/add-person-form'
import { PersonCard } from '@/components/person-card'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agenda = await prisma.agenda.findUnique({
    where: { id },
    include: {
      people: { orderBy: { name: 'asc' } },
    },
  })

  if (!agenda) notFound()

  return (
    <div className="space-y-6">
      <Link
        href={`/agendas/${agenda.id}`}
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <ChevronLeft className="h-4 w-4" />
        Back to agenda
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Participants</h1>
        <p className="text-muted-foreground">
          Manage the people who take part in <strong>{agenda.title}</strong>.
          Assign them to items on the agenda page.
        </p>
      </div>

      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {agenda.people.length}{' '}
        {agenda.people.length === 1 ? 'participant' : 'participants'}
      </div>

      {agenda.people.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
          <p className="text-muted-foreground">
            No participants yet. Add your first one below.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {agenda.people.map(person => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}

      <AddPersonForm agendaId={agenda.id} />
    </div>
  )
}
