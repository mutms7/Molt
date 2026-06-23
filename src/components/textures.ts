import * as THREE from 'three'

// Procedural textures, drawn to a canvas at load time. No external image files:
// every surface in the game is generated from code (color map + a matching bump
// map for relief under the directional light). Cached by (kind, color).

const SIZE = 256

export type Tex = { map: THREE.CanvasTexture; bump: THREE.CanvasTexture }

function mkCanvas() {
  const c = document.createElement('canvas')
  c.width = c.height = SIZE
  return c
}

// Tiny deterministic PRNG so a given (kind, color) always looks the same.
function rng(seed: number) {
  let s = (seed | 0) || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function parseHex(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// Shade a hex color by a percentage (-100 darkens to black, +100 to white).
function shade(hex: string, pct: number) {
  const { r, g, b } = parseHex(hex)
  const d = (pct / 100) * 255
  return `rgb(${clampByte(r + d)},${clampByte(g + d)},${clampByte(b + d)})`
}

function seedOf(hex: string, salt: number) {
  const { r, g, b } = parseHex(hex)
  return r * 977 + g * 31 + b * 7 + salt * 101
}

function finish(color: HTMLCanvasElement, bump: HTMLCanvasElement): Tex {
  const map = new THREE.CanvasTexture(color)
  const bmp = new THREE.CanvasTexture(bump)
  for (const t of [map, bmp]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 4
  }
  map.colorSpace = THREE.SRGBColorSpace
  return { map, bump: bmp }
}

function speckle(ctx: CanvasRenderingContext2D, r: () => number, density: number, light: string, dark: string) {
  const n = Math.floor(SIZE * SIZE * density)
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = r() > 0.5 ? light : dark
    ctx.fillRect(r() * SIZE, r() * SIZE, 1.6, 1.6)
  }
}

// Stone/ceramic tiles with grout. The reference floor surface.
function tileTex(hex: string, tiles = 4): Tex {
  const cc = mkCanvas(), bc = mkCanvas()
  const cx = cc.getContext('2d')!, bx = bc.getContext('2d')!
  const r = rng(seedOf(hex, 1))
  cx.fillStyle = hex; cx.fillRect(0, 0, SIZE, SIZE)
  bx.fillStyle = '#b4b4b4'; bx.fillRect(0, 0, SIZE, SIZE)
  const t = SIZE / tiles
  for (let i = 0; i < tiles; i++) {
    for (let j = 0; j < tiles; j++) {
      cx.fillStyle = shade(hex, (r() - 0.5) * 16)
      cx.fillRect(i * t + 1, j * t + 1, t - 2, t - 2)
      const g = bx.createLinearGradient(i * t, j * t, i * t + t, j * t + t)
      g.addColorStop(0, '#e2e2e2'); g.addColorStop(1, '#9c9c9c')
      bx.fillStyle = g; bx.fillRect(i * t + 1, j * t + 1, t - 2, t - 2)
    }
  }
  speckle(cx, r, 0.03, '#ffffff12', '#00000016')
  cx.strokeStyle = shade(hex, -34); cx.lineWidth = SIZE * 0.016
  bx.strokeStyle = '#363636'; bx.lineWidth = SIZE * 0.022
  for (let i = 0; i <= tiles; i++) {
    const p = i * t
    cx.beginPath(); cx.moveTo(p, 0); cx.lineTo(p, SIZE); cx.moveTo(0, p); cx.lineTo(SIZE, p); cx.stroke()
    bx.beginPath(); bx.moveTo(p, 0); bx.lineTo(p, SIZE); bx.moveTo(0, p); bx.lineTo(SIZE, p); bx.stroke()
  }
  return finish(cc, bc)
}

// Riveted metal panels. For steps and mechanical platforms.
function panelTex(hex: string): Tex {
  const cc = mkCanvas(), bc = mkCanvas()
  const cx = cc.getContext('2d')!, bx = bc.getContext('2d')!
  const r = rng(seedOf(hex, 2))
  const grd = cx.createLinearGradient(0, 0, 0, SIZE)
  grd.addColorStop(0, shade(hex, 8)); grd.addColorStop(0.5, hex); grd.addColorStop(1, shade(hex, -10))
  cx.fillStyle = grd; cx.fillRect(0, 0, SIZE, SIZE)
  bx.fillStyle = '#bdbdbd'; bx.fillRect(0, 0, SIZE, SIZE)
  speckle(cx, r, 0.02, '#ffffff10', '#0000000e')
  // two horizontal panels with a seam
  cx.strokeStyle = shade(hex, -30); cx.lineWidth = 4
  bx.strokeStyle = '#444'; bx.lineWidth = 6
  for (const y of [SIZE * 0.5]) {
    cx.beginPath(); cx.moveTo(0, y); cx.lineTo(SIZE, y); cx.stroke()
    bx.beginPath(); bx.moveTo(0, y); bx.lineTo(SIZE, y); bx.stroke()
  }
  // rivets
  for (const [rx, ry] of [[20, 20], [SIZE - 20, 20], [20, SIZE - 20], [SIZE - 20, SIZE - 20], [SIZE / 2, 20], [SIZE / 2, SIZE - 20]]) {
    cx.fillStyle = shade(hex, 18); cx.beginPath(); cx.arc(rx, ry, 5, 0, 7); cx.fill()
    cx.fillStyle = shade(hex, -22); cx.beginPath(); cx.arc(rx, ry, 5, 1.2, 4.2); cx.fill()
    bx.fillStyle = '#f0f0f0'; bx.beginPath(); bx.arc(rx, ry, 5, 0, 7); bx.fill()
  }
  return finish(cc, bc)
}

// Frosted, streaked glass. Used on transparent materials, so the map mostly
// modulates brightness.
function glassTex(hex: string): Tex {
  const cc = mkCanvas(), bc = mkCanvas()
  const cx = cc.getContext('2d')!, bx = bc.getContext('2d')!
  const r = rng(seedOf(hex, 3))
  cx.fillStyle = hex; cx.fillRect(0, 0, SIZE, SIZE)
  bx.fillStyle = '#cccccc'; bx.fillRect(0, 0, SIZE, SIZE)
  for (let k = 0; k < 26; k++) {
    const x = r() * SIZE
    cx.strokeStyle = r() > 0.5 ? '#ffffff22' : '#ffffff10'
    cx.lineWidth = 1 + r() * 2
    cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x + (r() - 0.5) * 30, SIZE); cx.stroke()
  }
  // mullion frame
  cx.strokeStyle = shade(hex, -18); cx.lineWidth = 8
  cx.strokeRect(0, 0, SIZE, SIZE)
  bx.strokeStyle = '#777'; bx.lineWidth = 10; bx.strokeRect(0, 0, SIZE, SIZE)
  return finish(cc, bc)
}

// Rippled water / caustics. Bright on a dark base; good as map + emissiveMap.
function waterTex(hex: string): Tex {
  const cc = mkCanvas(), bc = mkCanvas()
  const cx = cc.getContext('2d')!, bx = bc.getContext('2d')!
  const r = rng(seedOf(hex, 4))
  cx.fillStyle = shade(hex, -26); cx.fillRect(0, 0, SIZE, SIZE)
  bx.fillStyle = '#888'; bx.fillRect(0, 0, SIZE, SIZE)
  for (let k = 0; k < 60; k++) {
    const x = r() * SIZE, y = r() * SIZE, rad = 8 + r() * 34
    const g = cx.createRadialGradient(x, y, 1, x, y, rad)
    g.addColorStop(0, shade(hex, 30)); g.addColorStop(0.6, shade(hex, 6)); g.addColorStop(1, '#00000000')
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, rad, 0, 7); cx.fill()
    bx.fillStyle = '#bbbbbb33'; bx.beginPath(); bx.arc(x, y, rad, 0, 7); bx.fill()
  }
  return finish(cc, bc)
}

// Loose soil for planters.
function soilTex(hex: string): Tex {
  const cc = mkCanvas(), bc = mkCanvas()
  const cx = cc.getContext('2d')!, bx = bc.getContext('2d')!
  const r = rng(seedOf(hex, 5))
  cx.fillStyle = hex; cx.fillRect(0, 0, SIZE, SIZE)
  bx.fillStyle = '#9a9a9a'; bx.fillRect(0, 0, SIZE, SIZE)
  for (let k = 0; k < SIZE * SIZE * 0.06; k++) {
    const x = r() * SIZE, y = r() * SIZE, s = 1 + r() * 2.5
    const v = (r() - 0.5) * 40
    cx.fillStyle = shade(hex, v); cx.fillRect(x, y, s, s)
    bx.fillStyle = v > 0 ? '#dddddd' : '#666666'; bx.fillRect(x, y, s, s)
  }
  return finish(cc, bc)
}

export type TexKind = 'tile' | 'panel' | 'glass' | 'water' | 'soil'

const GENERATORS: Record<TexKind, (hex: string) => Tex> = {
  tile: tileTex,
  panel: panelTex,
  glass: glassTex,
  water: waterTex,
  soil: soilTex,
}

const cache = new Map<string, Tex>()

export function getTex(kind: TexKind, color: string): Tex {
  const key = `${kind}:${color}`
  let t = cache.get(key)
  if (!t) {
    t = GENERATORS[kind](color)
    cache.set(key, t)
  }
  return t
}

// A per-instance clone with its own repeat (tiling scaled to world size).
export function tiled(kind: TexKind, color: string, repeatX: number, repeatY: number): Tex {
  const base = getTex(kind, color)
  const map = base.map.clone()
  const bump = base.bump.clone()
  map.repeat.set(repeatX, repeatY)
  bump.repeat.set(repeatX, repeatY)
  map.needsUpdate = bump.needsUpdate = true
  return { map, bump }
}
