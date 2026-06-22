'use client'

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Task } from '@/lib/types'
import TaskCard from './sections/TasksSection' // placeholder - we will export TaskCard separately

// Note: TasksSection exports TaskCard inline; to avoid refactor, implement a thin inline renderer via props

export default function VirtualGroup({ items, onToggle, onDelete }: { items: Task[]; onToggle: (t: Task) => void; onDelete: (id: string) => void }) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 6,
  })

  return (
    <div ref={parentRef} style={{ height: Math.min(400, items.length * 72), overflow: 'auto' }}>
      <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          return (
            <div key={item.id} style={{ position: 'absolute', top: virtualRow.start, left: 0, width: '100%' }}>
              {/* render minimal TaskCard structure to avoid circular import */}
              <div className="rounded-2xl border flex items-start gap-3 p-3.5 transition-all" style={{ background: item.completed ? 'var(--surface-2)' : 'var(--surface)', borderColor: 'var(--border)', opacity: item.completed ? 0.7 : 1 }}>
                <button onClick={() => onToggle(item)} className="mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all active:scale-90" style={{ background: item.completed ? 'var(--success)' : 'transparent', borderColor: item.completed ? 'var(--success)' : 'var(--border-strong)' }}>
                  {item.completed ? '✓' : ''}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)', textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1 }}>{item.title}</p>
                </div>
                <button onClick={() => onDelete(item.id)} aria-label="Удалить задачу" className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0" style={{ color: 'var(--text-subtle)' }}>✕</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
