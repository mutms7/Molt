import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { playerPos } from '../game/fx'
import { audio } from '../audio/audio'

// A cold gust. Being bare here is risky: exposure drains, and if it empties
// you're forced back into the suit. Suited, you pass it safely (but blind).
export function GustZone({
  position,
  size,
}: {
  position: [number, number, number]
  size: [number, number, number]
}) {
  const streaks = useRef<THREE.Group>(null)
  const box = useMemo(
    () =>
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(...position),
        new THREE.Vector3(...size)
      ),
    [position, size]
  )

  useFrame((_, dt) => {
    if (streaks.current) {
      streaks.current.children.forEach((c, i) => {
        c.position.y = ((c.position.y - dt * 3 + 100) % size[1]) - size[1] / 2
        c.position.x = Math.sin(performance.now() * 0.003 + i) * 0.3 + (i - 2) * (size[0] / 5)
      })
    }
    const g = useGame.getState()
    const inside = box.containsPoint(playerPos)
    if (!g.suited && inside) {
      const e = g.exposure - dt * 0.32
      if (e <= 0) {
        g.setSuit(true)
        audio.molt(true)
        g.setExposure(0.2)
      } else {
        g.setExposure(e)
      }
    } else if (g.exposure < 1) {
      g.setExposure(Math.min(1, g.exposure + dt * 0.5))
    }
  })

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial color="#cfe8ff" transparent opacity={0.05} depthWrite={false} />
      </mesh>
      <group ref={streaks}>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={i} position={[(i - 2) * (size[0] / 5), 0, 0]}>
            <boxGeometry args={[0.04, size[1] * 0.5, 0.04]} />
            <meshBasicMaterial color="#eaf5ff" transparent opacity={0.35} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
