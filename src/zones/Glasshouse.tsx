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

// A planter with textured soil and foliage.
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
      <mesh castShadow position={[-0.3, 1.15, -0.1]}>
        <sphereGeometry args={[0.3, 10, 10]} />
        <meshStandardMaterial color="#27b487" roughness={0.85} />
      </mesh>
    </group>
  )
}

// Flooded floor: textured caustics, no collider, so you fall through unless you
// are bare on the hidden water-routes laid just above it.
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

// Zone-wide rain, atmospheric only.
function Rain() {
  const group = useRef<THREE.Group>(null)
  const drops = useMemo(
    () =>
      Array.from({ length: 140 }, () => ({
        x: (Math.random() - 0.5) * 26,
        y: Math.random() * 16,
        z: 16 - Math.random() * 100,
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

// === The Glasshouse: the escalation obby ===
// Assumes everything Trend Mile taught and combines it under rain. The twist
// stands: the suit cannot cross water, so the only ways over are bare-only
// water-routes you must reach by molting in mid-air. Y is up; tops at y = 0
// unless noted. Multi-directional, climbs onto a high glass roof, goal offset.
//   spawn  weaving hops + a 5.5 m dash recap
//   CP1    launch suited, molt to BARE mid-air onto the flooded nave, then
//          cross a rain GUST on the water-route before it forces a re-suit
//   CP2    re-suit and climb +x up onto the glass roof
//   CP3    a SECOND, elevated mid-air switch onto a roof water-route
//   CP4    land on the high far bank and reach the goal

const FLOORS: { pos: V3; size: V3; kind?: 'tile' | 'panel'; color?: string }[] = [
  { pos: [0, -0.25, 10], size: [22, 0.5, 14], color: '#cfe3da' },     // PLAZA top0 (wide)
  { pos: [-3, 0.5, -1], size: [5, 0.5, 4], color: '#bcdcd0' },        // G1 top0.75
  { pos: [3, 0.5, -7], size: [5, 0.5, 4], color: '#bcdcd0' },         // G2 top0.75
  { pos: [3, 0.5, -17], size: [6, 0.5, 5], color: '#c6e0d6' },        // G3 top0.75 (CP1, after 5.5 m gap)
  { pos: [0, 0.5, -41], size: [10, 0.5, 6], color: '#cfe3da' },       // FB far bank top0.75 (CP2)
  { pos: [6, 2.4, -42], size: [5, 0.5, 4], kind: 'panel', color: '#9fb8ad' }, // R1 step top2.65
  { pos: [11, 4.3, -46], size: [5, 0.5, 4], kind: 'panel', color: '#9fb8ad' }, // R2 step top4.55
  { pos: [6, 5.6, -52], size: [10, 0.5, 7], kind: 'panel', color: '#bcd6cc' },  // ROOF walkway top5.85 (CP3)
  { pos: [5, 5.6, -75], size: [10, 0.5, 9], color: '#d6ece4' },       // GBANK goal terrace top5.85 (CP4)
]

const STONES_LOW: V3[] = [
  [3, 0.45, -24],   // W1 (reached by the mid-air switch, straight off G3)
  [0, 0.45, -27],   // W2
  [3, 0.45, -30],   // W3 (in the gust)
  [0, 0.45, -33],   // W4 (in the gust)
  [3, 0.45, -36],   // W5
]
const STONES_HIGH: V3[] = [
  [6, 5.7, -60],    // EW1 (elevated mid-air switch, straight off the roof)
  [2, 5.7, -63],    // EW2
  [6, 5.7, -66],    // EW3
  [5, 5.7, -69],    // EW4
]

const PANES: { pos: V3; size: V3 }[] = [
  { pos: [11.4, 3, -6], size: [0.25, 6, 26] },
  { pos: [-11.4, 3, -6], size: [0.25, 6, 26] },
  { pos: [11.4, 6.6, -60], size: [0.25, 5, 30] },
  { pos: [-1, 6.6, -60], size: [0.25, 5, 30] },
]

const PLANTERS: V3[] = [
  [8, 0, 12],
  [-8, 0, 5],
  [-4, 0.75, -41],
  [4, 0.75, -41],
]

const LAMPS: { pos: V3; color: string }[] = [
  { pos: [3, 0.75, -17], color: '#a8e6cf' },
  { pos: [0, 0.75, -41], color: '#eafff6' },
  { pos: [6, 5.85, -52], color: '#a8e6cf' },
  { pos: [5, 5.85, -75], color: '#eafff6' },
]

const NPCS: { pos: V3; color: string; rot: number }[] = [
  { pos: [4, 0, 11], color: '#A8E6CF', rot: 2.7 },
  { pos: [-5, 0, 7], color: '#c2d9db', rot: -1.4 },
]

const WATER: { pos: V3; size: V3 }[] = [
  { pos: [0, -0.7, -30], size: [22, 0.2, 18] }, // the flooded nave
  { pos: [0, -0.7, -11], size: [16, 0.2, 8] },  // under the dry dash-gap
  { pos: [3, 5.05, -64], size: [22, 0.2, 16] }, // pooled on the high glass roof
]

const MOMENTS: V3[] = [
  [4, 1.0, 8],      // plaza
  [-4, 1.0, 4],     // plaza
  [3, 1.75, -17],   // G3
  [3, 1.6, -24],    // out on the nave water-route (bare)
  [3, 1.6, -30],    // mid-gust on the route (risk)
  [0, 1.75, -41],   // far bank
  [11, 5.55, -46],  // up the climb (optional)
  [6, 6.85, -60],   // elevated water-route (bare)
  [2, 6.85, -63],   // elevated water-route
  [5, 6.85, -69],   // elevated water-route
  [5, 6.85, -75],   // by the goal
]

export function Glasshouse() {
  useEffect(() => {
    useGame.setState({ totalMoments: MOMENTS.length, moments: 0 })
  }, [])

  return (
    <group>
      {FLOORS.map((f, i) => (
        <Block key={`f${i}`} pos={f.pos} size={f.size} kind={f.kind ?? 'tile'} color={f.color} metalness={f.kind === 'panel' ? 0.35 : 0} roughness={f.kind === 'panel' ? 0.6 : 0.9} />
      ))}
      {STONES_LOW.map((p, i) => (
        <HiddenPlatform key={`lo${i}`} position={p} size={[2.8, 0.3, 2.2]} />
      ))}
      {STONES_HIGH.map((p, i) => (
        <HiddenPlatform key={`hi${i}`} position={p} size={[2.8, 0.3, 2.2]} />
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
      <GustZone position={[1.5, 1.3, -31.5]} size={[5, 2.6, 5]} />
      <Goal position={[5, 6.1, -75]} zoneId="glasshouse" nextId="underhum" />
    </group>
  )
}
