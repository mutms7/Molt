import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { SceneRig } from './SceneRig'
import { Player } from './Player'
import { PostFX } from './PostFX'
import { Particles } from './Particles'
import { Controls } from './Controls'
import { TrendMile } from '../zones/TrendMile'
import { useGame } from '../game/store'

type Cfg = { skyTop: string; skyBottom: string; fog: string; sun: string; spawn: [number, number, number] }

const CFG: Record<string, Cfg> = {
  'trend-mile': { skyTop: '#a9c8e6', skyBottom: '#f7e6cf', fog: '#f0e1c9', sun: '#fff1d6', spawn: [0, 1.4, 8] },
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
          <Player spawn={cfg.spawn} />
        </Physics>
      </Suspense>
      <Particles />
      <PostFX />
      <Controls />
    </Canvas>
  )
}
