import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { playerPos } from '../game/fx'
import { audio } from '../audio/audio'

// A "moment" worth noticing. Invisible and uncollectable while suited.
export function Collectible({ position }: { position: [number, number, number] }) {
  const [got, setGot] = useState(false)
  const mesh = useRef<THREE.Mesh>(null)
  const center = useMemo(() => new THREE.Vector3(...position), [position])

  useFrame(() => {
    if (got) return
    const suited = useGame.getState().suited
    if (mesh.current) {
      mesh.current.visible = !suited
      mesh.current.rotation.y += 0.02
      mesh.current.rotation.x += 0.01
      mesh.current.position.y = position[1] + Math.sin(performance.now() * 0.002) * 0.16
    }
    if (!suited && playerPos.distanceTo(center) < 1.35) {
      setGot(true)
      useGame.getState().addMoment()
      audio.chime()
    }
  })

  if (got) return null
  return (
    <mesh ref={mesh} position={position}>
      <icosahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial color="#ffe6a0" emissive="#ffd24a" emissiveIntensity={1.5} roughness={0.3} />
    </mesh>
  )
}
