'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, CalendarDays, CheckSquare, User } from 'lucide-react'

const TABS = [
  { href: '/shopping', label: 'Покупки',   Icon: ShoppingCart },
  { href: '/tasks',    label: 'Задачи',    Icon: CheckSquare },
  { href: '/calendar', label: 'Календарь', Icon: CalendarDays },
  { href: '/profile',  label: 'Профиль',   Icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 flex items-stretch max-w-xl mx-auto"
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--nav-shadow)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href
          || (href === '/shopping' && pathname.startsWith('/shopping'))
          || (href === '/tasks' && pathname.startsWith('/tasks'))
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-3 relative transition-all active:scale-95"
          >
            {active && (
              <span
                className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full"
                style={{ background: 'var(--primary)' }}
              />
            )}
            <Icon
              size={22}
              strokeWidth={active ? 2.2 : 1.7}
              style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
            />
            <span
              className="text-[10px] tracking-wide"
              style={{
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
