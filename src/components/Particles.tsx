import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fx } from '../game/fx'

// Dust motes / drifting attention that only appear when you step out.
export function Particles() {
  const group = useRef<THREE.Points>(null)
  const mat = useRef<THREE.PointsMaterial>(null)

  const geo = useMemo(() => {
    const N = 260
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 60
      pos[i * 3 + 1] = Math.random() * 16 + 0.5
      pos[i * 3 + 2] = Math.random() * 80 - 50
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.015
    if (mat.current) mat.current.opacity = fx.bare * 0.75
  })

  return (
    <points ref={group} geometry={geo}>
      <pointsMaterial
        ref={mat}
        size={0.1}
        color="#fff3d8"
        transparent
        opacity={0}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
