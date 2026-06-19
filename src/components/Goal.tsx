import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { playerPos } from '../game/fx'

// The quiet end of the zone. Reaching it (suited or bare) completes the place.
export function Goal({
  position,
  zoneId,
  nextId,
}: {
  position: [number, number, number]
  zoneId: string
  nextId?: string
}) {
  const ring = useRef<THREE.Mesh>(null)
  const done = useRef(false)
  const center = useMemo(() => new THREE.Vector3(...position), [position])

  useFrame((_, dt) => {
    if (ring.current) {
      ring.current.rotation.z += dt * 0.6
      ring.current.position.y = position[1] + 1.2 + Math.sin(performance.now() * 0.0015) * 0.1
    }
    if (done.current) return
    const dx = playerPos.x - center.x
    const dz = playerPos.z - center.z
    if (Math.sqrt(dx * dx + dz * dz) < 2.0 && playerPos.y > position[1] - 0.6) {
      done.current = true
      useGame.getState().completeZone(zoneId, nextId)
    }
  })

  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[1.7, 1.7, 0.12, 36]} />
        <meshStandardMaterial color="#a8e6cf" emissive="#a8e6cf" emissiveIntensity={0.7} roughness={0.4} />
      </mesh>
      <mesh ref={ring} position={[0, 1.2, 0]}>
        <torusGeometry args={[0.85, 0.09, 14, 44]} />
        <meshStandardMaterial color="#fff0c8" emissive="#ffd24a" emissiveIntensity={1.3} roughness={0.3} />
      </mesh>
    </group>
  )
}
