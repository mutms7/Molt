import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { audio } from '../audio/audio'

export type Screen = 'title' | 'select' | 'play' | 'complete'

interface State {
  screen: Screen
  zoneId: string | null
  runId: number
  paused: boolean
  suited: boolean
  suitProgress: number // 0 = bare visual, 1 = suited visual
  suitDirection: -1 | 0 | 1
  moments: number
  totalMoments: number
  exposure: number // 0..1, only meaningful when bare in a gust
  unlocked: string[]
  completed: string[]

  setScreen: (s: Screen) => void
  startZone: (id: string, total: number) => void
  restartZone: () => void
  setPaused: (v: boolean) => void
  togglePaused: () => void
  toggleSuit: () => void
  setSuit: (v: boolean) => void
  setSuitProgress: (v: number) => void
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
      runId: 0,
      paused: false,
      suited: true,
      suitProgress: 1,
      suitDirection: 0,
      moments: 0,
      totalMoments: 0,
      exposure: 1,
      unlocked: ['trend-mile'],
      completed: [],

      setScreen: (s) => set({ screen: s, paused: false }),
      startZone: (id, total) =>
        set((s) => ({
          screen: 'play',
          zoneId: id,
          runId: s.runId + 1,
          paused: false,
          suited: true,
          suitProgress: 1,
          suitDirection: 0,
          moments: 0,
          totalMoments: total,
          exposure: 1,
        })),
      restartZone: () => {
        const { zoneId, totalMoments } = get()
        if (!zoneId) return
        set((s) => ({
          screen: 'play',
          zoneId,
          runId: s.runId + 1,
          paused: false,
          suited: true,
          suitProgress: 1,
          suitDirection: 0,
          moments: 0,
          totalMoments,
          exposure: 1,
        }))
      },
      setPaused: (v) => {
        if (get().screen !== 'play') return
        set({ paused: v })
      },
      togglePaused: () => {
        if (get().screen !== 'play') return
        set((s) => ({ paused: !s.paused }))
      },
      toggleSuit: () => {
        const { paused, screen, suitDirection, suited } = get()
        if (paused || screen !== 'play') return
        const dir = suitDirection === 0 ? (suited ? -1 : 1) : ((-suitDirection) as -1 | 1)
        set({ suitDirection: dir })
        audio.molt(dir > 0)
      },
      setSuit: (v) => set({ suited: v, suitProgress: v ? 1 : 0, suitDirection: 0 }),
      setSuitProgress: (v) => {
        const p = Math.max(0, Math.min(1, v))
        if (p <= 0) {
          set({ suited: false, suitProgress: 0, suitDirection: 0 })
        } else if (p >= 1) {
          set({ suited: true, suitProgress: 1, suitDirection: 0 })
        } else {
          set({ suitProgress: p })
        }
      },
      addMoment: () => set((s) => ({ moments: s.moments + 1 })),
      setExposure: (v) => set({ exposure: Math.max(0, Math.min(1, v)) }),
      completeZone: (id, nextId) =>
        set((s) => ({
          screen: 'complete',
          paused: false,
          completed: [...new Set([...s.completed, id])],
          unlocked: nextId ? [...new Set([...s.unlocked, nextId])] : s.unlocked,
        })),
      toMenu: () => set({ screen: 'select', zoneId: null, paused: false }),
    }),
    {
      name: 'molt-progress',
      partialize: (s) => ({ unlocked: s.unlocked, completed: s.completed }),
    }
  )
)
