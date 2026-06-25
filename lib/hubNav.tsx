'use client'

import { createContext, useContext } from 'react'

export interface HubTab {
  id: string
  label: string
  color: string
}

export interface HubNav {
  tabs: HubTab[]
  active: number
  go: (index: number) => void
}

export const HubNavContext = createContext<HubNav | null>(null)

export function useHubNav(): HubNav | null {
  return useContext(HubNavContext)
}
