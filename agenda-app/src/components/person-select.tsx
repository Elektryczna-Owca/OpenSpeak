import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { Person } from '@/generated/prisma/client'

const selectClass =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30'

export function PersonSelect({
  id,
  people,
  defaultValue,
  className,
}: {
  id: string
  people: Person[]
  defaultValue?: string | null
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>Assignee</Label>
      <select
        id={id}
        name="personId"
        defaultValue={defaultValue ?? ''}
        className={selectClass}
      >
        <option value="">Unassigned</option>
        {people.map(person => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </div>
  )
}
