import { prisma } from '@/lib/prisma'
import { serializeAgendaCsv } from '@/lib/agenda-csv'

export const dynamic = 'force-dynamic'

// Downloads the agenda as CSV in the same format the import page accepts,
// so an exported agenda can be re-imported or saved as a template.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const agenda = await prisma.agenda.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: 'asc' }, include: { person: true } },
    },
  })
  if (!agenda) {
    return Response.json({ error: 'not found' }, { status: 404 })
  }

  const csv = serializeAgendaCsv(
    agenda.items.map(item => ({
      title: item.title,
      minMinutes: item.minMinutes,
      durationMinutes: item.durationMinutes,
      maxMinutes: item.maxMinutes,
      personName: item.person?.name ?? null,
      subLabel: item.subLabel,
      subMinMinutes: item.subMinMinutes,
      subExpectedMinutes: item.subExpectedMinutes,
      subMaxMinutes: item.subMaxMinutes,
    })),
  )

  const filename =
    (agenda.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') ||
      'agenda') + '.csv'

  // ASCII fallback plus RFC 5987 encoding so non-ASCII titles survive.
  const asciiFilename = filename.replace(/[^\x20-\x7e]/g, '_')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
