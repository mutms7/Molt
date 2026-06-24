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
    spawn: [0, 1.4, 12], killY: -4,
    checkpoints: [
      { when: (p) => p.z < 0, at: [0, 5.3, 1] }, // A1 (after the double-jump up)
      { when: (p) => p.z < -12, at: [0, 2.5, -14] }, // B1 (after the bare planks)
      { when: (p) => p.z < -23, at: [0, 2.5, -26] }, // C1 (after the 6 m suited gap)
      { when: (p) => p.z < -42, at: [0, 2.5, -44] }, // F1 (after the mid-air molt)
    ],
  },
  'glasshouse': {
    skyTop: '#1d9e75', skyBottom: '#c2d9db', fog: '#bcd6d4', sun: '#eafff6',
    spawn: [0, 1.4, 10], killY: -3,
    checkpoints: [
      { when: (p) => p.z < -5, at: [0, 1.75, -10] }, // D1 (after the dash gap)
      { when: (p) => p.z < -32, at: [0, 1.75, -35] }, // far bank (after the nave + gust)
      { when: (p) => p.z < -44, at: [0, 6.85, -48] }, // glass roof
      { when: (p) => p.z < -73, at: [0, 5.75, -76] }, // high far bank (by the goal)
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
