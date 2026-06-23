import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { SceneRig } from './SceneRig'
import { Player } from './Player'
import { PostFX } from './PostFX'
import { Particles } from './Particles'
import { Controls } from './Controls'
import { TrendMile } from '../zones/TrendMile'
import { Glasshouse } from '../zones/Glasshouse'
import type { Checkpoint } from './Player'
import { useGame } from '../game/store'

type Cfg = {
  skyTop: string
  skyBottom: string
  fog: string
  sun: string
  spawn: [number, number, number]
  killY: number
  checkpoints: Checkpoint[]
}

const CFG: Record<string, Cfg> = {
  'trend-mile': {
    skyTop: '#a9c8e6', skyBottom: '#f7e6cf', fog: '#f0e1c9', sun: '#fff1d6',
    spawn: [0, 1.4, 12], killY: -7,
    checkpoints: [
      { when: (p) => p.z < -16, at: [0, 2.2, -19] }, // R1 rest (after the intro hops)
      { when: (p) => p.x > 6, at: [9, 3.4, -29.5] }, // E1 scaffold (after the dash gap + double-jump)
      { when: (p) => p.x > 13, at: [16, 1.7, -39] }, // E2 (after the drop)
      { when: (p) => p.z < -42, at: [6, 2.2, -45] }, // E3 (before the mid-air switch)
      { when: (p) => p.z < -64, at: [0, 2.2, -67] }, // C1 rest (after the hidden walkway)
    ],
  },
  'glasshouse': {
    skyTop: '#1d9e75', skyBottom: '#c2d9db', fog: '#bcd6d4', sun: '#eafff6',
    spawn: [0, 1.4, 10], killY: -3,
    checkpoints: [
      { when: (p) => p.z < -12, at: [3, 1.5, -17] }, // G3 (before the flooded nave + gust)
      { when: (p) => p.z < -38, at: [0, 1.5, -41] }, // far bank (after the nave)
      { when: (p) => p.z < -49, at: [6, 6.7, -52] }, // glass roof walkway
      { when: (p) => p.z < -72, at: [5, 6.5, -75] }, // high far bank (by the goal)
    ],
  },
}

export function Game() {
  const zoneId = useGame((s) => s.zoneId) || 'trend-mile'
  const cfg = CFG[zoneId] || CFG['trend-mile']

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: 62, near: 0.1, far: 220, position: [0, 4, 16] }}
    >
      <SceneRig skyTop={cfg.skyTop} skyBottom={cfg.skyBottom} fog={cfg.fog} sun={cfg.sun} />
      <Suspense>
        <Physics gravity={[0, -26, 0]}>
          {zoneId === 'trend-mile' && <TrendMile />}
          {zoneId === 'glasshouse' && <Glasshouse />}
          <Player spawn={cfg.spawn} killY={cfg.killY} checkpoints={cfg.checkpoints} />
        </Physics>
      </Suspense>
      <Particles />
      <PostFX />
      <Controls />
    </Canvas>
  )
}
