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

// === The Trend Mile: the teaching zone ===
// A long glossy promenade that introduces one idea at a time. Y is up; a Slab
// at pos.y -0.25 size.y 0.5 has its top at y = 0 ("ground"). Progress runs
// toward -z. The arc, with three checkpoints along the way:
//   spawn  walk the promenade, hop a small 2.2 m gap (jump)
//   CP1    dash-jump a 6 m gap nothing else clears (the suit's power)
//   CP2    a gap only bare can cross, on stepping stones the suit can't see
//          (the molt reveal) + moments to notice while bare
//   CP3    a gust ledge (bare drains; empty = a gentle re-suit) then re-suit
//          and climb out to the goal (double-jump power)

const SLABS: { pos: V3; size: V3; color?: string }[] = [
  // Promenade A (walk). Kept full-corridor width (x +-12) so the headless
  // wall-collision test can press the curb near the spawn.
  { pos: [0, -0.25, 12], size: [24, 0.5, 16] },        // z 4..20, top 0
  // Plaza B, across a small 2.2 m gap (teach jump).
  { pos: [0, -0.25, -3.1], size: [16, 0.5, 9.8] },     // z -8..1.8, top 0
  // Platform C, across a 6 m gap (teach dash; a plain jump falls short).
  { pos: [0, -0.25, -18.5], size: [14, 0.5, 9] },      // z -23..-14, top 0
  // Platform D, reached only on the bare-only stones below.
  { pos: [0, -0.25, -35.5], size: [14, 0.5, 9] },      // z -40..-31, top 0
  // Gust ledge off the side of D (risk/reward moment).
  { pos: [9, -0.25, -36], size: [4, 0.5, 4] },         // z -38..-34, top 0
  // Finale climb: tall steps (rise ~1.7) that bare can't make.
  { pos: [0, 1.45, -42], size: [12, 0.5, 4], color: '#f3e7d6' },  // z -44..-40, top 1.7
  { pos: [2, 2.6, -46], size: [8, 0.5, 4], color: '#f3e7d6' },    // z -48..-44, top 2.85
  { pos: [-1, 3.7, -50], size: [8, 0.5, 4], color: '#f3e7d6' },   // z -52..-48, top 3.95
  { pos: [0, 4.6, -57], size: [14, 0.5, 10], color: '#f5ead9' },  // z -62..-52, top 4.85 (terrace)
]

// Glass curbs that contain the ground-level run.
const CURBS: { pos: V3; size: V3 }[] = [
  { pos: [11.8, 1.35, -10], size: [0.4, 2.7, 62] },
  { pos: [-11.8, 1.35, -10], size: [0.4, 2.7, 62] },
]

// Bare-only stepping stones bridging the 8 m gap (z -23 .. -31). Invisible and
// non-solid while suited, so the suit simply cannot get across here.
const STONES: V3[] = [
  [0, -0.15, -23.8],
  [0.7, -0.15, -25.0],
  [-0.7, -0.15, -26.2],
  [0.7, -0.15, -27.4],
  [-0.7, -0.15, -28.6],
  [0.7, -0.15, -29.8],
  [0, -0.15, -31.0],
]

const PILLARS: { pos: V3; banner: string }[] = [
  { pos: [9, 0, 16], banner: '#FF6B9D' },
  { pos: [-9, 0, 16], banner: '#FFD24A' },
  { pos: [9, 0, 6], banner: '#A8E6CF' },
  { pos: [-9, 0, 6], banner: '#F5B68C' },
  { pos: [9, 0, -4], banner: '#FF6B9D' },
  { pos: [-9, 0, -1], banner: '#FFD24A' },
]

const NPCS: { pos: V3; color: string; rot: number }[] = [
  { pos: [4, 0, 14], color: '#FF6B9D', rot: 2.6 },
  { pos: [-4, 0, 11], color: '#FFD24A', rot: -2.0 },
  { pos: [6, 0, 8], color: '#F5B68C', rot: 3.0 },
  { pos: [-6, 0, 5], color: '#A8E6CF', rot: 0.5 },
  { pos: [3, 0, 0], color: '#B8B0A8', rot: 3.1 },
  { pos: [-3, 0, -5], color: '#FF6B9D', rot: -1.0 },
  { pos: [5, 0, -19], color: '#FFD24A', rot: 2.2 },
  { pos: [-5, 0, -36], color: '#F5B68C', rot: -0.6 },
]

const MOMENTS: V3[] = [
  [6, 1, 15],       // promenade
  [-7, 1, 9],       // promenade
  [5, 1, -2],       // plaza B
  [-5, 1, -6],      // plaza B
  [0, 1, -26.2],    // out on the bare-only stones
  [0.7, 1, -28.6],  // further along the stones
  [6, 1, -34],      // platform D
  [9, 1, -36],      // on the gust ledge (risk/reward)
  [-6, 1, -38],     // platform D
  [0, 5.35, -57],   // the terrace by the goal
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
        <HiddenPlatform key={`st${i}`} position={p} size={[2.4, 0.3, 1.8]} />
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

      <GustZone position={[9, 1.3, -36]} size={[4, 2.6, 4]} />
      <Goal position={[0, 5.0, -57]} zoneId="trend-mile" nextId="glasshouse" />
    </group>
  )
}
