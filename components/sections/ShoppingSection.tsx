'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, ShoppingBag, X, Loader2, ChevronRight } from 'lucide-react'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'
import type { Store } from '@/lib/types'

const PRESET_COLORS = [
  '#4F46E5', '#DC2626', '#16A34A', '#D97706',
  '#0284C7', '#9333EA', '#DB2777', '#0F766E',
]

const PRESET_ICONS = ['🛒', '🧴', '🏠', '💊', '🐾', '🍕', '🧁', '📦', '🌿', '🛍️']

export default function ShoppingSection({ color }: { color?: string }) {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('🛒')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({})

  const supabase = createClient()

  const loadStores = useCallback(async () => {
    const { data } = await supabase.from('stores').select('*').order('order_index')
    if (data) setStores(data)
    setLoading(false)
  }, [])

  const loadCounts = useCallback(async () => {
    const { data } = await supabase.from('shopping_items').select('store_id, checked').eq('checked', false)
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach((item) => { counts[item.store_id] = (counts[item.store_id] ?? 0) + 1 })
      setItemCounts(counts)
    }
  }, [])

  useEffect(() => {
    loadStores()
    loadCounts()
  }, [loadStores, loadCounts])

  const addStore = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('stores').insert({
      name: newName.trim(), icon: newIcon, color: newColor,
      order_index: stores.length, created_by: user?.id,
    }).select().single()
    if (data) {
      setStores((s) => [...s, data])
      setNewName('')
      setNewIcon('🛒')
      setNewColor(PRESET_COLORS[0])
      setShowAdd(false)
    }
    setSaving(false)
  }

  const deleteStore = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await supabase.from('stores').delete().eq('id', id)
    setStores((s) => s.filter((st) => st.id !== id))
  }

  return (
    <>
      <Header title="Покупки" subtitle="Выберите магазин" color={color} />

      <main className="px-4 pt-5 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={`/shopping/${store.id}`}
                  className="relative rounded-2xl border p-4 flex flex-col gap-3 shadow-sm active:scale-[0.97] transition-transform"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: store.color + '20' }}
                  >
                    {store.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text)' }}>
                      {store.name}
                    </p>
                    {itemCounts[store.id] ? (
                      <p className="text-xs mt-0.5" style={{ color: store.color }}>
                        {itemCounts[store.id]} позиций
                      </p>
                    ) : (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>Пусто</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="absolute top-4 right-4" style={{ color: 'var(--text-subtle)' }} />
                  <button
                    onClick={(e) => deleteStore(store.id, e)}
                    className="absolute bottom-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center transition-opacity active:opacity-60"
                    style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                  >
                    <X size={12} />
                  </button>
                </Link>
              ))}

              <button
                onClick={() => setShowAdd(true)}
                className="rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-2 min-h-[120px] active:scale-[0.97] transition-all"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-subtle)' }}
              >
                <Plus size={20} />
                <span className="text-xs font-medium">Добавить магазин</span>
              </button>
            </div>

            {stores.length === 0 && !showAdd && (
              <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>
                Запустите SQL-схему в Supabase чтобы появились магазины
              </p>
            )}
          </>
        )}
      </main>

      {showAdd && (
        <>
          <div className="sheet-backdrop" onClick={() => setShowAdd(false)} />
          <div
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl p-6 max-w-xl mx-auto animate-slide-up"
            style={{ background: 'var(--surface)', boxShadow: 'var(--sheet-shadow)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Новый магазин</h2>
              <button onClick={() => setShowAdd(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStore()}
                placeholder="Название магазина"
                autoFocus
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Иконка</p>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewIcon(icon)}
                      className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                      style={{
                        background: newIcon === icon ? 'var(--primary-soft)' : 'var(--surface-2)',
                        outline: newIcon === icon ? '2px solid var(--primary)' : 'none',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Цвет</p>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className="w-8 h-8 rounded-full transition-transform active:scale-90"
                      style={{
                        background: c,
                        outline: newColor === c ? `3px solid ${c}` : '3px solid transparent',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={addStore}
                disabled={!newName.trim() || saving}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 mt-1"
                style={{ background: 'var(--primary)', color: '#fff' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
                Добавить магазин
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
