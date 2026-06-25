'use client'

import { useState, useRef, useEffect } from 'react'
import ShoppingSection from '@/components/sections/ShoppingSection'
import TasksSection from '@/components/sections/TasksSection'
import CalendarSection from '@/components/sections/CalendarSection'
import ProfileSection from '@/components/sections/ProfileSection'

const TABS = [
  { id: 'shopping', label: 'Покупки',   color: '#16A34A' },
  { id: 'tasks',    label: 'Задачи',    color: '#D97706' },
  { id: 'calendar', label: 'Календарь', color: '#0284C7' },
  { id: 'profile',  label: 'Профиль',   color: '#9333EA' },
]

export default function Hub() {
  const [activeTab, setActiveTab] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const ignoreScroll = useRef(false)

  // Restore last active tab on mount (after returning from a sub-route)
  useEffect(() => {
    const saved = Number(sessionStorage.getItem('hub-tab') || '0')
    if (saved > 0 && scrollRef.current) {
      ignoreScroll.current = true
      scrollRef.current.scrollLeft = saved * scrollRef.current.clientWidth
      setActiveTab(saved)
      setTimeout(() => { ignoreScroll.current = false }, 100)
    }
  }, [])

  // Track swipe/scroll position
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let rafId = 0
    const onScroll = () => {
      if (ignoreScroll.current) return
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const index = Math.round(el.scrollLeft / el.clientWidth)
        if (index !== activeTab) {
          setActiveTab(index)
          sessionStorage.setItem('hub-tab', String(index))
        }
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId) }
  }, [activeTab])

  const scrollTo = (index: number) => {
    const el = scrollRef.current
    if (!el) return
    ignoreScroll.current = true
    setActiveTab(index)
    sessionStorage.setItem('hub-tab', String(index))
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
    setTimeout(() => { ignoreScroll.current = false }, 400)
  }

  return (
    <div className="h-dvh overflow-hidden">
      {/* Horizontal scroll-snap */}
      <div
        ref={scrollRef}
        className="flex h-full"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {[
          <ShoppingSection key="shopping" color={TABS[0].color} />,
          <TasksSection    key="tasks"    color={TABS[1].color} />,
          <CalendarSection key="calendar" color={TABS[2].color} />,
          <ProfileSection  key="profile"  color={TABS[3].color} />,
        ].map((section, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-full h-full overflow-y-auto"
            style={{ scrollSnapAlign: 'start', scrollbarWidth: 'none' }}
          >
            {section}
          </div>
        ))}
      </div>

      {/* Side dots indicator */}
      <div
        className="fixed right-2.5 z-50 flex flex-col items-center gap-2.5"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      >
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => scrollTo(i)}
            aria-label={tab.label}
            title={tab.label}
            style={{
              width: 3,
              height: activeTab === i ? 32 : 6,
              borderRadius: 99,
              background: activeTab === i ? tab.color : 'var(--border-strong)',
              opacity: activeTab === i ? 1 : 0.45,
              transition: 'height 0.25s cubic-bezier(0.32,0.72,0,1), background 0.2s, opacity 0.2s',
              display: 'block',
            }}
          />
        ))}
      </div>
    </div>
  )
}
