import { useEffect } from 'react'
import { RigidBody } from '@react-three/rapier'
import { useGame } from '../game/store'
import { Collectible } from '../components/Collectible'
import { HiddenPlatform } from '../components/HiddenPlatform'
import { GustZone } from '../components/GustZone'
import { NPC } from '../components/NPC'
import { Goal } from '../components/Goal'

type V3 = [number, number, number]

function Slab({ pos, size, color = '#efe3d2' }: { pos: V3; size: V3; color?: string }) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={pos}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.94} />
      </mesh>
    </RigidBody>
  )
}

function Pillar({ pos, banner }: { pos: V3; banner: string }) {
  return (
    <group position={pos}>
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[0.8, 3, 0.8]} />
        <meshStandardMaterial color="#f6ecdc" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.7, 0.42]}>
        <boxGeometry args={[0.7, 1.1, 0.06]} />
        <meshStandardMaterial color={banner} emissive={banner} emissiveIntensity={0.5} roughness={0.5} />
      </mesh>
    </group>
  )
}

const SLABS: { pos: V3; size: V3; color?: string }[] = [
  { pos: [0, -0.25, 8.5], size: [24, 0.5, 33] },
  { pos: [0, -0.25, -22.5], size: [24, 0.5, 17] },
  { pos: [8, 1.45, -35], size: [4.5, 0.5, 4.5], color: '#f2dcc6' },
  { pos: [0, 0.6, -32], size: [6, 0.5, 4], color: '#f0e2cf' },
  { pos: [3.5, 1.45, -35], size: [5, 0.5, 4], color: '#f0e2cf' },
  { pos: [-1, 2.3, -38], size: [5, 0.5, 4], color: '#f0e2cf' },
  { pos: [0, 3.15, -42], size: [9, 0.5, 9], color: '#f3e7d6' },
]

const CURBS: { pos: V3; size: V3 }[] = [
  { pos: [11.8, 1.35, 8.5], size: [0.4, 2.7, 33] },
  { pos: [-11.8, 1.35, 8.5], size: [0.4, 2.7, 33] },
  { pos: [11.8, 1.35, -22.5], size: [0.4, 2.7, 17] },
  { pos: [-11.8, 1.35, -22.5], size: [0.4, 2.7, 17] },
]

// Bare-only stepping stones bridging the 6-wide gap (z -8 .. -14).
const STONES: V3[] = [
  [0, -0.15, -9],
  [0, -0.15, -10.4],
  [0, -0.15, -11.8],
  [0, -0.15, -13.2],
]

const PILLARS: { pos: V3; banner: string }[] = [
  { pos: [9, 0, 16], banner: '#FF6B9D' },
  { pos: [-9, 0, 16], banner: '#FFD24A' },
  { pos: [9, 0, 2], banner: '#A8E6CF' },
  { pos: [-9, 0, 2], banner: '#F5B68C' },
  { pos: [9, 0, -22], banner: '#FF6B9D' },
  { pos: [-9, 0, -26], banner: '#FFD24A' },
]

const NPCS: { pos: V3; color: string; rot: number }[] = [
  { pos: [4, 0, 6], color: '#FF6B9D', rot: 2.6 },
  { pos: [-4, 0, 8], color: '#FFD24A', rot: -2.0 },
  { pos: [6, 0, 12], color: '#F5B68C', rot: 3.0 },
  { pos: [-6, 0, 3], color: '#A8E6CF', rot: 0.5 },
  { pos: [2, 0, 14], color: '#B8B0A8', rot: 3.1 },
  { pos: [-2, 0, 0], color: '#FF6B9D', rot: -1.0 },
  { pos: [5, 0, -22], color: '#FFD24A', rot: 2.2 },
  { pos: [-5, 0, -27], color: '#F5B68C', rot: -0.6 },
]

const MOMENTS: V3[] = [
  [6, 1, 4],
  [-7, 1, -2],
  [3, 1, -6],
  [0, 1, -11.8],
  [-6, 1, -23],
  [7, 1, -27],
  [8, 2.4, -35],
  [0, 4, -42],
]

export function TrendMile() {
  useEffect(() => {
    useGame.setState({ totalMoments: MOMENTS.length, moments: 0 })
  }, [])

  return (
    <group>
      {SLABS.map((s, i) => (
        <Slab key={`s${i}`} pos={s.pos} size={s.size} color={s.color} />
      ))}
      {CURBS.map((c, i) => (
        <Slab key={`c${i}`} pos={c.pos} size={c.size} color="#e7b896" />
      ))}
      {STONES.map((p, i) => (
        <HiddenPlatform key={`st${i}`} position={p} />
      ))}
      {PILLARS.map((p, i) => (
        <Pillar key={`p${i}`} pos={p.pos} banner={p.banner} />
      ))}
      {NPCS.map((n, i) => (
        <NPC key={`n${i}`} position={n.pos} color={n.color} rot={n.rot} />
      ))}
      {MOMENTS.map((m, i) => (
        <Collectible key={`m${i}`} position={m} />
      ))}

      <GustZone position={[8, 2.6, -35]} size={[4.5, 2.6, 4.5]} />
      <Goal position={[0, 3.4, -42]} zoneId="trend-mile" nextId="glasshouse" />
    </group>
  )
}
