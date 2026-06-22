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
      Array.from({ length: 90 }, () => ({
        x: (Math.random() - 0.5) * 22,
        y: Math.random() * 13,
        z: 13 - Math.random() * 58,
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
      if (c.position.y < -1) c.position.y = 13
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

// --- level data ---
// Y is up; a Slab at pos.y -0.25 size.y 0.5 has its top at y = 0 ("ground").
// Arc: entry plaza (suited) -> dash-jump a dry gap -> the flooded nave, which
// ONLY the bare can cross on hidden water-routes (the twist; inverts Trend Mile,
// where the suit was the way across) -> re-suit and climb out to the goal.

const SLABS: { pos: V3; size: V3; color?: string }[] = [
  { pos: [0, -0.25, 7], size: [16, 0.5, 14] },        // entry plaza (z 0..14)
  { pos: [0, -0.25, -7], size: [10, 0.5, 6] },        // landing after the dry gap (z -4..-10)
  { pos: [0, -0.25, -26], size: [12, 0.5, 8] },       // far bank past the water (z -22..-30)
  { pos: [9, -0.25, -28], size: [4, 0.5, 4] },        // side ledge in the gust (z -26..-30)
  { pos: [0, 1.45, -32], size: [7, 0.5, 4], color: '#cadfd6' },  // climb step 1 (top 1.7)
  { pos: [-2, 2.6, -36], size: [5, 0.5, 4], color: '#cadfd6' },  // climb step 2 (top 2.85)
  { pos: [0, 3.6, -41], size: [9, 0.5, 9], color: '#d6ece4' },   // goal terrace (top 3.85)
]

// Glass side walls that contain the main run.
const CURBS: { pos: V3; size: V3 }[] = [
  { pos: [11.8, 1.5, -8], size: [0.4, 3, 46] },
  { pos: [-11.8, 1.5, -8], size: [0.4, 3, 46] },
]

// Bare-only water-routes across the flooded nave (z -10 .. -22). Invisible and
// non-solid while suited, so suited has no way over the 12 m channel at all.
const STONES: V3[] = [
  [0, -0.15, -10.8],
  [0.5, -0.15, -12.1],
  [0.8, -0.15, -13.4],
  [0.5, -0.15, -14.7],
  [0, -0.15, -16.0],
  [-0.5, -0.15, -17.3],
  [-0.8, -0.15, -18.6],
  [-0.5, -0.15, -19.9],
  [0, -0.15, -21.2],
]

const GLASS: { pos: V3; size: V3 }[] = [
  { pos: [11.9, 3, -4], size: [0.2, 6, 22] },
  { pos: [-11.9, 3, -4], size: [0.2, 6, 22] },
  { pos: [11.9, 3, -27], size: [0.2, 6, 14] },
  { pos: [-11.9, 3, -27], size: [0.2, 6, 14] },
]

const PLANTERS: V3[] = [
  [8, 0, 11],
  [-8, 0, 4],
  [8, 0, -23],
  [-8, 0, -29],
]

const NPCS: { pos: V3; color: string; rot: number }[] = [
  { pos: [4, 0, 10], color: '#A8E6CF', rot: 2.7 },
  { pos: [-5, 0, 6], color: '#c2d9db', rot: -1.4 },
  { pos: [-4, 0, -25], color: '#1d9e75', rot: 0.8 },
]

const WATER: { pos: V3; size: V3 }[] = [
  { pos: [0, -0.7, -16], size: [22, 0.2, 13] }, // the flooded nave
  { pos: [0, -0.7, -2], size: [16, 0.2, 5] },   // under the dry-gap (it is water too)
]

const MOMENTS: V3[] = [
  [4, 1, 6],         // plaza
  [-5, 1, 2],        // plaza
  [0, 1, -7],        // landing platform
  [0.7, 1, -13.4],   // out on a water-route (bare-only by nature)
  [-0.7, 1, -17.3],  // further along the water-route
  [5, 1, -25],       // far bank
  [9, 1, -28],       // on the gust ledge (risk/reward)
  [0, 4.85, -41],    // by the goal terrace
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
      {STONES.map((p, i) => (
        <HiddenPlatform key={`st${i}`} position={p} />
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
      <GustZone position={[9, 1.3, -28]} size={[4, 2.6, 4]} />
      <Goal position={[0, 4.0, -41]} zoneId="glasshouse" nextId="underhum" />
    </group>
  )
}
