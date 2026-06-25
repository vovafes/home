'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Check, Loader2, Clock, MapPin } from 'lucide-react'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'
import { getFamilyId } from '@/lib/family'
import type { CalendarEvent, Profile } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'
import Toast from '@/components/Toast'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                 'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

const EVENT_COLORS = [
  '#4F46E5','#DC2626','#16A34A','#D97706',
  '#EAB308','#0284C7','#9333EA','#DB2777','#0F766E',
]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate()
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function Avatar({ profile, size = 20 }: { profile?: Profile; size?: number }) {
  if (!profile) return null
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: profile.color, fontSize: size * 0.42 }}
    >
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt={profile.name} className="rounded-full w-full h-full object-cover" />
        : profile.name[0].toUpperCase()
      }
    </div>
  )
}

export default function CalendarSection({ color }: { color?: string }) {
  const supabase = createClient()
  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(today)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)

  const [showSheet, setShowSheet] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', location: '', start_date: '',
    start_time: '', end_time: '', all_day: true, color: EVENT_COLORS[0],
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('calendar_events')
      .select('*, profiles:user_id(id,name,color,avatar_url)')
      .order('start_date')
    if (data) setEvents(data as CalendarEvent[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => { if (data) setCurrentUser(data) })
      }
    })
    const channel = supabase
      .channel('calendar-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7

  const cells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startDow + 1
    return d >= 1 && d <= lastDay.getDate() ? new Date(year, month, d) : null
  })

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const openAdd = (date?: Date) => {
    setEditEvent(null)
    setForm({
      title: '', description: '', location: '',
      start_date: dateStr(date ?? selected),
      start_time: '', end_time: '', all_day: true,
      color: currentUser?.color ?? EVENT_COLORS[0],
    })
    setShowSheet(true)
  }

  const openEdit = (event: CalendarEvent) => {
    setEditEvent(event)
    setForm({
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      start_date: event.start_date,
      start_time: event.start_time ?? '',
      end_time: event.end_time ?? '',
      all_day: event.all_day,
      color: event.color,
    })
    setShowSheet(true)
  }

  const saveEvent = async () => {
    if (!form.title.trim()) return
    setSaving(true)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      start_date: form.start_date,
      start_time: form.all_day ? null : (form.start_time || null),
      end_time: form.all_day ? null : (form.end_time || null),
      all_day: form.all_day,
      color: form.color,
    }

    if (editEvent) {
      const { data } = await supabase
        .from('calendar_events')
        .update(payload)
        .eq('id', editEvent.id)
        .select('*, profiles:user_id(id,name,color,avatar_url)')
        .single()
      if (data) setEvents((prev) => prev.map((e) => e.id === editEvent.id ? data as CalendarEvent : e))
    } else {
      const [{ data: { user } }, familyId] = await Promise.all([
        supabase.auth.getUser(),
        getFamilyId(supabase),
      ])
      if (!familyId) { setSaving(false); return }
      const { data } = await supabase
        .from('calendar_events')
        .insert({ ...payload, user_id: user!.id, family_id: familyId })
        .select('*, profiles:user_id(id,name,color,avatar_url)')
        .single()
      if (data) setEvents((prev) => [...prev, data as CalendarEvent])
    }

    setShowSheet(false)
    setSaving(false)
  }

  const [confirm, setConfirm] = useState<{ open: boolean; message: string; onConfirm?: () => void }>({ open: false, message: '' })
  const [toasts, setToasts] = useState<any[]>([])

  const deleteEvent = async (id: string) => {
    const ev = events.find((e) => e.id === id)
    setConfirm({ open: true, message: 'Удалить событие? Это действие необратимо.', onConfirm: async () => {
      setConfirm({ open: false, message: '' })
      setEvents((prev) => prev.filter((e) => e.id !== id))
      setShowSheet(false)
      try {
        await supabase.from('calendar_events').delete().eq('id', id)
        setToasts((t) => [...t, { id: String(Date.now()), message: 'Событие удалено', undoLabel: 'Отменить', onUndo: async () => {
          if (!ev) return
          const { data } = await supabase.from('calendar_events').insert({ title: ev.title, description: ev.description, location: ev.location, start_date: ev.start_date, start_time: ev.start_time, end_time: ev.end_time, all_day: ev.all_day, color: ev.color, user_id: ev.user_id }).select('*, profiles:user_id(id,name,color,avatar_url)')
          if (data) setEvents((prev) => [...(data as any), ...prev])
        }, timeout: 7000 }])
      } catch (e) {
        if (ev) setEvents((prev) => [...prev, ev])
        setToasts((t) => [...t, { id: String(Date.now()), message: 'Ошибка удаления события' }])
      }
    } })
  }

  const selectedEvents = events.filter((e) => e.start_date === dateStr(selected))

  return (
    <>
      <ConfirmModal open={confirm.open} message={confirm.message} onConfirm={() => confirm.onConfirm && confirm.onConfirm()} onCancel={() => setConfirm({ open: false, message: '' })} />
      <Toast items={toasts} onRemove={(id: string) => setToasts((s) => s.filter((t) => t.id !== id))} />
      <Header title="Календарь" subtitle={`${MONTHS[month]} ${year}`} color={color} />

      <main className="flex flex-col">
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={prevMonth}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 px-2 pt-2 pb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold py-1" style={{ color: 'var(--text-subtle)' }}>
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px px-2 pb-2" style={{ background: 'var(--border)' }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="aspect-square" style={{ background: 'var(--bg)' }} />
              const isToday = isSameDay(d, today)
              const isSelected = isSameDay(d, selected)
              const dayEvents = events.filter((e) => e.start_date === dateStr(d))

              return (
                <button
                  key={i}
                  onClick={() => setSelected(d)}
                  className="aspect-square flex flex-col items-center justify-start pt-1.5 pb-1 gap-0.5 transition-all"
                  style={{ background: isSelected ? (color ? color + '15' : 'var(--primary-soft)') : 'var(--surface)' }}
                >
                  <span
                    className="text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: isToday ? (color ?? 'var(--primary)') : 'transparent',
                      color: isToday ? '#fff' : isSelected ? (color ?? 'var(--primary)') : 'var(--text)',
                      fontWeight: isToday || isSelected ? 700 : 400,
                    }}
                  >
                    {d.getDate()}
                  </span>
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span key={e.id} className="w-1 h-1 rounded-full" style={{ background: e.color }} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="px-4 pt-3 pb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {selected.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              {isSameDay(selected, today) && (
                <span className="ml-2 text-xs font-normal" style={{ color: color ?? 'var(--primary)' }}>сегодня</span>
              )}
            </p>
            <button
              onClick={() => openAdd(selected)}
              className="flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-all active:scale-95"
              style={{
                background: color ? color + '15' : 'var(--primary-soft)',
                color: color ?? 'var(--primary)',
              }}
            >
              <Plus size={14} />
              Событие
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-subtle)' }}>Нет событий</p>
          ) : (
            selectedEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => openEdit(event)}
                className="w-full text-left rounded-2xl border p-4 flex gap-3 items-start transition-all active:scale-[0.98]"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderLeft: `3px solid ${event.color}` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{event.title}</p>
                  {!event.all_day && event.start_time && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={11} />
                      {event.start_time.slice(0,5)}
                      {event.end_time ? ` — ${event.end_time.slice(0,5)}` : ''}
                    </p>
                  )}
                  {event.location && (
                    <p className="text-xs mt-1 flex items-center gap-1 truncate" style={{ color: 'var(--text-muted)' }}>
                      <MapPin size={11} />
                      {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{event.description}</p>
                  )}
                </div>
                {event.profiles && <Avatar profile={event.profiles} size={24} />}
              </button>
            ))
          )}
        </div>
      </main>

      {showSheet && (
        <>
          <div className="sheet-backdrop" onClick={() => setShowSheet(false)} />
          <div
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl max-w-xl mx-auto animate-slide-up overflow-y-auto"
            style={{ background: 'var(--surface)', boxShadow: 'var(--sheet-shadow)', maxHeight: '90dvh' }}
          >
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                  {editEvent ? 'Редактировать' : 'Новое событие'}
                </h2>
                <div className="flex items-center gap-2">
                  {editEvent && (
                    <button
                      onClick={() => deleteEvent(editEvent.id)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                    >
                      Удалить
                    </button>
                  )}
                  <button onClick={() => setShowSheet(false)} style={{ color: 'var(--text-muted)' }}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Название события *"
                autoFocus
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />

              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />

              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Весь день</span>
                <button
                  onClick={() => setForm((f) => ({ ...f, all_day: !f.all_day }))}
                  className="w-11 h-6 rounded-full transition-colors relative"
                  style={{ background: form.all_day ? (color ?? 'var(--primary)') : 'var(--surface-3)' }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                    style={{ left: form.all_day ? 'calc(100% - 22px)' : '2px' }}
                  />
                </button>
              </div>

              {!form.all_day && (
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                    placeholder="Начало"
                    className="flex-1 rounded-xl border px-4 py-3 text-sm outline-none"
                    style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                  />
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                    placeholder="Конец"
                    className="flex-1 rounded-xl border px-4 py-3 text-sm outline-none"
                    style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                  />
                </div>
              )}

              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-3.5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Место (необязательно)"
                  className="w-full rounded-xl border pl-9 pr-4 py-3 text-sm outline-none"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                />
              </div>

              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Заметки (необязательно)"
                rows={2}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Цвет события</p>
                <div className="flex gap-2 flex-wrap">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className="w-8 h-8 rounded-full transition-transform active:scale-90"
                      style={{
                        background: c,
                        outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={saveEvent}
                disabled={!form.title.trim() || saving}
                className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: color ?? 'var(--primary)', color: '#fff' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {editEvent ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
