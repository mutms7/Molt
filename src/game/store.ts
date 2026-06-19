import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { audio } from '../audio/audio'

export type Screen = 'title' | 'select' | 'play' | 'complete'

interface State {
  screen: Screen
  zoneId: string | null
  suited: boolean
  moments: number
  totalMoments: number
  exposure: number // 0..1, only meaningful when bare in a gust
  unlocked: string[]
  completed: string[]

  setScreen: (s: Screen) => void
  startZone: (id: string, total: number) => void
  toggleSuit: () => void
  setSuit: (v: boolean) => void
  addMoment: () => void
  setExposure: (v: number) => void
  completeZone: (id: string, nextId?: string) => void
  toMenu: () => void
}

export const useGame = create<State>()(
  persist(
    (set, get) => ({
      screen: 'title',
      zoneId: null,
      suited: true,
      moments: 0,
      totalMoments: 0,
      exposure: 1,
      unlocked: ['trend-mile'],
      completed: [],

      setScreen: (s) => set({ screen: s }),
      startZone: (id, total) =>
        set({ screen: 'play', zoneId: id, suited: true, moments: 0, totalMoments: total, exposure: 1 }),
      toggleSuit: () => {
        const n = !get().suited
        set({ suited: n })
        audio.molt(n)
      },
      setSuit: (v) => set({ suited: v }),
      addMoment: () => set((s) => ({ moments: s.moments + 1 })),
      setExposure: (v) => set({ exposure: Math.max(0, Math.min(1, v)) }),
      completeZone: (id, nextId) =>
        set((s) => ({
          screen: 'complete',
          completed: [...new Set([...s.completed, id])],
          unlocked: nextId ? [...new Set([...s.unlocked, nextId])] : s.unlocked,
        })),
      toMenu: () => set({ screen: 'select', zoneId: null }),
    }),
    {
      name: 'molt-progress',
      partialize: (s) => ({ unlocked: s.unlocked, completed: s.completed }),
    }
  )
)
