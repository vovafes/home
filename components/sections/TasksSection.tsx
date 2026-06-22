'use client'

import { useState, useEffect, useCallback } from 'react'
import VirtualGroup from '@/components/VirtualGroup'
import { Plus, X, Check, Trash2, ChevronDown, ChevronUp, Loader2, Users, CalendarDays } from 'lucide-react'
import Header from '@/components/Header'
import ConfirmModal from '@/components/ConfirmModal'
import Toast from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'
import { getFamilyId } from '@/lib/family'
import type { Task, Profile } from '@/lib/types'
import UIState from '@/components/UIState'

const TASK_SELECT =
  '*, profiles:created_by(id,name,color,avatar_url), checker:completed_by(id,name,color,avatar_url), assignee:assigned_to(id,name,color,avatar_url)'

function localToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function dateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const diff = Math.round((d.getTime() - localToday().getTime()) / 86400000)
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Завтра'
  if (diff === -1) return 'Вчера'
  const wd = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()]
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  return `${wd}, ${d.getDate()} ${months[d.getMonth()]}`
}

function MemberDot({ profile, size = 16 }: { profile?: Profile; size?: number }) {
  if (!profile) return null
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: profile.color, fontSize: size * 0.45 }}
    >
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
        : profile.name[0].toUpperCase()}
    </div>
  )
}

export default function TasksSection({ color }: { color?: string }) {
  const supabase = createClient()
  const accent = color ?? 'var(--primary)'

  const PAGE_SIZE = 30
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [filter, setFilter] = useState<string>('all') // 'all' | profileId
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'done'>('all')
  const [dateFilter, setDateFilter] = useState<'all'|'today'|'week'|'nodate'>('all')
  const [showSheet, setShowSheet] = useState(false)
  const [form, setForm] = useState<{ title: string; description: string; assignedTo: string | null; dueDate: string; recurrence?: string }>({
    title: '', description: '', assignedTo: null, dueDate: '', recurrence: '' ,
  })
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Confirm modal state
  const [confirm, setConfirm] = useState<{ open: boolean; message: string; onConfirm?: () => void }>({ open: false, message: '' })
  // Toasts
  const [toasts, setToasts] = useState<any[]>([])


  const load = useCallback(async (pageNum = 0, opts?: { q?: string; status?: string; date?: string }) => {
    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let query = supabase
      .from('tasks')
      .select(TASK_SELECT)
      .order('created_at', { ascending: false })

    if (opts?.q) {
      const q = opts.q.replace(/%/g, '\\%')
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    }
    if (opts?.status === 'active') query = query.eq('completed', false)
    if (opts?.status === 'done') query = query.eq('completed', true)

    if (opts?.date === 'today') {
      const today = new Date()
      today.setHours(0,0,0,0)
      const iso = today.toISOString().slice(0,10)
      query = query.eq('due_date', iso)
    }
    if (opts?.date === 'week') {
      const now = new Date()
      const start = new Date(now)
      start.setHours(0,0,0,0)
      start.setDate(start.getDate() - start.getDay() + 1) // Monday
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      const s = start.toISOString().slice(0,10)
      const e = end.toISOString().slice(0,10)
      query = query.gte('due_date', s).lte('due_date', e)
    }
    if (opts?.date === 'nodate') query = query.is('due_date', null)

    const { data } = await query.range(from, to)
    if (data) {
      if (pageNum === 0) setTasks(data as Task[])
      else setTasks((prev) => [...prev, ...(data as Task[])])
      setHasMore((data as Task[]).length === PAGE_SIZE)
    } else {
      setHasMore(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // initial load
    load(0, { q: search, status: statusFilter, date: dateFilter })
    supabase.from('profiles').select('*').order('created_at').then(({ data }) => {
      if (data) setMembers(data as Profile[])
    })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => { if (data) setCurrentUser(data) })
      }
    })
    const channel = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { setPage(0); load(0, { q: search, status: statusFilter, date: dateFilter }) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load, search, statusFilter, dateFilter])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(next, { q: search, status: statusFilter, date: dateFilter })
  }

  const openSheet = () => {
    setForm({ title: '', description: '', assignedTo: filter === 'all' ? null : filter, dueDate: '', recurrence: '' })
    setShowSheet(true)
  }

  const addTask = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const [{ data: { user } }, familyId] = await Promise.all([
      supabase.auth.getUser(),
      getFamilyId(supabase),
    ])
    if (!familyId) { setSaving(false); return }
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        created_by: user!.id,
        assigned_to: form.assignedTo,
        due_date: form.dueDate || null,
        recurrence: form.recurrence || null,
        family_id: familyId,
      })
      .select(TASK_SELECT)
      .single()
    if (data) setTasks((prev) => [data as Task, ...prev])
    if (!error) setShowSheet(false)
    setSaving(false)
  }

  const toggleTask = async (task: Task) => {
    const { data: { user } } = await supabase.auth.getUser()
    const nowDone = !task.completed
    // optimistic update
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: nowDone, completed_by: nowDone ? (currentUser?.id ?? null) : null, completed_at: nowDone ? new Date().toISOString() : null, checker: nowDone ? (currentUser ?? undefined) : undefined } : t))
    try {
      await supabase.from('tasks').update(
        nowDone
          ? { completed: true, completed_by: user?.id ?? null, completed_at: new Date().toISOString() }
          : { completed: false, completed_by: null, completed_at: null }
      ).eq('id', task.id)
    } catch (e) {
      // rollback
      setTasks((prev) => prev.map((t) => t.id === task.id ? task : t))
      setToasts((s) => [...s, { id: String(Date.now()), message: 'Ошибка обновления статуса задачи', undoLabel: 'Повторить', onUndo: async () => toggleTask(task) }])
      return
    }

    // If task is recurring (weekly), create next occurrence
    if (nowDone && task.recurrence === 'weekly') {
      try {
        const familyId = await getFamilyId(supabase)
        if (familyId && task.due_date) {
          const d = new Date(task.due_date + 'T00:00:00')
          d.setDate(d.getDate() + 7)
          const nextDate = d.toISOString().slice(0, 10)
          const { data } = await supabase.from('tasks').insert({
            title: task.title,
            description: task.description,
            created_by: user!.id,
            assigned_to: task.assigned_to,
            due_date: nextDate,
            recurrence: task.recurrence,
            family_id: familyId,
          }).select(TASK_SELECT).single()
          if (data) setTasks((prev) => [data as Task, ...prev])
        }
      } catch (e) {
        // ignore errors for now
      }
    }
  }

  const deleteTask = async (id: string) => {
    const t = tasks.find((x) => x.id === id)
    setConfirm({ open: true, message: 'Удалить задачу? Это действие необратимо.', onConfirm: async () => {
      setConfirm({ open: false, message: '' })
      // optimistic remove
      setTasks((prev) => prev.filter((t2) => t2.id !== id))
      try {
        await supabase.from('tasks').delete().eq('id', id)
        // show undo toast
        const toastId = String(Date.now())
        setToasts((s) => [...s, { id: toastId, message: 'Задача удалена', onUndo: async () => {
          if (!t) return
          const { data } = await supabase.from('tasks').insert({
            id: t.id,
            title: t.title,
            description: t.description,
            created_by: t.created_by,
            assigned_to: t.assigned_to,
            due_date: t.due_date,
            recurrence: t.recurrence,
            family_id: t.family_id,
          }).select(TASK_SELECT).single()
          if (data) setTasks((prev) => [data as Task, ...prev])
        }, timeout: 5000 }])
      } catch (e) {
        // rollback
        if (t) setTasks((prev) => [t, ...prev])
        setToasts((s) => [...s, { id: String(Date.now()), message: 'Ошибка при удалении. Попробовать снова.' }])
      }
    } })
  }

  const clearDone = async () => {
    setConfirm({ open: true, message: 'Удалить все выполненные задачи? Это действие необратимо.', onConfirm: async () => {
      setConfirm({ open: false, message: '' })
      const removed = tasks.filter((t) => t.completed)
      const ids = removed.map((t) => t.id)
      setTasks((prev) => prev.filter((t) => !t.completed))
      try {
        await supabase.from('tasks').delete().in('id', ids)
        const toastId = String(Date.now())
        setToasts((s) => [...s, { id: toastId, message: 'Выполненные задачи удалены', undoLabel: 'Отменить', onUndo: async () => {
          // restore all
          if (!removed.length) return
          const inserts = removed.map((r) => ({ title: r.title, description: r.description, created_by: r.created_by, assigned_to: r.assigned_to, due_date: r.due_date, recurrence: r.recurrence, family_id: r.family_id }))
          const { data } = await supabase.from('tasks').insert(inserts).select(TASK_SELECT)
          if (data) setTasks((prev) => [...(data as Task[]), ...prev])
        }, timeout: 7000 }])
      } catch (e) {
        setTasks((prev) => [...prev, ...removed])
        setToasts((s) => [...s, { id: String(Date.now()), message: 'Ошибка удаления выполненных задач' }])
      }
    } })
  }

  // Update recurrence on a task
  const updateRecurrence = async (id: string, val: string) => {
    const prev = tasks.find((t) => t.id === id)
    if (!prev) return
    setTasks((s) => s.map((t) => t.id === id ? { ...t, recurrence: val || null } : t))
    try {
      await supabase.from('tasks').update({ recurrence: val || null }).eq('id', id)
    } catch (e) {
      // rollback
      setTasks((s) => s.map((t) => t.id === id ? prev : t))
      setToasts((s) => [...s, { id: String(Date.now()), message: 'Не удалось изменить повторение задачи' }])
    }
  }

  // Фильтр: «Все» → всё; участник → его задачи + общие (assigned_to = null)
  const matchesFilter = (t: Task) =>
    filter === 'all' || t.assigned_to === filter || t.assigned_to === null

  const active = tasks.filter((t) => !t.completed && matchesFilter(t))
  const done = tasks.filter((t) => t.completed && matchesFilter(t))

  // Группировка активных по дате: сначала даты по возрастанию, затем «Без даты»
  const dated = active.filter((t) => t.due_date)
  const undated = active.filter((t) => !t.due_date)
  const dateKeys = Array.from(new Set(dated.map((t) => t.due_date as string))).sort()
  const groups: { key: string; label: string; items: Task[] }[] = [
    ...dateKeys.map((k) => ({ key: k, label: dateLabel(k), items: dated.filter((t) => t.due_date === k) })),
    ...(undated.length ? [{ key: 'none', label: 'Без даты', items: undated }] : []),
  ]

  return (
    <>
      <ConfirmModal open={confirm.open} message={confirm.message} onConfirm={() => confirm.onConfirm && confirm.onConfirm()} onCancel={() => setConfirm({ open: false, message: '' })} />
      <Toast items={toasts} onRemove={(id: string) => setToasts((s) => s.filter((t) => t.id !== id))} />
      <Header
        title="Задачи"
        subtitle={active.length > 0 ? `${active.length} задач` : 'Всё готово'}
        color={color}
      />

      <main className="px-4 pt-4 pb-6 flex flex-col gap-4">
        {loading ? (
          <UIState type="loading" message="Загрузка задач…" />
        ) : (
          <>
            {/* Search + Фильтр по участникам + статус + дата */}
            <div className="flex gap-2 items-center">
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Поиск задач"
                className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
                className="rounded-xl border px-2 py-2 text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}>
                <option value="all">Все</option>
                <option value="active">Нужно сделать</option>
                <option value="done">Выполнено</option>
              </select>
              <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value as any); setPage(0); }}
                className="rounded-xl border px-2 py-2 text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}>
                <option value="all">По дате</option>
                <option value="today">Сегодня</option>
                <option value="week">Эта неделя</option>
                <option value="nodate">Без даты</option>
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
              <FilterChip active={filter === 'all'} accent={accent} onClick={() => setFilter('all')}>
                <Users size={13} /> Все
              </FilterChip>
              {members.map((m) => (
                <FilterChip key={m.id} active={filter === m.id} accent={m.color} onClick={() => setFilter(m.id)}>
                  <MemberDot profile={m} size={15} />
                  {m.id === currentUser?.id ? 'Я' : m.name}
                </FilterChip>
              ))}
            </div>
            <button
              onClick={openSheet}
              className="flex items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3.5 w-full transition-all active:scale-[0.98]"
              style={{ borderColor: accent, color: accent }}
            >
              <Plus size={18} />
              <span className="text-sm font-medium">Добавить задачу</span>
            </button>

            {groups.map((g) => (
              <div key={g.key} className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest px-1 flex items-center gap-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  {g.label} · {g.items.length}
                </p>
                {/* Virtualized list for group items */}
                {g.items.length > 50 ? (
                  // use simple virtualization for long groups
                  <VirtualGroup items={g.items} onToggle={toggleTask} onDelete={deleteTask} />
                ) : (
                  g.items.map((task) => (
                    <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onChangeRecurrence={(id, val) => updateRecurrence(id, val)} />
                  ))
                )}
              </div>
            ))}

            {groups.length === 0 && active.length === 0 && done.length === 0 && (
              <UIState type="empty" message={filter === 'all' ? 'Нет задач — добавь первую' : 'Здесь пока нет задач'} actionLabel="Добавить" onAction={openSheet} />
            )}

            {hasMore && (
              <div className="mt-3 flex justify-center">
                <button onClick={loadMore} className="rounded-xl px-4 py-2 border" style={{ borderColor: 'var(--border)' }}>
                  Загрузить ещё
                </button>
              </div>
            )}

            {done.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <button
                    onClick={() => setShowDone((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showDone ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    Выполнено · {done.length}
                  </button>
                  <button onClick={clearDone} className="flex items-center gap-1 text-xs" style={{ color: 'var(--danger)' }}>
                    <Trash2 size={13} />
                    Очистить
                  </button>
                </div>
                {showDone && (
                  <div className="flex flex-col gap-2">
                    {done.map((task) => (
                                          <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onChangeRecurrence={(id, val) => updateRecurrence(id, val)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {showSheet && (
        <>
          <div className="sheet-backdrop" onClick={() => setShowSheet(false)} />
          <div
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl max-w-xl mx-auto animate-slide-up"
            style={{ background: 'var(--surface)', boxShadow: 'var(--sheet-shadow)' }}
          >
            <div className="p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Новая задача</h2>
                <button onClick={() => setShowSheet(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Название задачи *"
                autoFocus
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />

              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Описание (необязательно)"
                rows={2}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />

              {/* Кому задача */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
                  Кому
                </p>
                <div className="flex gap-2 flex-wrap">
                  <FilterChip active={form.assignedTo === null} accent={accent}
                    onClick={() => setForm((f) => ({ ...f, assignedTo: null }))}>
                    <Users size={13} /> Всем
                  </FilterChip>
                  {members.map((m) => (
                    <FilterChip key={m.id} active={form.assignedTo === m.id} accent={m.color}
                      onClick={() => setForm((f) => ({ ...f, assignedTo: m.id }))}>
                      <MemberDot profile={m} size={15} />
                      {m.id === currentUser?.id ? 'Я' : m.name}
                    </FilterChip>
                  ))}
                </div>
              </div>

              {/* Дата */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest px-1 flex items-center gap-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  <CalendarDays size={13} /> Когда (необязательно)
                </p>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                />
               </div>

               {/* Recurrence */}
               <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
                  Повторять
                </p>
                <select value={form.recurrence ?? ''} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
                                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
                                  style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}>
                  <option value="">Никогда</option>
                  <option value="weekly">Каждую неделю</option>
                </select>
                </div>
              <button
                onClick={addTask}
                disabled={!form.title.trim() || saving}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: accent, color: '#fff' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Добавить
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function FilterChip({
  active, accent, onClick, children,
}: {
  active: boolean
  accent: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border transition-all active:scale-95"
      style={{
        background: active ? accent : 'var(--surface-2)',
        color: active ? '#fff' : 'var(--text-muted)',
        borderColor: active ? accent : 'var(--border)',
      }}
    >
      {children}
    </button>
  )
}

function TaskCard({
  task, onToggle, onDelete, onChangeRecurrence,
}: {
  task: Task
  onToggle: (task: Task) => void
  onDelete: (id: string) => void
  onChangeRecurrence?: (id: string, val: string) => void
}) {
  const [anim, setAnim] = useState(false)
  const handleToggle = () => {
    setAnim(true)
    onToggle(task)
    setTimeout(() => setAnim(false), 350)
  }

  return (
    <div
      className="rounded-2xl border flex items-start gap-3 p-3.5 transition-all"
      style={{
        background: task.completed ? 'var(--surface-2)' : 'var(--surface)',
        borderColor: 'var(--border)',
        opacity: task.completed ? 0.7 : 1,
      }}
    >
      <button
        onClick={handleToggle}
        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${anim ? 'animate-check-pop' : ''}`}
        style={{
          background: task.completed ? 'var(--success)' : 'transparent',
          borderColor: task.completed ? 'var(--success)' : 'var(--border-strong)',
        }}
      >
        {task.completed && <Check size={12} color="#fff" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-snug"
          style={{
            color: 'var(--text)',
            textDecoration: task.completed ? 'line-through' : 'none',
            opacity: task.completed ? 0.6 : 1,
          }}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {task.completed ? (
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-subtle)' }}>
              {task.checker && <MemberDot profile={task.checker} size={16} />}
              Выполнено{task.checker ? ` · ${task.checker.name}` : ''}
            </span>
          ) : task.assignee ? (
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-subtle)' }}>
              <MemberDot profile={task.assignee} size={16} />
              {task.assignee.name}
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text-subtle)' }}>
              <Users size={11} /> Всем
            </span>
          )}

          {/* Recurrence control */}
          <select value={task.recurrence ?? ''} onChange={(e) => onChangeRecurrence && onChangeRecurrence(task.id, e.target.value)}
            className="text-xs rounded-full border px-2 py-1"
            style={{ background: 'var(--surface-2)', color: 'var(--text-subtle)', borderColor: 'var(--border)' }}>
            <option value="">Никогда</option>
            <option value="weekly">Каждую неделю</option>
          </select>
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        aria-label="Удалить задачу"
        className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0"
        style={{ color: 'var(--text-subtle)' }}
      >
        <X size={15} />
      </button>
    </div>
  )
}
