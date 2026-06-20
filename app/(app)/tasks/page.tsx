'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, Check, Trash2, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'
import type { Task, Profile } from '@/lib/types'

function Avatar({ profile, size = 16 }: { profile?: Profile; size?: number }) {
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

export default function TasksPage() {
  const supabase = createClient()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)

  const [showSheet, setShowSheet] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, profiles:created_by(id,name,color,avatar_url), checker:completed_by(id,name,color,avatar_url)')
      .order('created_at', { ascending: false })
    if (data) setTasks(data as Task[])
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
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const openAdd = () => {
    setForm({ title: '', description: '' })
    setShowSheet(true)
  }

  const addTask = async () => {
    if (!form.title.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('tasks')
      .insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        created_by: user!.id,
      })
      .select('*, profiles:created_by(id,name,color,avatar_url), checker:completed_by(id,name,color,avatar_url)')
      .single()

    if (data) setTasks((prev) => [data as Task, ...prev])
    setShowSheet(false)
    setSaving(false)
  }

  const toggleTask = async (task: Task) => {
    const { data: { user } } = await supabase.auth.getUser()
    const nowDone = !task.completed

    await supabase.from('tasks').update(
      nowDone
        ? { completed: true, completed_by: user?.id ?? null, completed_at: new Date().toISOString() }
        : { completed: false, completed_by: null, completed_at: null }
    ).eq('id', task.id)

    setTasks((prev) =>
      prev.map((t): Task =>
        t.id === task.id
          ? {
              ...t,
              completed: nowDone,
              completed_by: nowDone ? (user?.id ?? null) : null,
              completed_at: nowDone ? new Date().toISOString() : null,
              checker: nowDone ? (currentUser ?? undefined) : undefined,
            }
          : t
      )
    )
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const clearDone = async () => {
    const ids = tasks.filter((t) => t.completed).map((t) => t.id)
    await supabase.from('tasks').delete().in('id', ids)
    setTasks((prev) => prev.filter((t) => !t.completed))
  }

  const active = tasks.filter((t) => !t.completed)
  const done = tasks.filter((t) => t.completed)

  return (
    <>
      <Header
        title="Задачи"
        subtitle={active.length > 0 ? `${active.length} ${active.length === 1 ? 'задача' : 'задач'}` : 'Всё сделано'}
      />

      <main className="px-4 pt-4 pb-6 flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : (
          <>
            <button
              onClick={openAdd}
              className="flex items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3.5 w-full transition-all active:scale-[0.98]"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              <Plus size={18} />
              <span className="text-sm font-medium">Добавить задачу</span>
            </button>

            {active.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
                  Нужно сделать · {active.length}
                </p>
                {active.map((task) => (
                  <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                ))}
              </div>
            )}

            {active.length === 0 && done.length === 0 && (
              <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>
                Нет задач — добавь первую
              </p>
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
                  <button
                    onClick={clearDone}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={13} />
                    Очистить
                  </button>
                </div>

                {showDone && (
                  <div className="flex flex-col gap-2">
                    {done.map((task) => (
                      <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
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
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                  Новая задача
                </h2>
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
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />

              <button
                onClick={addTask}
                disabled={!form.title.trim() || saving}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--primary)', color: '#fff' }}
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

function TaskCard({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: (task: Task) => void
  onDelete: (id: string) => void
}) {
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
        onClick={() => onToggle(task)}
        className="mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all active:scale-90"
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
        <div className="flex items-center gap-1.5 mt-1.5">
          {task.completed ? (
            <>
              {task.checker && <Avatar profile={task.checker} />}
              <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
                Выполнено{task.checker ? ` · ${task.checker.name}` : ''}
              </span>
            </>
          ) : (
            <>
              {task.profiles && <Avatar profile={task.profiles} />}
              <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
                {task.profiles?.name ?? 'Кто-то'}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="p-1.5 rounded-lg active:opacity-60 flex-shrink-0"
        style={{ color: 'var(--text-subtle)' }}
      >
        <X size={15} />
      </button>
    </div>
  )
}
