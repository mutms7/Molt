import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { checkpointFx } from '../game/fx'

// A visible checkpoint beacon. It sits dim until its checkpoint arms (the player
// passes the segment threshold), then pops: a bright flash and a scale punch,
// settling into a gentle lit bob. `index` is the checkpoint's order (0-based);
// `position` is the floor-top spot to stand the post on. No collider.
export function Checkpoint({ index, position }: { index: number; position: [number, number, number] }) {
  const active = useRef(false)
  const pop = useRef(0)
  const orb = useRef<THREE.Mesh>(null)
  const orbMat = useRef<THREE.MeshStandardMaterial>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((_, dt) => {
    const isActive = checkpointFx.armed > index
    if (isActive && !active.current) pop.current = 1 // just armed this frame
    active.current = isActive
    pop.current = Math.max(0, pop.current - dt * 1.5)
    const t = performance.now() * 0.002

    if (orb.current) {
      orb.current.rotation.y += dt * 1.6
      orb.current.scale.setScalar((active.current ? 1 : 0.55) + pop.current * 0.9)
      orb.current.position.y = 1.3 + (active.current ? Math.sin(t) * 0.08 : 0)
    }
    if (orbMat.current) orbMat.current.emissiveIntensity = (active.current ? 1.3 : 0.2) + pop.current * 3
    if (ring.current) {
      ring.current.visible = pop.current > 0.01
      ring.current.scale.setScalar(0.5 + (1 - pop.current) * 5)
      ring.current.rotation.z += dt * 2
    }
    if (ringMat.current) ringMat.current.opacity = pop.current * 0.7
  })

  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.13, 1.1, 8]} />
        <meshStandardMaterial color="#2b2e36" roughness={0.5} metalness={0.45} />
      </mesh>
      <mesh ref={orb} position={[0, 1.3, 0]}>
        <icosahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial ref={orbMat} color="#a8e6cf" emissive="#a8e6cf" emissiveIntensity={0.2} roughness={0.3} />
      </mesh>
      <mesh ref={ring} position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[0.5, 0.06, 10, 32]} />
        <meshBasicMaterial ref={ringMat} color="#eafff6" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
