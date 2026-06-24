import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { playerPos } from '../game/fx'
import { audio } from '../audio/audio'

const FINISH_TIME = 2.0 // seconds of flourish before the complete screen

// The quiet end of the zone. It only opens once you have gathered the minimum
// number of moments; reaching it then plays a short flourish before completing.
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
  const pad = useRef<THREE.MeshStandardMaterial>(null)
  const ringMat = useRef<THREE.MeshStandardMaterial>(null)
  const burst = useRef<THREE.Mesh>(null)
  const burstMat = useRef<THREE.MeshBasicMaterial>(null)
  const triggered = useRef(false)
  const finish = useRef(0)
  const center = useMemo(() => new THREE.Vector3(...position), [position])

  useFrame((_, dt) => {
    const g = useGame.getState()
    const ready = g.moments >= g.minMoments
    const t = performance.now() * 0.0015

    if (ring.current) {
      ring.current.rotation.z += dt * (ready ? 1.4 : 0.4)
      ring.current.position.y = position[1] + 1.2 + Math.sin(t) * 0.1
    }
    // Locked (under the minimum) reads dim and amber; open reads bright and green.
    const glow = ready ? 1.3 : 0.35
    if (pad.current) {
      pad.current.emissiveIntensity = glow * 0.6
      pad.current.color.set(ready ? '#a8e6cf' : '#d8c08a')
      pad.current.emissive.set(ready ? '#a8e6cf' : '#c8a85a')
    }
    if (ringMat.current) {
      ringMat.current.emissiveIntensity = ready ? 1.4 : 0.5
      ringMat.current.color.set(ready ? '#fff0c8' : '#9a8f78')
    }

    // The finishing flourish: an expanding, fading ring while the player poses.
    if (triggered.current) {
      finish.current += dt
      const k = Math.min(1, finish.current / FINISH_TIME)
      if (burst.current) {
        burst.current.visible = true
        burst.current.scale.setScalar(0.3 + k * 7)
      }
      if (burstMat.current) burstMat.current.opacity = (1 - k) * 0.8
      if (finish.current >= FINISH_TIME) {
        triggered.current = false
        useGame.getState().completeZone(zoneId, nextId)
      }
      return
    }

    if (!ready) return
    const dx = playerPos.x - center.x
    const dz = playerPos.z - center.z
    if (Math.sqrt(dx * dx + dz * dz) < 2.0 && playerPos.y > position[1] - 0.6) {
      triggered.current = true
      finish.current = 0
      useGame.getState().setFinishing(true)
      audio.chime()
    }
  })

  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[1.7, 1.7, 0.12, 36]} />
        <meshStandardMaterial ref={pad} color="#a8e6cf" emissive="#a8e6cf" emissiveIntensity={0.7} roughness={0.4} />
      </mesh>
      <mesh ref={ring} position={[0, 1.2, 0]}>
        <torusGeometry args={[0.85, 0.09, 14, 44]} />
        <meshStandardMaterial ref={ringMat} color="#fff0c8" emissive="#ffd24a" emissiveIntensity={1.3} roughness={0.3} />
      </mesh>
      <mesh ref={burst} position={[0, 1.0, 0]} visible={false} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.16, 12, 40]} />
        <meshBasicMaterial ref={burstMat} color="#fff0c8" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
