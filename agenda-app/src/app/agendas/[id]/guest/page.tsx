import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { GuestForm } from '@/components/guest-form'

export const dynamic = 'force-dynamic'

// Public landing page for the guest QR code shown during a meeting.
export default async function GuestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agenda = await prisma.agenda.findUnique({
    where: { id },
    select: { title: true },
  })
  if (!agenda) notFound()

  const openRun = await prisma.meetingRun.findFirst({
    where: { agendaId: id, endedAt: null },
    select: { id: true },
  })

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{agenda.title}</h1>
        <p className="mt-1 text-muted-foreground">Guest registration</p>
      </div>
      {openRun ? (
        <GuestForm agendaId={id} />
      ) : (
        <p className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
          There is no meeting running right now.
        </p>
      )}
    </div>
  )
}
