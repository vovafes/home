'use client'

import { ReactNode, useState } from 'react'
import { Menu, Check } from 'lucide-react'
import { useHubNav } from '@/lib/hubNav'

interface Props {
  title: string
  subtitle?: string
  right?: ReactNode
  color?: string
}

export default function Header({ title, subtitle, right, color }: Props) {
  const nav = useHubNav()
  const [open, setOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b"
      style={{
        background: 'var(--surface)',
        borderBottomColor: color ?? 'var(--border)',
        borderBottomWidth: color ? 2 : 1,
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {nav && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Меню разделов"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: 'var(--surface-2)', color: color ?? 'var(--text)' }}
            >
              <Menu size={18} />
            </button>

            {open && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpen(false)}
                />
                <div
                  className="absolute left-0 top-11 z-50 w-44 rounded-2xl border p-1.5 shadow-lg animate-fade-in"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  {nav.tabs.map((tab, i) => {
                    const isActive = i === nav.active
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { nav.go(i); setOpen(false) }}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97]"
                        style={{
                          background: isActive ? 'var(--surface-2)' : 'transparent',
                          color: 'var(--text)',
                        }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: tab.color }}
                        />
                        <span className="flex-1 text-left">{tab.label}</span>
                        {isActive && <Check size={15} style={{ color: tab.color }} />}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight truncate" style={{ color: 'var(--text)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
    </header>
  )
}
