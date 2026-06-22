import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { Collectible } from '../components/Collectible'
import { HiddenPlatform } from '../components/HiddenPlatform'
import { GustZone } from '../components/GustZone'
import { NPC } from '../components/NPC'
import { Goal } from '../components/Goal'

type V3 = [number, number, number]

// --- local building blocks (the only solid things are Slab + HiddenPlatform) ---

function Slab({ pos, size, color = '#cfe3da' }: { pos: V3; size: V3; color?: string }) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={pos}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </RigidBody>
  )
}

// A pane of the greenhouse. Decorative, no collider; the curbs do the containing.
function GlassPanel({ pos, size }: { pos: V3; size: V3 }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color="#bfe6dc"
        emissive="#1d9e75"
        emissiveIntensity={0.08}
        transparent
        opacity={0.16}
        roughness={0.05}
        metalness={0.2}
        depthWrite={false}
      />
    </mesh>
  )
}

function Planter({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1.2, 0.6, 1.2]} />
        <meshStandardMaterial color="#6f6e69" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshStandardMaterial color="#1d9e75" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.34, 1.15, 0.12]}>
        <sphereGeometry args={[0.34, 10, 10]} />
        <meshStandardMaterial color="#0f6e56" roughness={0.85} />
      </mesh>
    </group>
  )
}

// Flooded floor. A translucent, faintly rippling surface with no collider, so
// you fall through it (the kill-plane below catches you) unless you're bare and
// walking the hidden water-routes laid just above it.
function Water({ pos, size }: { pos: V3; size: V3 }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (mat.current) mat.current.emissiveIntensity = 0.18 + Math.sin(performance.now() * 0.0015) * 0.07
  })
  return (
    <mesh position={pos} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        ref={mat}
        color="#2a7d8c"
        emissive="#1d9e75"
        emissiveIntensity={0.2}
        transparent
        opacity={0.55}
        roughness={0.18}
        metalness={0.1}
        depthWrite={false}
      />
    </mesh>
  )
}

// Zone-wide rain. Purely atmospheric; recycled streaks falling through the atrium.
function Rain() {
  const group = useRef<THREE.Group>(null)
  const drops = useMemo(
    () =>
      Array.from({ length: 120 }, () => ({
        x: (Math.random() - 0.5) * 22,
        y: Math.random() * 14,
        z: 16 - Math.random() * 90,
        len: 0.45 + Math.random() * 0.6,
        spd: 9 + Math.random() * 7,
      })),
    []
  )
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    g.children.forEach((c, i) => {
      c.position.y -= drops[i].spd * dt
      if (c.position.y < -1) c.position.y = 14
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

// === The Glasshouse: zone 2 ===
// Assumes everything Trend Mile taught (jump, dash, molt, gusts) and turns the
// screw. The twist: the suit can't cross water at all. Y is up; a Slab at
// pos.y -0.25 size.y 0.5 has its top at y = 0. Progress runs toward -z.
//   spawn  a quick dash-jump recap over a dry gap
//   CP1    the flooded nave: a 14 m channel only the bare can cross, on water-
//          routes the suit can neither see nor stand on (inverts Trend Mile)
//   CP2    re-suit and climb up onto the high glass roof (double-jump power)
//   CP3    a SECOND water route, now elevated, where a fall costs much more

const SLABS: { pos: V3; size: V3; color?: string }[] = [
  // Entry plaza. Full-corridor width near spawn (matches the curbs).
  { pos: [0, -0.25, 9], size: [24, 0.5, 14] },        // z 2..16, top 0
  // Plaza B, across a 6 m dry gap (dash recap).
  { pos: [0, -0.25, -8], size: [12, 0.5, 8] },        // z -12..-4, top 0
  // Far bank, reached only on the bare-only water-routes across the nave.
  { pos: [0, -0.25, -30], size: [12, 0.5, 8] },       // z -34..-26, top 0
  // Gust ledge (a rain squall) off the side of the far bank.
  { pos: [9, -0.25, -30], size: [4, 0.5, 4] },        // z -32..-28, top 0
  // Climb up to the high glass roof (rise ~1.7 steps; bare can't make them).
  { pos: [0, 1.45, -36], size: [10, 0.5, 4], color: '#cadfd6' },  // z -38..-34, top 1.7
  { pos: [-2, 2.6, -40], size: [8, 0.5, 4], color: '#cadfd6' },   // z -42..-38, top 2.85
  // Elevated walkway D, on the roof.
  { pos: [0, 3.6, -46], size: [12, 0.5, 8], color: '#d6ece4' },   // z -50..-42, top 3.85
  // Far elevated bank E (the goal terrace).
  { pos: [0, 3.6, -67], size: [12, 0.5, 10], color: '#d6ece4' },  // z -72..-62, top 3.85
]

// Glass side walls: one run for the lower atrium, one for the high roof.
const CURBS: { pos: V3; size: V3 }[] = [
  { pos: [11.8, 1.5, -9], size: [0.4, 3, 52] },        // lower: z 17..-35
  { pos: [-11.8, 1.5, -9], size: [0.4, 3, 52] },
  { pos: [11.8, 5.35, -57], size: [0.4, 3, 32] },      // roof: z -41..-73
  { pos: [-11.8, 5.35, -57], size: [0.4, 3, 32] },
]

// Bare-only water-routes. The lower nave (top 0, z -12..-26) and the elevated
// roof channel (top 3.85, z -50..-62). Invisible and non-solid while suited.
const STONES_LOW: V3[] = [
  [0, -0.15, -13.0],
  [0.7, -0.15, -14.4],
  [-0.7, -0.15, -15.8],
  [0.7, -0.15, -17.2],
  [-0.7, -0.15, -18.6],
  [0.7, -0.15, -20.0],
  [-0.7, -0.15, -21.4],
  [0.7, -0.15, -22.8],
  [-0.7, -0.15, -24.2],
  [0, -0.15, -25.6],
]
const STONES_HIGH: V3[] = [
  [0, 3.7, -51.0],
  [0.7, 3.7, -52.4],
  [-0.7, 3.7, -53.8],
  [0.7, 3.7, -55.2],
  [-0.7, 3.7, -56.6],
  [0.7, 3.7, -58.0],
  [-0.7, 3.7, -59.4],
  [0, 3.7, -60.8],
]

const GLASS: { pos: V3; size: V3 }[] = [
  { pos: [11.9, 3, -6], size: [0.2, 6, 24] },
  { pos: [-11.9, 3, -6], size: [0.2, 6, 24] },
  { pos: [11.9, 6.4, -57], size: [0.2, 5, 32] },
  { pos: [-11.9, 6.4, -57], size: [0.2, 5, 32] },
]

const PLANTERS: V3[] = [
  [8, 0, 12],
  [-8, 0, 5],
  [8, 0, -28],
  [-8, 0, -32],
]

const NPCS: { pos: V3; color: string; rot: number }[] = [
  { pos: [4, 0, 11], color: '#A8E6CF', rot: 2.7 },
  { pos: [-5, 0, 7], color: '#c2d9db', rot: -1.4 },
  { pos: [-4, 0, -29], color: '#1d9e75', rot: 0.8 },
]

const WATER: { pos: V3; size: V3 }[] = [
  { pos: [0, -0.7, -19], size: [22, 0.2, 15] },   // the flooded nave
  { pos: [0, -0.7, -2], size: [16, 0.2, 5] },     // under the dry-gap recap
  { pos: [0, 3.15, -55.9], size: [22, 0.2, 13] }, // pooled on the high glass roof
]

const MOMENTS: V3[] = [
  [5, 1, 7],          // plaza
  [-5, 1, 3],         // plaza
  [4, 1, -8],         // plaza B
  [0.7, 1, -15.8],    // out on the nave water-route
  [-0.7, 1, -21.4],   // further along the nave
  [5, 1, -29],        // far bank
  [9, 1, -30],        // on the gust ledge (risk/reward)
  [0.7, 4.85, -53.8], // out on the elevated water-route
  [-0.7, 4.85, -58.0],// further along the high route
  [5, 4.85, -66],     // by the goal terrace
]

export function Glasshouse() {
  useEffect(() => {
    useGame.setState({ totalMoments: MOMENTS.length, moments: 0 })
  }, [])

  return (
    <group>
      {SLABS.map((s, i) => (
        <Slab key={`s${i}`} pos={s.pos} size={s.size} color={s.color} />
      ))}
      {CURBS.map((c, i) => (
        <Slab key={`c${i}`} pos={c.pos} size={c.size} color="#9fc7bc" />
      ))}
      {STONES_LOW.map((p, i) => (
        <HiddenPlatform key={`lo${i}`} position={p} size={[2.4, 0.3, 1.8]} />
      ))}
      {STONES_HIGH.map((p, i) => (
        <HiddenPlatform key={`hi${i}`} position={p} size={[2.4, 0.3, 1.8]} />
      ))}
      {GLASS.map((g, i) => (
        <GlassPanel key={`g${i}`} pos={g.pos} size={g.size} />
      ))}
      {PLANTERS.map((p, i) => (
        <Planter key={`pl${i}`} pos={p} />
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
      <GustZone position={[9, 1.3, -30]} size={[4, 2.6, 4]} />
      <Goal position={[0, 4.0, -67]} zoneId="glasshouse" nextId="underhum" />
    </group>
  )
}
