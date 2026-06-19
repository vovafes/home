'use client'

import { useEffect, useState, ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  right?: ReactNode
}

export default function Header({ title, subtitle, right }: Props) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('dom-dark')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored !== null ? stored === 'true' : prefersDark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleDark = () => {
    setDark((d) => {
      const next = !d
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('dom-dark', String(next))
      return next
    })
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b"
      style={{ background: 'var(--surface)', borderBottomColor: 'var(--border)' }}
    >
      <div>
        <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--text)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {right}
        <button
          onClick={toggleDark}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          aria-label="Тема"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}
