import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { fx } from '../game/fx'
import { tiled } from './textures'

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
  const tex = useMemo(() => tiled('water', '#7fd4ff', Math.max(1, size[0] / 1.6), Math.max(1, size[2] / 1.6)), [size])

  useFrame((_, dt) => {
    if (mat.current) mat.current.opacity = Math.min(0.92, fx.bare * 0.95)
    tex.map.offset.x += dt * 0.04
    tex.bump.offset.y -= dt * 0.03
  })

  const mesh = (
    <mesh receiveShadow castShadow={!suited}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        ref={mat}
        map={tex.map}
        emissiveMap={tex.map}
        color="#bdf0ff"
        emissive="#7fd4ff"
        emissiveIntensity={0.8}
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
