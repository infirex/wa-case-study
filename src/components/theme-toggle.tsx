'use client'

import * as React from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '~/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-lg" disabled>
        <SunIcon className="h-4 w-4 text-muted-foreground" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      id="btn-theme-toggle"
    >
      {theme === 'dark' ? (
        <SunIcon className="h-4 w-4 transition-transform hover:scale-110" />
      ) : (
        <MoonIcon className="h-4 w-4 transition-transform hover:scale-110" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
