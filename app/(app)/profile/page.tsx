'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Check, LogOut, User } from 'lucide-react'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

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

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0].value)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [members, setMembers] = useState<Profile[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, membersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('profiles').select('*').order('name'),
      ])

      if (profileRes.data) {
        setProfile(profileRes.data)
        setName(profileRes.data.name)
        setColor(profileRes.data.color)
        setAvatarPreview(profileRes.data.avatar_url ?? '')
      }
      if (membersRes.data) setMembers(membersRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const saveProfile = async () => {
    if (!profile || !name.trim()) return
    setSaving(true)

    let avatarUrl = profile.avatar_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() ?? 'jpg'
      const path = `avatars/${profile.id}.${ext}`
      const { error } = await supabase.storage.from('photos').upload(path, avatarFile, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
        avatarUrl = publicUrl
      }
    }

    await supabase.from('profiles').update({
      name: name.trim(),
      color,
      avatar_url: avatarUrl,
    }).eq('id', profile.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <>
        <Header title="Профиль" />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Профиль" />

      <main className="px-4 pt-5 pb-6 flex flex-col gap-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: color }}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-bold">
                {name?.[0]?.toUpperCase() ?? <User size={32} />}
              </span>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera size={20} color="white" />
            </div>
          </button>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Нажмите чтобы сменить фото
          </p>
        </div>

        {/* Form */}
        <div
          className="rounded-2xl border p-5 flex flex-col gap-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Имя
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Цвет в календаре
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
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving || !name.trim()}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: saved ? 'var(--success)' : 'var(--primary)', color: '#fff' }}
          >
            {saving
              ? <Loader2 size={16} className="animate-spin" />
              : saved
                ? <Check size={16} />
                : null
            }
            {saved ? 'Сохранено!' : 'Сохранить'}
          </button>
        </div>

        {/* Family members */}
        {members.length > 1 && (
          <div
            className="rounded-2xl border p-5 flex flex-col gap-3"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Участники · {members.length}
            </p>
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: member.color }}
                >
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt={member.name} className="rounded-full w-full h-full object-cover" />
                    : member.name[0].toUpperCase()
                  }
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {member.name}
                    {member.id === profile?.id && (
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                        (вы)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium transition-all active:scale-95 border"
          style={{
            background: 'var(--surface)',
            color: 'var(--danger)',
            borderColor: 'var(--border)',
          }}
        >
          <LogOut size={16} />
          Выйти из аккаунта
        </button>
      </main>
    </>
  )
}
