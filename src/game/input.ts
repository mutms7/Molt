import { useGame } from './store'
import { audio } from '../audio/audio'

// Module-level input state, polled by the Player each frame.
export const keys = { f: 0, b: 0, l: 0, r: 0 }
export const edges = { jump: false, dash: false } // consumed (reset) by the reader
export const look = { yaw: 0, pitch: 0 }
export const state = { locked: false }

const SENS = 0.0022
let el: HTMLElement | null = null

function kd(e: KeyboardEvent) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': keys.f = 1; break
    case 'KeyS': case 'ArrowDown': keys.b = 1; break
    case 'KeyA': case 'ArrowLeft': keys.l = 1; break
    case 'KeyD': case 'ArrowRight': keys.r = 1; break
    case 'Space':
      if (!e.repeat) edges.jump = true
      e.preventDefault()
      break
    case 'ShiftLeft': case 'ShiftRight':
      if (!e.repeat) edges.dash = true
      break
    case 'KeyQ': case 'KeyE':
      if (!e.repeat) useGame.getState().toggleSuit()
      break
  }
}

function ku(e: KeyboardEvent) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': keys.f = 0; break
    case 'KeyS': case 'ArrowDown': keys.b = 0; break
    case 'KeyA': case 'ArrowLeft': keys.l = 0; break
    case 'KeyD': case 'ArrowRight': keys.r = 0; break
  }
}

function mm(e: MouseEvent) {
  if (!state.locked) return
  look.yaw += e.movementX * SENS
  look.pitch -= e.movementY * SENS
  look.pitch = Math.max(-0.6, Math.min(0.95, look.pitch))
}

function down() {
  audio.start()
  if (el && document.pointerLockElement !== el) {
    try { (el.requestPointerLock() as unknown as Promise<void>)?.catch?.(() => {}) } catch { /* older browsers */ }
  }
}

function plc() {
  state.locked = document.pointerLockElement === el
}

export function initControls(canvas: HTMLElement) {
  el = canvas
  look.yaw = 0
  look.pitch = 0.06
  keys.f = keys.b = keys.l = keys.r = 0
  edges.jump = edges.dash = false
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)
  window.addEventListener('mousemove', mm)
  document.addEventListener('pointerlockchange', plc)
  el.addEventListener('mousedown', down)
}

export function disposeControls() {
  window.removeEventListener('keydown', kd)
  window.removeEventListener('keyup', ku)
  window.removeEventListener('mousemove', mm)
  document.removeEventListener('pointerlockchange', plc)
  el?.removeEventListener('mousedown', down)
  if (document.pointerLockElement) document.exitPointerLock()
  el = null
  state.locked = false
}
