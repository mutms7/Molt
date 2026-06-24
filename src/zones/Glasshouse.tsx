import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { Block, Pane, Lamp, type V3 } from '../components/Blocks'
import { tiled } from '../components/textures'
import { Collectible } from '../components/Collectible'
import { HiddenPlatform } from '../components/HiddenPlatform'
import { GustZone } from '../components/GustZone'
import { NPC } from '../components/NPC'
import { Goal } from '../components/Goal'
import { Checkpoint } from '../components/Checkpoint'

function Planter({ pos }: { pos: V3 }) {
  const soil = useMemo(() => tiled('soil', '#4a3a2c', 1, 1), [])
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1.3, 0.6, 1.3]} />
        <meshStandardMaterial color="#6f6e69" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[0, 0.61, 0]}>
        <boxGeometry args={[1.15, 0.04, 1.15]} />
        <meshStandardMaterial map={soil.map} bumpMap={soil.bump} bumpScale={0.08} roughness={1} />
      </mesh>
      <mesh castShadow position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshStandardMaterial color="#1d9e75" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.34, 1.2, 0.12]}>
        <sphereGeometry args={[0.34, 10, 10]} />
        <meshStandardMaterial color="#0f6e56" roughness={0.85} />
      </mesh>
    </group>
  )
}

function Water({ pos, size }: { pos: V3; size: V3 }) {
  const tex = useMemo(() => tiled('water', '#2a7d8c', size[0] / 4, size[2] / 4), [size])
  useFrame((_, dt) => {
    tex.map.offset.x += dt * 0.05
    tex.map.offset.y -= dt * 0.03
  })
  return (
    <mesh position={pos} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial map={tex.map} emissiveMap={tex.map} color="#bfeae6" emissive="#1d9e75" emissiveIntensity={0.5} transparent opacity={0.62} roughness={0.15} metalness={0.1} depthWrite={false} />
    </mesh>
  )
}

function Rain() {
  const group = useRef<THREE.Group>(null)
  const drops = useMemo(
    () =>
      Array.from({ length: 140 }, () => ({
        x: (Math.random() - 0.5) * 26,
        y: Math.random() * 16,
        z: 16 - Math.random() * 104,
        len: 0.45 + Math.random() * 0.6,
        spd: 9 + Math.random() * 8,
      })),
    []
  )
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    g.children.forEach((c, i) => {
      c.position.y -= drops[i].spd * dt
      if (c.position.y < -2) c.position.y = 16
    })
  })
  return (
    <group ref={group}>
      {drops.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]}>
          <boxGeometry args={[0.02, d.len, 0.02]} />
          <meshBasicMaterial color="#dff1ff" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// === The Glasshouse: the challenge obby ===
// Introduces the DASH and stacks the mechanics. The twist stands: the suit
// cannot cross water, so every water-route is a bare-only plank you reach by
// molting in the air. Y is up; tops at y = 0 unless noted. Budget: dash-jump
// flat ~11, dash+double ~14, suited single up ~3.5, bare flat ~4.6.
//   spawn  a 9 m gap nothing but a DASH clears (teach dash)
//   CP1    molt to bare in the air onto the flooded nave, cross a rain GUST
//   CP2    re-suit and climb up onto the glass roof (a side stack of planks
//          hides a moment for whoever can time molts up it)
//   CP3    the expert leap: dash + double-jump + molt, all in one jump
//   CP4    the high far bank and the goal

const FLOORS: { pos: V3; size: V3; kind?: 'tile' | 'panel'; color?: string }[] = [
  { pos: [0, -0.25, 9], size: [22, 0.5, 14], color: '#cfe3da' },      // PLAZA top0
  { pos: [0, 0.5, -10], size: [8, 0.5, 6], color: '#c6e0d6' },        // D1 top0.75 (after the dash gap)
  { pos: [0, 0.5, -35], size: [10, 0.5, 6], color: '#cfe3da' },       // FB far bank top0.75 (after the nave)
  { pos: [0, 4.0, -41], size: [6, 0.5, 4], kind: 'panel', color: '#9fb8ad' },  // R1 step top4.25 (forces re-suit)
  { pos: [0, 5.6, -48], size: [10, 0.5, 7], kind: 'panel', color: '#bcd6cc' }, // ROOF top5.85
  { pos: [0, 4.5, -76], size: [10, 0.5, 9], color: '#d6ece4' },       // GBANK goal terrace top4.75
]

const STONES_LOW: V3[] = [
  [0, 0.45, -18.1], // W1 (mid-air molt entry)
  [-3, 0.45, -21],  // W2
  [0, 0.45, -24],   // W3 (gust)
  [3, 0.45, -27],   // W4 (gust)
  [0, 0.45, -30],   // W5
]
// A side stack: climbed by molting suit-to-jump, bare-to-land, step after step.
const STONES_STACK: V3[] = [
  [9, 1.85, -35], // SK1 top2.0
  [9, 4.85, -37], // SK2 top5.0 (up 3.0, suited single only, but solid only bare)
  [9, 7.85, -35], // SK3 top8.0 (a moment waits on top)
]
// The expert route, reached by the dash + double-jump + molt leap.
const STONES_EX: V3[] = [
  [0, 4.45, -65.1], // EX1
  [3, 4.45, -68],   // EX2
  [0, 4.45, -71],   // EX3
]

const CHECKPOINTS: { index: number; pos: V3 }[] = [
  { index: 0, pos: [3, 0.75, -10] }, // D1
  { index: 1, pos: [3.5, 0.75, -35] }, // FB
  { index: 2, pos: [3.5, 5.85, -48] }, // ROOF
  { index: 3, pos: [3.5, 4.75, -76] }, // GBANK
]

const PANES: { pos: V3; size: V3 }[] = [
  { pos: [11.4, 3, -6], size: [0.25, 6, 26] },
  { pos: [-11.4, 3, -6], size: [0.25, 6, 26] },
  { pos: [11.4, 6.6, -55], size: [0.25, 6, 34] },
  { pos: [-11.4, 6.6, -55], size: [0.25, 6, 34] },
]

const PLANTERS: V3[] = [
  [8, 0, 12],
  [-8, 0, 5],
  [-4, 0.75, -35],
  [4, 0.75, -35],
]

const LAMPS: { pos: V3; color: string }[] = [
  { pos: [0, 0.75, -10], color: '#a8e6cf' },
  { pos: [-3, 0.75, -35], color: '#eafff6' },
  { pos: [0, 5.85, -48], color: '#a8e6cf' },
  { pos: [0, 4.75, -76], color: '#eafff6' },
]

const NPCS: { pos: V3; color: string; rot: number }[] = [
  { pos: [4, 0, 11], color: '#A8E6CF', rot: 2.7 },
  { pos: [-5, 0, 6], color: '#c2d9db', rot: -1.4 },
]

const WATER: { pos: V3; size: V3 }[] = [
  { pos: [0, -0.7, -23], size: [22, 0.2, 18] }, // the flooded nave
  { pos: [0, -0.7, -3], size: [18, 0.2, 11] },  // under the dash gap
  { pos: [0, 4.2, -67], size: [22, 0.2, 14] },  // pooled on the high glass roof
]

const MOMENTS: V3[] = [
  [5, 1.0, 10],     // plaza edge
  [-6, 1.0, 4],     // plaza edge
  [3, 1.75, -10],   // D1 edge
  [-3, 1.6, -21],   // out on the nave (bare)
  [3, 1.6, -27],    // mid-gust on the route (risk)
  [9, 8.85, -35],   // top of the timed-molt stack (hard detour)
  [4, 1.75, -35],   // far bank edge
  [0, 5.85, -48],   // up on the roof
  [0, 5.6, -65.1],  // on the expert dash+double+molt plank
  [3, 5.6, -68],    // further along the expert route
  [0, 5.75, -76],   // by the goal
]
const MIN_MOMENTS = 5

export function Glasshouse() {
  useEffect(() => {
    useGame.setState({ totalMoments: MOMENTS.length, minMoments: MIN_MOMENTS, moments: 0 })
  }, [])

  return (
    <group>
      {FLOORS.map((f, i) => (
        <Block key={`f${i}`} pos={f.pos} size={f.size} kind={f.kind ?? 'tile'} color={f.color} metalness={f.kind === 'panel' ? 0.35 : 0} roughness={f.kind === 'panel' ? 0.6 : 0.9} />
      ))}
      {STONES_LOW.map((p, i) => (
        <HiddenPlatform key={`lo${i}`} position={p} size={[2.8, 0.3, 2.2]} />
      ))}
      {STONES_STACK.map((p, i) => (
        <HiddenPlatform key={`sk${i}`} position={p} size={[2.8, 0.3, 2.2]} />
      ))}
      {STONES_EX.map((p, i) => (
        <HiddenPlatform key={`ex${i}`} position={p} size={[2.8, 0.3, 2.2]} />
      ))}
      {CHECKPOINTS.map((c) => (
        <Checkpoint key={`cp${c.index}`} index={c.index} position={c.pos} />
      ))}
      {PANES.map((p, i) => (
        <Pane key={`pa${i}`} pos={p.pos} size={p.size} />
      ))}
      {PLANTERS.map((p, i) => (
        <Planter key={`pl${i}`} pos={p} />
      ))}
      {LAMPS.map((l, i) => (
        <Lamp key={`l${i}`} pos={l.pos} color={l.color} />
      ))}
      {NPCS.map((n, i) => (
        <NPC key={`n${i}`} position={n.pos} color={n.color} rot={n.rot} />
      ))}
      {WATER.map((w, i) => (
        <Water key={`w${i}`} pos={w.pos} size={w.size} />
      ))}
      {MOMENTS.map((m, i) => (
        <Collectible key={`m${i}`} position={m} />
      ))}

      <Rain />
      <GustZone position={[1.5, 1.3, -25.5]} size={[5, 2.6, 5]} />
      <Goal position={[0, 5.0, -76]} zoneId="glasshouse" nextId="underhum" />
    </group>
  )
}
