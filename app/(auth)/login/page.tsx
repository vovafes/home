'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md"
          style={{ background: 'var(--primary)' }}
        >
          <Home size={26} color="#fff" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
          Добро пожаловать
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Войдите в семейный хаб
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl border p-6 shadow-md"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                borderColor: 'var(--border)',
              }}
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
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--primary)] placeholder:opacity-40"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                borderColor: 'var(--border)',
              }}
            />
          </div>

          {error && (
            <p
              className="text-sm rounded-xl px-4 py-3"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
            >
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
            Войти
          </button>
        </form>
      </div>

      <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
        Нет аккаунта?{' '}
        <Link
          href="/register"
          className="font-medium"
          style={{ color: 'var(--primary)' }}
        >
          Зарегистрироваться
        </Link>
      </p>
    </div>
  )
}
