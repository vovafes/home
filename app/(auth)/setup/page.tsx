'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Users, Hash, Loader2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'choose' | 'create' | 'join'

export default function SetupPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('choose')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const createFamily = async () => {
    if (!familyName.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: family, error: fErr } = await supabase
      .from('families')
      .insert({ name: familyName.trim(), created_by: user.id })
      .select()
      .single()

    if (fErr || !family) {
      setError(fErr?.message ?? 'Не удалось создать семью')
      setLoading(false)
      return
    }

    await supabase.from('family_members').insert({ family_id: family.id, user_id: user.id })

    router.push('/')
    router.refresh()
  }

  const joinFamily = async () => {
    const code = inviteCode.trim().toUpperCase()
    if (code.length !== 6) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: joinErr } = await supabase.rpc('join_family_by_code', { p_code: code })

    if (joinErr) {
      setError(
        joinErr.message?.includes('family_not_found')
          ? 'Семья с таким кодом не найдена'
          : 'Не удалось вступить в семью'
      )
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md"
          style={{ background: 'var(--primary)' }}
        >
          <Home size={26} color="#fff" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
          Ваша семья
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Создайте или присоединитесь к семье
        </p>
      </div>

      {mode === 'choose' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setMode('create')}
            className="rounded-2xl border p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--primary-soft)' }}
            >
              <Plus size={20} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Создать семью</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Вы получите код для приглашения близких
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode('join')}
            className="rounded-2xl border p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--primary-soft)' }}
            >
              <Hash size={20} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Войти по коду</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Введите код, который дал вам член семьи
              </p>
            </div>
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Название семьи
              </label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createFamily()}
                placeholder="Например: Семья Ивановых"
                autoFocus
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />
            </div>

            {error && (
              <p className="text-sm rounded-xl px-4 py-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                {error}
              </p>
            )}

            <button
              onClick={createFamily}
              disabled={!familyName.trim() || loading}
              className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
              Создать семью
            </button>

            <button
              onClick={() => setMode('choose')}
              className="text-sm text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Назад
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Код приглашения
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && joinFamily()}
                placeholder="ABC123"
                maxLength={6}
                autoFocus
                className="w-full rounded-xl border px-4 py-3 text-center tracking-[0.35em] font-mono font-bold outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{
                  background: 'var(--surface-2)', color: 'var(--text)',
                  borderColor: 'var(--border)', fontSize: 22,
                }}
              />
            </div>

            {error && (
              <p className="text-sm rounded-xl px-4 py-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                {error}
              </p>
            )}

            <button
              onClick={joinFamily}
              disabled={inviteCode.length !== 6 || loading}
              className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Hash size={16} />}
              Вступить
            </button>

            <button
              onClick={() => setMode('choose')}
              className="text-sm text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Назад
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
