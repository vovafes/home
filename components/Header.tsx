'use client'

import { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  right?: ReactNode
  color?: string
}

export default function Header({ title, subtitle, right, color }: Props) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b"
      style={{
        background: 'var(--surface)',
        borderBottomColor: color ?? 'var(--border)',
        borderBottomWidth: color ? 2 : 1,
      }}
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
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  )
}
