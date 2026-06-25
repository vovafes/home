'use client'

import React from 'react'

export default function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel }: {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center">
      <div className="sheet-backdrop" onClick={onCancel} />
      <div className="bg-var rounded-t-3xl md:rounded-2xl p-5 max-w-lg w-full mx-4 mb-6 md:mb-0" style={{ zIndex: 70 }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{title ?? 'Подтвердите действие'}</h3>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{message}</p>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onCancel} className="rounded-xl px-4 py-2 border" style={{ borderColor: 'var(--border)' }}>Отмена</button>
          <button onClick={onConfirm} className="rounded-xl px-4 py-2 bg-var" style={{ background: 'var(--danger)', color: '#fff' }}>{confirmLabel ?? 'Удалить'}</button>
        </div>
      </div>
    </div>
  )
}
