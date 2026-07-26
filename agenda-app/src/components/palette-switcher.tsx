'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Cycles through the color palettes defined in globals.css. next-themes
// persists the choice in localStorage and applies it before first paint.
const PALETTES = [
  { name: 'sandy', label: 'Sandy' },
  { name: 'olive', label: 'Olive' },
  { name: 'contrast-light', label: 'Contrast light' },
  { name: 'contrast-dark', label: 'Contrast dark' },
  { name: 'midnight', label: 'Midnight' },
  { name: 'frost', label: 'Frost' },
]

export function PaletteSwitcher() {
  const { theme, setTheme } = useTheme()
  // Theme is unknown until mounted (localStorage); render a neutral label on
  // the server pass to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const index = Math.max(0, PALETTES.findIndex(p => p.name === theme))
  const next = PALETTES[(index + 1) % PALETTES.length]

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(next.name)}
      title="Switch color palette"
    >
      <Palette className="h-4 w-4" />
      {mounted ? PALETTES[index].label : 'Palette'}
    </Button>
  )
}
