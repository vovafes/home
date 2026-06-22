'use client'

import React from 'react'

export default function UIState({ type, title, message, actionLabel, onAction }: {
  type: 'loading' | 'empty' | 'error'
  title?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}) {
  if (type === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-fade-in text-center">
          <div className="loader" style={{ width: 36, height: 36, margin: '0 auto' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>{message ?? 'Загрузка…'}</p>
        </div>
      </div>
    )
  }
  if (type === 'empty') {
    return (
      <div className="text-center py-10">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message ?? title ?? 'Пусто'}</p>
        {onAction && actionLabel && (
          <div className="mt-3">
            <button onClick={onAction} className="rounded-xl px-4 py-2 border" style={{ borderColor: 'var(--border)' }}>{actionLabel}</button>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="text-center py-10">
      <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>{title ?? 'Ошибка'}</p>
      <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{message ?? 'Произошла ошибка'}</p>
      {onAction && actionLabel && (
        <div className="mt-3">
          <button onClick={onAction} className="rounded-xl px-4 py-2 border" style={{ borderColor: 'var(--border)' }}>{actionLabel}</button>
        </div>
      )}
    </div>
  )
}
