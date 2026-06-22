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
      { when: (p) => p.z < 1, at: [0, 1.6, -3] }, // plaza B (after the small gap)
      { when: (p) => p.z < -14, at: [0, 1.6, -18.5] }, // platform C (after the dash gap)
      { when: (p) => p.z < -31, at: [0, 1.6, -35.5] }, // platform D (after the stones)
    ],
  },
  'glasshouse': {
    skyTop: '#1d9e75', skyBottom: '#c2d9db', fog: '#bcd6d4', sun: '#eafff6',
    spawn: [0, 1.4, 9], killY: -4,
    checkpoints: [
      { when: (p) => p.z < -2, at: [0, 1.6, -8] }, // plaza B (before the flooded nave)
      { when: (p) => p.z < -26, at: [0, 1.6, -30] }, // far bank (after the nave)
      { when: (p) => p.z < -42, at: [0, 3.9, -46] }, // elevated roof walkway
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
