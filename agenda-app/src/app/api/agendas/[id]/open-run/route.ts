import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Polled by idle run/control pages to notice a meeting being started from
// another device (see RunStartWatcher).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const run = await prisma.meetingRun.findFirst({
    where: { agendaId: id, endedAt: null },
    select: { id: true },
  })
  return Response.json({ runId: run?.id ?? null })
}
