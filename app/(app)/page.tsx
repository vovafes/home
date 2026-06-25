'use client'

import { useState, useEffect } from 'react'
import ShoppingSection from '@/components/sections/ShoppingSection'
import TasksSection from '@/components/sections/TasksSection'
import CalendarSection from '@/components/sections/CalendarSection'
import ProfileSection from '@/components/sections/ProfileSection'
import { HubNavContext } from '@/lib/hubNav'

const TABS = [
  { id: 'shopping', label: 'Покупки',   color: '#16A34A' },
  { id: 'tasks',    label: 'Задачи',    color: '#D97706' },
  { id: 'calendar', label: 'Календарь', color: '#0284C7' },
  { id: 'profile',  label: 'Профиль',   color: '#9333EA' },
]

export default function Hub() {
  const [activeTab, setActiveTab] = useState(0)

  // Restore last active tab on mount (after returning from a sub-route)
  useEffect(() => {
    const saved = Number(sessionStorage.getItem('hub-tab') || '0')
    if (saved > 0 && saved < TABS.length) setActiveTab(saved)
  }, [])

  const go = (index: number) => {
    setActiveTab(index)
    sessionStorage.setItem('hub-tab', String(index))
  }

  const sections = [
    <ShoppingSection key="shopping" color={TABS[0].color} />,
    <TasksSection    key="tasks"    color={TABS[1].color} />,
    <CalendarSection key="calendar" color={TABS[2].color} />,
    <ProfileSection  key="profile"  color={TABS[3].color} />,
  ]

  return (
    <HubNavContext.Provider value={{ tabs: TABS, active: activeTab, go }}>
      <div className="h-dvh overflow-y-auto">
        {sections[activeTab]}
      </div>
    </HubNavContext.Provider>
  )
}
