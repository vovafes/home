'use client'

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ShoppingItem } from '@/lib/types'

export default function VirtualList({ items, onCheck, onEdit, onDelete, onMoveUp, onMoveDown }: {
  items: ShoppingItem[]
  onCheck: (item: ShoppingItem) => void
  onEdit: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onMoveUp: (item: ShoppingItem) => void
  onMoveDown: (item: ShoppingItem) => void
}) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 6,
  })

  return (
    <div ref={parentRef} style={{ height: Math.min(500, items.length * 72), overflow: 'auto' }}>
      <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          return (
            <div key={item.id} style={{ position: 'absolute', top: virtualRow.start, left: 0, width: '100%' }}>
              <div className="rounded-2xl border flex items-start gap-3 p-3 transition-all" style={{ background: item.checked ? 'var(--surface-2)' : 'var(--surface)', borderColor: 'var(--border)', opacity: item.checked ? 0.7 : 1 }}>
                <button onClick={() => onCheck(item)} className="mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all active:scale-90" style={{ background: item.checked ? 'var(--success)' : 'transparent', borderColor: item.checked ? 'var(--success)' : 'var(--border-strong)' }}>
                  {item.checked ? '✓' : ''}
                </button>
                <button className="flex-1 text-left min-w-0" onClick={() => onEdit(item)}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)', textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.6 : 1 }}>{item.name}</p>
                      {item.quantity && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.quantity} {item.unit}</p>}
                      {item.category && <span className="inline-block text-[11px] mt-1 px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{item.category}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {item.checked ? <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>Куплено</span> : <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>{item.profiles?.name ?? 'Кто-то'}</span>}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => onMoveUp(item)} className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0" style={{ color: 'var(--text-subtle)' }} title="Переместить вверх">▲</button>
                  <button onClick={() => onMoveDown(item)} className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0" style={{ color: 'var(--text-subtle)' }} title="Переместить вниз">▼</button>
                  <button onClick={() => onDelete(item.id)} aria-label="Удалить товар" className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0" style={{ color: 'var(--text-subtle)' }}>✕</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
