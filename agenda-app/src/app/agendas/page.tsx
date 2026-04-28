import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Clock, ListChecks } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AgendasPage() {
  const agendas = await prisma.agenda.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      items: { select: { durationMinutes: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agendas</h1>
          <p className="text-muted-foreground">
            Build and reorder meeting agendas with drag and drop.
          </p>
        </div>
        <Link href="/agendas/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          New agenda
        </Link>
      </div>

      {agendas.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
          <p className="text-muted-foreground mb-4">No agendas yet.</p>
          <Link href="/agendas/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Create your first agenda
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {agendas.map(agenda => {
            const totalMin = agenda.items.reduce(
              (sum, i) => sum + i.durationMinutes,
              0,
            )
            return (
              <Link
                key={agenda.id}
                href={`/agendas/${agenda.id}`}
                className="block transition-colors"
              >
                <Card className="h-full hover:border-foreground/30">
                  <CardHeader>
                    <CardTitle className="truncate">{agenda.title}</CardTitle>
                    {agenda.description && (
                      <CardDescription className="line-clamp-2">
                        {agenda.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ListChecks className="h-4 w-4" />
                      {agenda.items.length} {agenda.items.length === 1 ? 'item' : 'items'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {totalMin} min
                    </span>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
