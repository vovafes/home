'use client'

import React, { useEffect } from 'react'

export type ToastItem = {
  id: string
  message: string
  undoLabel?: string
  onUndo?: () => void
  timeout?: number
}

export default function Toast({ items, onRemove }: { items: ToastItem[]; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timers = items.map((it) => {
      const t = setTimeout(() => onRemove(it.id), it.timeout ?? 5000)
      return { id: it.id, t }
    })
    return () => timers.forEach((x) => clearTimeout((x as any).t))
  }, [items, onRemove])

  if (!items.length) return null
  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 80 }}>
      <div className="flex flex-col gap-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-lg px-4 py-3 shadow-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between gap-3">
              <div style={{ color: 'var(--text)' }}>{it.message}</div>
              <div className="flex items-center gap-2">
                {it.onUndo && <button onClick={() => { it.onUndo && it.onUndo(); onRemove(it.id) }} className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>{it.undoLabel ?? 'Отменить'}</button>}
                <button onClick={() => onRemove(it.id)} className="text-sm" style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
