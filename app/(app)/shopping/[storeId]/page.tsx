'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Plus, X, Check, Trash2, ChevronDown, ChevronUp,
  Camera, Loader2, ArrowLeft, ImageIcon,
} from 'lucide-react'
import Header from '@/components/Header'
import VirtualList from '@/components/VirtualList'
import ConfirmModal from '@/components/ConfirmModal'
import Toast from '@/components/Toast'
import UIState from '@/components/UIState'
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'checked'>('all')
  const [sort, setSort] = useState<'default'|'category'|'route'|'name'>('default')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  // Sheet state
  const [showSheet, setShowSheet] = useState(false)
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null)
  const [form, setForm] = useState({
    name: '', note: '', quantity: '', unit: 'шт', photo_url: '', category: ''
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [confirm, setConfirm] = useState<{ open: boolean; message: string; onConfirm?: () => void }>({ open: false, message: '' })
  const [toasts, setToasts] = useState<any[]>([])


  const load = useCallback(async () => {
    let itemsQuery = supabase
      .from('shopping_items')
      .select('*, profiles:added_by(id,name,color,avatar_url), checker:checked_by(id,name,color,avatar_url)')
      .eq('store_id', storeId)

    if (sort === 'route') itemsQuery = itemsQuery.order('route_order', { ascending: true })
    else if (sort === 'name') itemsQuery = itemsQuery.order('name', { ascending: true })
    else itemsQuery = itemsQuery.order('created_at', { ascending: false })

    if (search) {
      const q = search.replace(/%/g, '\\%')
      itemsQuery = itemsQuery.or(`name.ilike.%${q}%,note.ilike.%${q}%`)
    }
    if (statusFilter === 'active') itemsQuery = itemsQuery.eq('checked', false)
    if (statusFilter === 'checked') itemsQuery = itemsQuery.eq('checked', true)

    const [storeRes, itemsRes, userRes] = await Promise.all([
      supabase.from('stores').select('*').eq('id', storeId).single(),
      itemsQuery,
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
  }, [storeId, load, search, statusFilter])

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', note: '', quantity: '', unit: 'шт', photo_url: '', category: '' })
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
      category: item.category ?? ''
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
      category: form.category?.trim() || null,
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
      // compute next route_order
      const { data: maxRes } = await supabase
        .from('shopping_items')
        .select('route_order')
        .eq('store_id', storeId)
        .order('route_order', { ascending: false })
        .limit(1)
      const nextOrder = (maxRes && maxRes[0] && (maxRes[0] as any).route_order ? (maxRes[0] as any).route_order : 0) + 1
      const { data } = await supabase
        .from('shopping_items')
        .insert({ ...payload, store_id: storeId, added_by: user!.id, route_order: nextOrder })
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

    // optimistic update
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: nowChecked, checked_by: nowChecked ? (currentUser?.id ?? null) : null, checked_at: nowChecked ? new Date().toISOString() : null, checker: nowChecked ? (currentUser ?? undefined) : undefined, times_purchased: nowChecked ? ((i.times_purchased ?? 0) + 1) : i.times_purchased, last_purchased_at: nowChecked ? new Date().toISOString() : i.last_purchased_at } : i))

    const updatePayload = nowChecked
      ? { checked: true, checked_by: user?.id ?? null, checked_at: new Date().toISOString(), times_purchased: (item.times_purchased ?? 0) + 1, last_purchased_at: new Date().toISOString() }
      : { checked: false, checked_by: null, checked_at: null }

    try {
      await supabase.from('shopping_items').update(updatePayload).eq('id', item.id)
    } catch (e) {
      // rollback
      setItems((prev) => prev.map((i) => i.id === item.id ? item : i))
      setToasts((s) => [...s, { id: String(Date.now()), message: 'Ошибка при отметке товара', undoLabel: 'Повторить', onUndo: async () => toggleCheck(item) }])
    }
  }

  const deleteItem = async (id: string) => {
    const t = items.find((i) => i.id === id)
    setConfirm({ open: true, message: 'Удалить товар? Это действие необратимо.', onConfirm: async () => {
      setConfirm({ open: false, message: '' })
      setItems((prev) => prev.filter((i) => i.id !== id))
      try {
        await supabase.from('shopping_items').delete().eq('id', id)
        // allow undo
        const toastId = String(Date.now())
        setToasts((s) => [...s, { id: toastId, message: 'Товар удалён', undoLabel: 'Отменить', onUndo: async () => {
          if (!t) return
          const { data } = await supabase.from('shopping_items').insert({
            id: t.id, name: t.name, note: t.note, quantity: t.quantity, unit: t.unit, photo_url: t.photo_url, category: t.category, store_id: t.store_id, added_by: t.added_by, route_order: t.route_order
          }).select('*, profiles:added_by(id,name,color,avatar_url), checker:checked_by(id,name,color,avatar_url)').single()
          if (data) setItems((prev) => [data as ShoppingItem, ...prev])
        }, timeout: 7000 }])
      } catch (e) {
        if (t) setItems((prev) => [t, ...prev])
        setToasts((s) => [...s, { id: String(Date.now()), message: 'Ошибка при удалении товара' }])
      }
    } })
  }

  const moveUp = async (item: ShoppingItem) => {
    // find neighbor with smaller route_order
    const curOrder = item.route_order ?? 0
    const { data: neighbor } = await supabase
      .from('shopping_items')
      .select('id,route_order')
      .eq('store_id', storeId)
      .lt('route_order', curOrder)
      .order('route_order', { ascending: false })
      .limit(1)
    if (!neighbor || neighbor.length === 0) return
    const n = neighbor[0] as any
    // swap
    await supabase.from('shopping_items').update({ route_order: curOrder }).eq('id', n.id)
    await supabase.from('shopping_items').update({ route_order: n.route_order }).eq('id', item.id)
    load()
  }

  // Drag & drop handlers for route ordering
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const onDropOn = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const fromId = draggingId
    setDraggingId(null)
    if (!fromId || fromId === targetId) return
    setReordering(true)
    // reorder items array locally
    const arr = [...items]
    const fromIndex = arr.findIndex((i) => i.id === fromId)
    const toIndex = arr.findIndex((i) => i.id === targetId)
    if (fromIndex === -1 || toIndex === -1) { setReordering(false); return }
    const [moved] = arr.splice(fromIndex, 1)
    arr.splice(toIndex, 0, moved)
    // assign new route_order sequentially and persist changed ones
    const updates: { id: string; route_order: number }[] = []
    for (let i = 0; i < arr.length; i++) {
      const desired = i + 1
      if ((arr[i].route_order ?? 0) !== desired) updates.push({ id: arr[i].id, route_order: desired })
      arr[i].route_order = desired
    }
    setItems(arr)
    try {
      await Promise.all(updates.map((u) => supabase.from('shopping_items').update({ route_order: u.route_order }).eq('id', u.id)))
    } catch (err) {
      setToasts((s) => [...s, { id: String(Date.now()), message: 'Ошибка при сохранении порядка', undoLabel: 'Перезагрузить', onUndo: () => load() }])
      await load()
    }
    setReordering(false)
  }

  const moveDown = async (item: ShoppingItem) => {
    const curOrder = item.route_order ?? 0
    const { data: neighbor } = await supabase
      .from('shopping_items')
      .select('id,route_order')
      .eq('store_id', storeId)
      .gt('route_order', curOrder)
      .order('route_order', { ascending: true })
      .limit(1)
    if (!neighbor || neighbor.length === 0) return
    const n = neighbor[0] as any
    // swap
    await supabase.from('shopping_items').update({ route_order: curOrder }).eq('id', n.id)
    await supabase.from('shopping_items').update({ route_order: n.route_order }).eq('id', item.id)
    load()
  }

  const clearChecked = async () => {
    setConfirm({ open: true, message: 'Удалить все купленные товары? Это действие необратимо.', onConfirm: async () => {
      setConfirm({ open: false, message: '' })
      const removed = items.filter((i) => i.checked)
      const ids = removed.map((i) => i.id)
      setItems((prev) => prev.filter((i) => !i.checked))
      try {
        await supabase.from('shopping_items').delete().in('id', ids)
        setToasts((s) => [...s, { id: String(Date.now()), message: 'Купленные товары удалены', undoLabel: 'Отменить', onUndo: async () => {
          if (!removed.length) return
          const inserts = removed.map((r) => ({ name: r.name, note: r.note, quantity: r.quantity, unit: r.unit, photo_url: r.photo_url, category: r.category, store_id: r.store_id, added_by: r.added_by, route_order: r.route_order }))
          const { data } = await supabase.from('shopping_items').insert(inserts).select('*, profiles:added_by(id,name,color,avatar_url), checker:checked_by(id,name,color,avatar_url)')
          if (data) setItems((prev) => [...(data as ShoppingItem[]), ...prev])
        }, timeout: 7000 }])
      } catch (e) {
        setItems((prev) => [...prev, ...removed])
        setToasts((s) => [...s, { id: String(Date.now()), message: 'Ошибка удаления купленных товаров' }])
      }
    } })
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
          <UIState type="loading" message="Загрузка списка магазина…" />
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

            {/* Frequently bought quick-add */}
            {(() => {
              const frequent = items
                .filter((i) => (i.times_purchased ?? 0) > 0)
                .sort((a, b) => (b.times_purchased ?? 0) - (a.times_purchased ?? 0))
                .slice(0, 8)
              if (frequent.length === 0) return null
              return (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mt-2 px-1" style={{ color: 'var(--text-muted)' }}>
                    Часто покупаемые
                  </p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-2">
                    {frequent.map((f) => (
                      <button key={f.id} onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser()
                        const { data: maxRes } = await supabase
                          .from('shopping_items')
                          .select('route_order')
                          .eq('store_id', storeId)
                          .order('route_order', { ascending: false })
                          .limit(1)
                        const nextOrder = (maxRes && maxRes[0] && (maxRes[0] as any).route_order ? (maxRes[0] as any).route_order : 0) + 1
                        const { data } = await supabase.from('shopping_items').insert({
                          name: f.name,
                          note: f.note,
                          quantity: f.quantity,
                          unit: f.unit,
                          photo_url: f.photo_url,
                          category: f.category,
                          store_id: storeId,
                          added_by: user!.id,
                          route_order: nextOrder,
                        }).select('*, profiles:added_by(id,name,color,avatar_url), checker:checked_by(id,name,color,avatar_url)').single()
                        if (data) setItems((prev) => [data as ShoppingItem, ...prev])
                      }}
                        className="rounded-full px-3 py-1 text-sm border"
                        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Sort / grouping */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                placeholder="Поиск по списку"
                className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any) }}
                className="rounded-xl border px-2 py-2 text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}>
                <option value="all">Все</option>
                <option value="active">Нужно купить</option>
                <option value="checked">Куплено</option>
              </select>

              <select value={sort} onChange={(e) => setSort(e.target.value as any)}
                className="rounded-xl border px-2 py-2 text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}>
                <option value="default">По умолчанию</option>
                <option value="category">По категории</option>
                <option value="route">По маршруту</option>
                <option value="name">По имени</option>
              </select>
            </div>

            {/* Active items grouped by category */}
            {active.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                  Купить · {active.length}
                </p>
                <div className="flex flex-col gap-4">
                  {(() => {
                    const groups: Record<string, ShoppingItem[]> = {}
                    active.forEach((it) => {
                      const k = it.category?.trim() || 'Без категории'
                      if (!groups[k]) groups[k] = []
                      groups[k].push(it)
                    })
                    const keys = Object.keys(groups).sort((a, b) => a.localeCompare(b))
                    return keys.map((k) => (
                      <div key={k} className="flex flex-col gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
                          {k} · {groups[k].length}
                        </p>
                        <div className="flex flex-col gap-2">
                          {groups[k].length > 60 ? (
                            <VirtualList items={groups[k]} onCheck={toggleCheck} onEdit={openEdit} onDelete={deleteItem} onMoveUp={moveUp} onMoveDown={moveDown} />
                          ) : (
                            groups[k].map((item) => (
                              <div key={item.id} draggable onDragStart={(e) => onDragStart(e, item.id)} onDragOver={onDragOver} onDrop={(e) => onDropOn(e, item.id)}>
                                <ItemCard
                                  key={item.id}
                                  item={item}
                                  onCheck={toggleCheck}
                                  onEdit={openEdit}
                                  onDelete={deleteItem}
                                  onMoveUp={moveUp}
                                  onMoveDown={moveDown}
                                  onToggleFrequent={async (id) => {
                                    const it = items.find((x) => x.id === id)
                                    if (!it) return
                                    const newVal = (it.times_purchased ?? 0) > 0 ? 0 : 1
                                    await supabase.from('shopping_items').update({ times_purchased: newVal }).eq('id', id)
                                    setItems((prev) => prev.map((p) => p.id === id ? { ...p, times_purchased: newVal } : p))
                                  }}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}

            {active.length === 0 && done.length === 0 && (
              <UIState type="empty" message="Список пуст — добавь первый товар" actionLabel="Добавить" onAction={openAdd} />
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
                      <div key={item.id} draggable onDragStart={(e) => onDragStart(e, item.id)} onDragOver={onDragOver} onDrop={(e) => onDropOn(e, item.id)}>
                        <ItemCard
                          item={item}
                          onCheck={toggleCheck}
                          onEdit={openEdit}
                          onDelete={deleteItem}
                          onMoveUp={moveUp}
                          onMoveDown={moveDown}
                          onToggleFrequent={async (id) => {
                            // toggle times_purchased
                            const it = items.find((x) => x.id === id)
                            if (!it) return
                            const newVal = (it.times_purchased ?? 0) > 0 ? 0 : 1
                            await supabase.from('shopping_items').update({ times_purchased: newVal }).eq('id', id)
                            setItems((prev) => prev.map((p) => p.id === id ? { ...p, times_purchased: newVal } : p))
                          }}
                        />
                      </div>
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

              {/* Category */}
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Категория (например: молочное, овощи)"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
      <ConfirmModal open={confirm.open} message={confirm.message} onConfirm={() => confirm.onConfirm && confirm.onConfirm()} onCancel={() => setConfirm({ open: false, message: '' })} />
      <Toast items={toasts} onRemove={(id: string) => setToasts((s) => s.filter((t) => t.id !== id))} />
    </>
  )
}

function ItemCard({
  item,
  onCheck,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleFrequent?: (id: string) => void
}: {
  item: ShoppingItem
  onCheck: (item: ShoppingItem) => void
  onEdit: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onMoveUp: (item: ShoppingItem) => void
  onMoveDown: (item: ShoppingItem) => void
  onToggleFrequent?: (id: string) => void
}) {
  const [anim, setAnim] = useState(false)
  const handleCheck = () => {
    setAnim(true)
    onCheck(item)
    setTimeout(() => setAnim(false), 350)
  }

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
        onClick={handleCheck}
        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${anim ? 'animate-check-pop' : ''}`}
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
            {item.category && (
              <span className="inline-block text-[11px] mt-1 px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                {item.category}
              </span>
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
      <div className="flex items-center gap-2">
    <button
      onClick={() => onMoveUp(item)}
      className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0"
      style={{ color: 'var(--text-subtle)' }}
      title="Переместить вверх"
    >
      ▲
    </button>
    <button
      onClick={() => onMoveDown(item)}
      className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0"
      style={{ color: 'var(--text-subtle)' }}
      title="Переместить вниз"
    >
      ▼
    </button>
    <button
      onClick={() => onToggleFrequent && onToggleFrequent(item.id)}
      title={item.times_purchased && item.times_purchased > 0 ? 'Убрать из часто' : 'Добавить в часто'}
      className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0"
      style={{ color: item.times_purchased && item.times_purchased > 0 ? 'gold' : 'var(--text-subtle)' }}
    >
      ★
    </button>
    <button
      onClick={() => onDelete(item.id)}
      aria-label="Удалить товар"
      className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0"
      style={{ color: 'var(--text-subtle)' }}
    >
      <X size={15} />
    </button>
  </div>
</div>
  )
}
