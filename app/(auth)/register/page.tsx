'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const COLORS = [
  { value: '#4F46E5', label: 'Индиго' },
  { value: '#DC2626', label: 'Красный' },
  { value: '#16A34A', label: 'Зелёный' },
  { value: '#D97706', label: 'Янтарный' },
  { value: '#0284C7', label: 'Голубой' },
  { value: '#9333EA', label: 'Фиолетовый' },
  { value: '#DB2777', label: 'Розовый' },
  { value: '#0F766E', label: 'Бирюзовый' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [color, setColor] = useState(COLORS[0].value)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, color },
      },
    })

    if (signUpError) {
      setError(signUpError.message === 'User already registered'
        ? 'Этот email уже зарегистрирован'
        : signUpError.message
      )
      setLoading(false)
      return
    }

    router.push('/setup')
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
          Создать аккаунт
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Присоединитесь к семейному хабу
        </p>
      </div>

      <div
        className="rounded-2xl border p-6 shadow-md"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Ваше имя
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Например: Мама"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--primary)] placeholder:opacity-40"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--primary)] placeholder:opacity-40"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Минимум 6 символов"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--primary)] placeholder:opacity-40"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
            />
          </div>

          {/* Color picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Ваш цвет в календаре
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className="w-8 h-8 rounded-full transition-transform active:scale-90"
                  style={{
                    background: c.value,
                    outline: color === c.value ? `3px solid ${c.value}` : '3px solid transparent',
                    outlineOffset: '2px',
                    boxShadow: color === c.value ? `0 0 0 2px var(--surface)` : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm rounded-xl px-4 py-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 mt-1"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Создать аккаунт
          </button>
        </form>
      </div>

      <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
        Уже есть аккаунт?{' '}
        <Link href="/login" className="font-medium" style={{ color: 'var(--primary)' }}>
          Войти
        </Link>
      </p>
    </div>
  )
}
