import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { fx } from '../game/fx'

// A stepping stone you can only see, and only stand on, while bare.
// Suited: rendered invisible (opacity follows bareness) and has no collider.
export function HiddenPlatform({
  position,
  size = [2, 0.3, 1.5],
}: {
  position: [number, number, number]
  size?: [number, number, number]
}) {
  const suited = useGame((s) => s.suited)
  const mat = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    if (mat.current) mat.current.opacity = Math.min(0.92, fx.bare * 0.95)
  })

  const mesh = (
    <mesh receiveShadow castShadow={!suited}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        ref={mat}
        color="#bdf0ff"
        emissive="#7fd4ff"
        emissiveIntensity={0.7}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )

  if (suited) return <group position={position}>{mesh}</group>
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      {mesh}
    </RigidBody>
  )
}
