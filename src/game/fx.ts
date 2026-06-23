import * as THREE from 'three'
import { useGame } from './store'

// Cross-cutting, non-reactive shared values read every frame.
// Kept out of the React store so we don't trigger renders 60x/second.
export const fx = { bare: 0 } // 0 = fully suited, 1 = fully bare (smoothed)
export const playerPos = new THREE.Vector3(0, 2, 8)
export const checkpoint = new THREE.Vector3(0, 1.4, 8)
export const debugTeleport = { next: null as THREE.Vector3 | null }

// Dev-only debug hook for the headless physics tests (stripped from prod builds).
if (import.meta.env.DEV) {
  const debug = {
    pos: playerPos,
    teleport: (x: number, y: number, z: number) => {
      debugTeleport.next = new THREE.Vector3(x, y, z)
    },
    // Snap the suit state with no morph (tests run too slowly headless to wait
    // out the transition); abilities follow the committed state as usual.
    setSuit: (v: boolean) => useGame.getState().setSuit(v),
  }
  ;(globalThis as unknown as { __moltPos: THREE.Vector3 }).__moltPos = playerPos
  ;(globalThis as unknown as { __moltDebug: typeof debug }).__moltDebug = debug
}
