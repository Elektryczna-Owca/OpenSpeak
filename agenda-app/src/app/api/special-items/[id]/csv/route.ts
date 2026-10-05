import { prisma } from '@/lib/prisma'
import { parseSpecialItemCsv, serializeSpecialItemCsv } from '@/lib/special-item-csv'

export const dynamic = 'force-dynamic'

// Downloads a special item's value list as CSV that the special item form
// re-imports. Re-serialized (not the stored text) so the file always has the
// canonical header and explicit expected times.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const special = await prisma.specialItem.findUnique({ where: { id } })
  if (!special) {
    return Response.json({ error: 'not found' }, { status: 404 })
  }

  const csv = serializeSpecialItemCsv(parseSpecialItemCsv(special.csv).values)

  const filename =
    (special.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') ||
      'special-item') + '.csv'

  // ASCII fallback plus RFC 5987 encoding so non-ASCII names survive.
  const asciiFilename = filename.replace(/[^\x20-\x7e]/g, '_')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
