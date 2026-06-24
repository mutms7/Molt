import { useEffect, useMemo } from 'react'
import { useGame } from '../game/store'
import { Block, Lamp, Crate, type V3 } from '../components/Blocks'
import { tiled } from '../components/textures'
import { Collectible } from '../components/Collectible'
import { HiddenPlatform } from '../components/HiddenPlatform'
import { NPC } from '../components/NPC'
import { Goal } from '../components/Goal'
import { Checkpoint } from '../components/Checkpoint'

function Pillar({ pos, banner }: { pos: V3; banner: string }) {
  const tex = useMemo(() => tiled('panel', '#f1e6d6', 1, 2.4), [])
  return (
    <group position={pos}>
      <mesh castShadow position={[0, 1.6, 0]}>
        <boxGeometry args={[0.7, 3.2, 0.7]} />
        <meshStandardMaterial map={tex.map} bumpMap={tex.bump} bumpScale={0.05} roughness={0.8} metalness={0.15} />
      </mesh>
      <mesh position={[0, 2.8, 0.4]}>
        <boxGeometry args={[0.62, 1.2, 0.06]} />
        <meshStandardMaterial color={banner} emissive={banner} emissiveIntensity={0.6} roughness={0.45} />
      </mesh>
    </group>
  )
}

// === The Trend Mile: the tutorial obby ===
// Teaches exactly two ideas and never needs a dash: the molt switch (suited =
// reach and double-jump, bare = the hidden planks appear) and the double-jump.
// Movement is floaty now (gentle gravity), so there is real airtime to switch.
// Y is up; a Block at y -0.25 size.y 0.5 has its top at y = 0. The course leaps
// up, crosses on bare-only planks, climbs, and ends at a goal up high and to the
// side. Budget: suited single up ~3.5 / flat ~8, double up ~7, bare flat ~4.6.
//   spawn  a tall leap that a single jump cannot make: the DOUBLE-JUMP, up onto A1
//   CP1    molt to BARE; the descending planks only exist for the bare eye
//   CP2    molt to SUIT; a 6 m gap bare cannot cross (suit = reach)
//   CP3    launch suited and molt to bare in the AIR to land on a hidden plank
//   CP4    a turning tower of double-jumps to the offset, high goal

const FLOORS: { pos: V3; size: V3; kind?: 'tile' | 'panel'; color?: string }[] = [
  { pos: [0, -0.25, 12], size: [24, 0.5, 16], color: '#efe3d2' },     // PLAZA top0 (wide for the wall test)
  { pos: [0, 4.05, 1], size: [9, 0.5, 6], color: '#f2e7d6' },         // A1 top4.3 (double-jump up)
  { pos: [0, 1.25, -14], size: [10, 0.5, 6], color: '#f2e7d6' },      // B1 top1.5 (after the bare planks)
  { pos: [0, 1.25, -26], size: [8, 0.5, 6], color: '#f2e7d6' },       // C1 top1.5 (after the 6 m suited gap)
  { pos: [0, 1.25, -44], size: [9, 0.5, 6], color: '#f2e7d6' },       // F1 top1.5 (after the mid-air molt)
  { pos: [-6, 5.05, -46], size: [5, 0.5, 4], kind: 'panel', color: '#a9b3bd' }, // T1 tower top5.3
  { pos: [-6, 8.85, -50], size: [5, 0.5, 4], kind: 'panel', color: '#a9b3bd' }, // T2 tower top9.1
  { pos: [4, 9.35, -54], size: [9, 0.5, 8], color: '#f5ead9' },       // GOAL terrace top9.6 (offset, high)
]

// Tall curbs by the spawn so the (now floaty) jump cannot clear them; the wall
// test presses one. The rest is open obby (a fall costs one checkpoint).
const CURBS: { pos: V3; size: V3 }[] = [
  { pos: [11.8, 3, 12], size: [0.4, 6, 16] },
  { pos: [-11.8, 3, 12], size: [0.4, 6, 16] },
]

// Bare-only planks: a gentle descending run (seg 2) and the mid-air-molt run (seg 4).
const STONES: V3[] = [
  [0, 3.35, -4],     // descending from A1
  [-2.5, 2.55, -7],
  [0, 1.85, -10],
  [0, 1.35, -34.1],  // mid-air-molt landing (reach it suited, molt bare in the air)
  [2.5, 1.35, -37],
  [0, 1.35, -40],
]

const CHECKPOINTS: { index: number; pos: V3 }[] = [
  { index: 0, pos: [3, 4.3, 1] },     // A1
  { index: 1, pos: [3.5, 1.5, -14] }, // B1
  { index: 2, pos: [3, 1.5, -26] },   // C1
  { index: 3, pos: [3.5, 1.5, -44] }, // F1
]

const PILLARS: { pos: V3; banner: string }[] = [
  { pos: [9, 0, 17], banner: '#FF6B9D' },
  { pos: [-9, 0, 17], banner: '#FFD24A' },
  { pos: [9, 0, 6], banner: '#A8E6CF' },
  { pos: [-9, 0, 6], banner: '#F5B68C' },
]

const LAMPS: { pos: V3; color: string }[] = [
  { pos: [4, 0, 6], color: '#ffe6a0' },
  { pos: [-3, 1.5, -14], color: '#ffd24a' },
  { pos: [-3, 1.5, -26], color: '#a8e6cf' },
  { pos: [3, 1.5, -44], color: '#ffe6a0' },
]

const CRATES: V3[] = [
  [-6, 0.45, 15],
  [-5.2, 0.45, 14.3],
  [-6, 1.7, -14],
]

const NPCS: { pos: V3; color: string; rot: number }[] = [
  { pos: [4, 0, 14], color: '#FF6B9D', rot: 2.6 },
  { pos: [-5, 0, 11], color: '#FFD24A', rot: -2.0 },
  { pos: [6, 0, 10], color: '#A8E6CF', rot: 3.0 },
]

// Fewer gimmes; most of these ask for a detour, a molt, or the climb.
const MOMENTS: V3[] = [
  [9, 1.0, 17],      // plaza far corner (detour)
  [-9, 1.0, 6],      // plaza far corner (detour)
  [3.5, 5.3, 1],     // edge of A1
  [-2.5, 3.7, -7],   // out on a descending bare plank
  [5, 2.5, -14],     // far edge of B1
  [0, 2.5, -34.1],   // on the mid-air-molt plank (needs the molt to reach)
  [2.5, 2.5, -37],   // further along that bare run
  [-6, 6.3, -46],    // up the tower
  [-6, 10.1, -50],   // higher up the tower
]
const MIN_MOMENTS = 4

export function TrendMile() {
  useEffect(() => {
    useGame.setState({ totalMoments: MOMENTS.length, minMoments: MIN_MOMENTS, moments: 0 })
  }, [])

  return (
    <group>
      {FLOORS.map((f, i) => (
        <Block key={`f${i}`} pos={f.pos} size={f.size} kind={f.kind ?? 'tile'} color={f.color} metalness={f.kind === 'panel' ? 0.35 : 0} roughness={f.kind === 'panel' ? 0.6 : 0.92} />
      ))}
      {CURBS.map((c, i) => (
        <Block key={`c${i}`} pos={c.pos} size={c.size} kind="panel" color="#e7b896" metalness={0.2} roughness={0.7} />
      ))}
      {STONES.map((p, i) => (
        <HiddenPlatform key={`st${i}`} position={p} size={[2.8, 0.3, 2.2]} />
      ))}
      {CHECKPOINTS.map((c) => (
        <Checkpoint key={`cp${c.index}`} index={c.index} position={c.pos} />
      ))}
      {PILLARS.map((p, i) => (
        <Pillar key={`p${i}`} pos={p.pos} banner={p.banner} />
      ))}
      {LAMPS.map((l, i) => (
        <Lamp key={`l${i}`} pos={l.pos} color={l.color} />
      ))}
      {CRATES.map((p, i) => (
        <Crate key={`cr${i}`} pos={p} />
      ))}
      {NPCS.map((n, i) => (
        <NPC key={`n${i}`} position={n.pos} color={n.color} rot={n.rot} />
      ))}
      {MOMENTS.map((m, i) => (
        <Collectible key={`m${i}`} position={m} />
      ))}

      <Goal position={[4, 10.0, -54]} zoneId="trend-mile" nextId="glasshouse" />
    </group>
  )
}
