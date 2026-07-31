import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Polled by the run display and control pages so both devices stay in sync
// with the current segment (advances happen on whichever device clicks).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: {
      segments: {
        orderBy: { position: 'desc' },
        take: 1,
        include: { person: { select: { name: true } } },
      },
    },
  })
  if (!run) {
    return Response.json({ error: 'not found' }, { status: 404 })
  }
  const segment = run.segments[0] ?? null
  return Response.json({
    endedAt: run.endedAt?.toISOString() ?? null,
    segment:
      segment && segment.endedAt === null
        ? {
            itemId: segment.itemId,
            kind: segment.kind,
            subIndex: segment.subIndex,
            personId: segment.personId,
            personName: segment.person?.name ?? null,
            label: segment.label,
            minMinutes: segment.minMinutes,
            expectedMinutes: segment.expectedMinutes,
            maxMinutes: segment.maxMinutes,
            startedAt: segment.startedAt.toISOString(),
            pausedAt: segment.pausedAt?.toISOString() ?? null,
            pausedSeconds: segment.pausedSeconds,
          }
        : null,
  })
}
