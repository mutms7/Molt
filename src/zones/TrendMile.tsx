import { useEffect, useMemo } from 'react'
import { useGame } from '../game/store'
import { Block, Lamp, Crate, type V3 } from '../components/Blocks'
import { tiled } from '../components/textures'
import { Collectible } from '../components/Collectible'
import { HiddenPlatform } from '../components/HiddenPlatform'
import { GustZone } from '../components/GustZone'
import { NPC } from '../components/NPC'
import { Goal } from '../components/Goal'

// A banner pillar (decorative crowd flavor), now textured.
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
      <mesh position={[0, 3.35, 0]}>
        <boxGeometry args={[0.9, 0.18, 0.9]} />
        <meshStandardMaterial color="#d9c39f" roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  )
}

// === The Trend Mile: the obby tutorial ===
// A glossy promenade rebuilt as a platforming course that introduces one trick
// at a time, weaving left/right and climbing/dropping toward a goal up high and
// off to the side. Y is up; a Block at y -0.25 size.y 0.5 has its top at y = 0.
// Five checkpoints; movement budget (suited dash ~6 m, double-jump ~2 m up,
// bare single ~2.5 m flat) drives every gap.
//   spawn  walk + small weaving hops (jump)
//   CP1    a 5.5 m gap (dash or double-jump) onto a branch
//   CP2/3  up-and-over to a +x scaffold (double-jump), drop, then a -x gap back
//   CP4    launch suited and molt to BARE mid-air to land on a hidden walkway
//   CP5    a gust ledge, then a spiralling tower climb to the goal

const FLOORS: { pos: V3; size: V3; kind?: 'tile' | 'panel'; color?: string }[] = [
  { pos: [0, -0.25, 12], size: [24, 0.5, 16], color: '#efe3d2' },     // PLAZA top0 (wide for the wall test)
  { pos: [-3, 0.25, -0.2], size: [5, 0.5, 4], color: '#ecdcc6' },     // H1 top0.5
  { pos: [3, 0.6, -6.5], size: [5, 0.5, 4], color: '#ecdcc6' },       // H2 top0.85
  { pos: [-3, 0.95, -13], size: [5, 0.5, 4], color: '#ecdcc6' },      // H3 top1.2
  { pos: [0, 0.95, -19], size: [10, 0.5, 6], color: '#f2e7d6' },      // R1 rest top1.2 (CP1)
  { pos: [0, 0.95, -29.5], size: [6, 0.5, 4], color: '#f2e7d6' },     // D1 top1.2 (after 5.5 m gap)
  { pos: [9, 2.95, -29.5], size: [5, 0.5, 5], kind: 'panel', color: '#b9a88f' }, // E1 scaffold top3.2
  { pos: [16, 1.2, -39], size: [5, 0.5, 5], kind: 'panel', color: '#b9a88f' },   // E2 top1.45 (drop)
  { pos: [6, 1.2, -45], size: [5, 0.5, 5], kind: 'panel', color: '#b9a88f' },    // E3 top1.45 (CP3)
  { pos: [0, 0.95, -67], size: [9, 0.5, 6], color: '#f2e7d6' },       // C1 rest top1.2 (CP5)
  { pos: [-8, 0.95, -67], size: [4, 0.5, 4], color: '#e7d8c2' },      // gust ledge top1.2
  { pos: [-7, 3.0, -68], size: [4, 0.5, 4], kind: 'panel', color: '#a9b3bd' },   // T1 tower top3.25
  { pos: [-7, 5.0, -72], size: [4, 0.5, 4], kind: 'panel', color: '#a9b3bd' },   // T2 tower top5.25
  { pos: [-1, 6.6, -76], size: [5, 0.5, 4], kind: 'panel', color: '#a9b3bd' },   // T3 tower top6.85
  { pos: [6, 7.6, -82], size: [8, 0.5, 8], color: '#f5ead9' },        // GOAL terrace top7.85
]

// Just two short curbs by the spawn so the headless wall-collision test can
// press a wall near the start; the rest is open obby (a fall = a checkpoint).
const CURBS: { pos: V3; size: V3 }[] = [
  { pos: [11.8, 1.35, 12], size: [0.4, 2.7, 16] },
  { pos: [-11.8, 1.35, 12], size: [0.4, 2.7, 16] },
]

// The bare-only hidden walkway. You can only reach the first plank by launching
// SUITED (for the distance) and molting to bare in the air so it turns solid.
const STONES: V3[] = [
  [6, 1.05, -52],
  [6, 1.05, -55.5],
  [3, 1.05, -58.5],
  [0, 1.05, -61.5],
]

const PILLARS: { pos: V3; banner: string }[] = [
  { pos: [9, 0, 16], banner: '#FF6B9D' },
  { pos: [-9, 0, 16], banner: '#FFD24A' },
  { pos: [9, 0, 7], banner: '#A8E6CF' },
  { pos: [-9, 0, 7], banner: '#F5B68C' },
]

const LAMPS: { pos: V3; color: string }[] = [
  { pos: [4, 0, 5], color: '#ffe6a0' },
  { pos: [0, 1.2, -19], color: '#ffd24a' },
  { pos: [6, 1.45, -45], color: '#a8e6cf' },
  { pos: [0, 1.2, -67], color: '#ffe6a0' },
]

const CRATES: V3[] = [
  [-5, 0.45, 14],
  [-4.2, 0.45, 13.3],
  [7, 1.65, -39],
  [3.5, 1.45, -67],
]

const NPCS: { pos: V3; color: string; rot: number }[] = [
  { pos: [4, 0, 13], color: '#FF6B9D', rot: 2.6 },
  { pos: [-5, 0, 10], color: '#FFD24A', rot: -2.0 },
  { pos: [6, 0, 9], color: '#A8E6CF', rot: 3.0 },
]

const MOMENTS: V3[] = [
  [6, 1.0, 15],     // plaza
  [-7, 1.0, 9],     // plaza
  [0, 2.2, -19],    // R1 rest
  [16, 2.45, -39],  // E2 rest (the scaffold)
  [6, 2.2, -52],    // on the hidden walkway (bare)
  [6, 2.2, -55.5],  // hidden walkway
  [3, 2.2, -58.5],  // hidden walkway
  [0, 2.2, -61.5],  // hidden walkway
  [-8, 2.2, -67],   // gust ledge (risk/reward)
  [-7, 6.25, -72],  // up the tower
  [6, 8.85, -82],   // the goal terrace
]

export function TrendMile() {
  useEffect(() => {
    useGame.setState({ totalMoments: MOMENTS.length, moments: 0 })
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

      <GustZone position={[-8, 2.3, -67]} size={[4, 2.6, 4]} />
      <Goal position={[6, 8.0, -82]} zoneId="trend-mile" nextId="glasshouse" />
    </group>
  )
}
