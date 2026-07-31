'use client'

import { memo, useEffect, useState } from 'react'
import { Type } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Cycles through the UI fonts loaded in layout.tsx (globals.css maps
// html[data-font] to the matching font variable).
const FONTS = [
  { name: 'geist', label: 'Geist' },
  { name: 'inter', label: 'Inter' },
  { name: 'roboto', label: 'Roboto' },
  { name: 'poppins', label: 'Poppins' },
]

const STORAGE_KEY = 'font'

// Applies the stored font before first paint, the same trick next-themes
// uses for the palette. Memoized with constant props so client re-renders
// never touch the script element (React warns about re-rendered scripts).
const FontScript = memo(function FontScript() {
  const names = JSON.stringify(FONTS.map(f => f.name))
  const script = `try{var f=localStorage.getItem('${STORAGE_KEY}');if(${names}.indexOf(f)>=0)document.documentElement.dataset.font=f}catch(e){}`
  return (
    <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: script }} />
  )
})

export function FontSwitcher() {
  // Font is unknown until mounted (localStorage); render a neutral label on
  // the server pass to avoid a hydration mismatch.
  const [font, setFont] = useState<string | null>(null)

  useEffect(() => {
    setFont(document.documentElement.dataset.font || FONTS[0].name)
  }, [])

  const index = Math.max(0, FONTS.findIndex(f => f.name === font))

  function cycle() {
    const next = FONTS[(index + 1) % FONTS.length].name
    document.documentElement.dataset.font = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // private mode etc. — the choice just won't persist
    }
    setFont(next)
  }

  return (
    <>
      <FontScript />
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground"
        onClick={cycle}
        title="Switch font"
      >
        <Type className="h-4 w-4" />
        {font ? FONTS[index].label : 'Font'}
      </Button>
    </>
  )
}
