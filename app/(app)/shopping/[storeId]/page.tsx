'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Plus, X, Check, Trash2, ChevronDown, ChevronUp,
  Camera, Loader2, ArrowLeft, ImageIcon,
} from 'lucide-react'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'
import type { Store, ShoppingItem, Profile } from '@/lib/types'

const UNITS = ['шт', 'кг', 'г', 'л', 'мл', 'пачка', 'бутылка', 'упаковка', 'пара']

function Avatar({ profile, size = 24 }: { profile?: Profile; size?: number }) {
  if (!profile) return null
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: profile.color, fontSize: size * 0.4 }}
    >
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt={profile.name} className="rounded-full w-full h-full object-cover" />
        : profile.name[0].toUpperCase()
      }
    </div>
  )
}

export default function StorePage() {
  const { storeId } = useParams<{ storeId: string }>()
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [store, setStore] = useState<Store | null>(null)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)

  // Sheet state
  const [showSheet, setShowSheet] = useState(false)
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null)
  const [form, setForm] = useState({
    name: '', note: '', quantity: '', unit: 'шт', photo_url: '',
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const load = useCallback(async () => {
    const [storeRes, itemsRes, userRes] = await Promise.all([
      supabase.from('stores').select('*').eq('id', storeId).single(),
      supabase
        .from('shopping_items')
        .select('*, profiles:added_by(id,name,color,avatar_url), checker:checked_by(id,name,color,avatar_url)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false }),
      supabase.auth.getUser(),
    ])

    if (storeRes.data) setStore(storeRes.data)
    if (itemsRes.data) setItems(itemsRes.data as ShoppingItem[])

    if (userRes.data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userRes.data.user.id)
        .single()
      if (profile) setCurrentUser(profile)
    }
    setLoading(false)
  }, [storeId])

  useEffect(() => {
    load()

    // Realtime subscription
    const channel = supabase
      .channel(`store-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `store_id=eq.${storeId}` },
        () => load()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [storeId, load])

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', note: '', quantity: '', unit: 'шт', photo_url: '' })
    setPhotoFile(null)
    setPhotoPreview('')
    setShowSheet(true)
  }

  const openEdit = (item: ShoppingItem) => {
    setEditItem(item)
    setForm({
      name: item.name,
      note: item.note ?? '',
      quantity: item.quantity?.toString() ?? '',
      unit: item.unit ?? 'шт',
      photo_url: item.photo_url ?? '',
    })
    setPhotoFile(null)
    setPhotoPreview(item.photo_url ?? '')
    setShowSheet(true)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const uploadPhoto = async (file: File): Promise<string> => {
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `shopping/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
    setUploadingPhoto(false)
    return publicUrl
  }

  const saveItem = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    let photoUrl = form.photo_url
    if (photoFile) {
      try { photoUrl = await uploadPhoto(photoFile) } catch {
        photoUrl = form.photo_url
      }
    }

    const payload = {
      name: form.name.trim(),
      note: form.note.trim() || null,
      quantity: form.quantity ? Number(form.quantity) : null,
      unit: form.quantity ? form.unit : null,
      photo_url: photoUrl || null,
    }

    if (editItem) {
      const { data } = await supabase
        .from('shopping_items')
        .update(payload)
        .eq('id', editItem.id)
        .select('*, profiles:added_by(id,name,color,avatar_url), checker:checked_by(id,name,color,avatar_url)')
        .single()
      if (data) setItems((prev) => prev.map((i) => (i.id === editItem.id ? data as ShoppingItem : i)))
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('shopping_items')
        .insert({ ...payload, store_id: storeId, added_by: user!.id })
        .select('*, profiles:added_by(id,name,color,avatar_url), checker:checked_by(id,name,color,avatar_url)')
        .single()
      if (data) setItems((prev) => [data as ShoppingItem, ...prev])
    }

    setShowSheet(false)
    setSaving(false)
  }

  const toggleCheck = async (item: ShoppingItem) => {
    const { data: { user } } = await supabase.auth.getUser()
    const nowChecked = !item.checked

    await supabase.from('shopping_items').update(
      nowChecked
        ? { checked: true, checked_by: user?.id ?? null, checked_at: new Date().toISOString() }
        : { checked: false, checked_by: null, checked_at: null }
    ).eq('id', item.id)

    setItems((prev) =>
      prev.map((i): ShoppingItem =>
        i.id === item.id
          ? {
              ...i,
              checked: nowChecked,
              checked_by: nowChecked ? (user?.id ?? null) : null,
              checked_at: nowChecked ? new Date().toISOString() : null,
              checker: nowChecked ? (currentUser ?? undefined) : undefined,
            }
          : i
      )
    )
  }

  const deleteItem = async (id: string) => {
    await supabase.from('shopping_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clearChecked = async () => {
    const ids = items.filter((i) => i.checked).map((i) => i.id)
    await supabase.from('shopping_items').delete().in('id', ids)
    setItems((prev) => prev.filter((i) => !i.checked))
  }

  const active = items.filter((i) => !i.checked)
  const done = items.filter((i) => i.checked)

  return (
    <>
      <Header
        title={store ? `${store.icon} ${store.name}` : 'Загрузка…'}
        subtitle={`${active.length} ${active.length === 1 ? 'позиция' : 'позиций'}`}
        right={
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
          </button>
        }
      />

      <main className="px-4 pt-4 pb-6 flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : (
          <>
            {/* Add button */}
            <button
              onClick={openAdd}
              className="flex items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3.5 w-full transition-all active:scale-[0.98]"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              <Plus size={18} />
              <span className="text-sm font-medium">Добавить товар</span>
            </button>

            {/* Active items */}
            {active.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                  Купить · {active.length}
                </p>
                <div className="flex flex-col gap-2">
                  {active.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onCheck={toggleCheck}
                      onEdit={openEdit}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              </div>
            )}

            {active.length === 0 && done.length === 0 && (
              <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>
                Список пуст — добавь первый товар
              </p>
            )}

            {/* Done items */}
            {done.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <button
                    onClick={() => setShowDone((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showDone ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    Куплено · {done.length}
                  </button>
                  <button
                    onClick={clearChecked}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={13} />
                    Очистить
                  </button>
                </div>

                {showDone && (
                  <div className="flex flex-col gap-2">
                    {done.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onCheck={toggleCheck}
                        onEdit={openEdit}
                        onDelete={deleteItem}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Item sheet */}
      {showSheet && (
        <>
          <div className="sheet-backdrop" onClick={() => setShowSheet(false)} />
          <div
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl max-w-xl mx-auto animate-slide-up overflow-y-auto"
            style={{
              background: 'var(--surface)',
              boxShadow: 'var(--sheet-shadow)',
              maxHeight: '92dvh',
            }}
          >
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                  {editItem ? 'Редактировать' : 'Новый товар'}
                </h2>
                <button onClick={() => setShowSheet(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Photo */}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 overflow-hidden relative transition-all"
                  style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-2)' }}
                >
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                      <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center">
                        <Camera size={24} color="white" />
                      </div>
                    </>
                  ) : (
                    <>
                      {uploadingPhoto
                        ? <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                        : <ImageIcon size={24} style={{ color: 'var(--text-muted)' }} />
                      }
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Нажмите чтобы добавить фото
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Name */}
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Название товара *"
                autoFocus={!editItem}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />

              {/* Note */}
              <textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Заметка (необязательно)"
                rows={2}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />

              {/* Quantity + unit */}
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="Кол-во"
                  min={0}
                  className="w-24 rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                />
                <select
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="flex-1 rounded-xl border px-3 py-3 text-sm outline-none"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <button
                onClick={saveItem}
                disabled={!form.name.trim() || saving}
                className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--primary)', color: '#fff' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {editItem ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function ItemCard({
  item,
  onCheck,
  onEdit,
  onDelete,
}: {
  item: ShoppingItem
  onCheck: (item: ShoppingItem) => void
  onEdit: (item: ShoppingItem) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      className="rounded-2xl border flex items-start gap-3 p-3 transition-all"
      style={{
        background: item.checked ? 'var(--surface-2)' : 'var(--surface)',
        borderColor: 'var(--border)',
        opacity: item.checked ? 0.7 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onCheck(item)}
        className="mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all active:scale-90"
        style={{
          background: item.checked ? 'var(--success)' : 'transparent',
          borderColor: item.checked ? 'var(--success)' : 'var(--border-strong)',
        }}
      >
        {item.checked && <Check size={12} color="#fff" strokeWidth={3} />}
      </button>

      {/* Content */}
      <button className="flex-1 text-left min-w-0" onClick={() => onEdit(item)}>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium leading-snug"
              style={{
                color: 'var(--text)',
                textDecoration: item.checked ? 'line-through' : 'none',
                opacity: item.checked ? 0.6 : 1,
              }}
            >
              {item.name}
            </p>
            {item.quantity && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {item.quantity} {item.unit}
              </p>
            )}
            {item.note && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {item.note}
              </p>
            )}
          </div>
          {item.photo_url && (
            <img
              src={item.photo_url}
              alt={item.name}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
          )}
        </div>

        {/* Who added */}
        <div className="flex items-center gap-1.5 mt-2">
          {item.checked ? (
            <>
              {item.checker && <Avatar profile={item.checker} size={16} />}
              <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
                Куплено{item.checker ? ` · ${item.checker.name}` : ''}
              </span>
            </>
          ) : (
            <>
              {item.profiles && <Avatar profile={item.profiles} size={16} />}
              <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
                {item.profiles?.name ?? 'Кто-то'}
              </span>
            </>
          )}
        </div>
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0"
        style={{ color: 'var(--text-subtle)' }}
      >
        <X size={15} />
      </button>
    </div>
  )
}
