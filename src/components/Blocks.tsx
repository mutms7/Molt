import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { tiled, type TexKind } from './textures'

export type V3 = [number, number, number]

const TILE_WORLD = 2.6 // one texture tile ~= 2.6 m, so tiling scales with size

// A solid, textured cuboid: the workhorse floor / step / wall. Collision is an
// exact cuboid (unchanged from the old Slab) so movement/physics are identical;
// only the look is upgraded (procedural map + bump under the sun light).
export function Block({
  pos,
  size,
  kind = 'tile',
  color = '#efe3d2',
  roughness = 0.92,
  metalness = 0,
  bumpScale = 0.05,
}: {
  pos: V3
  size: V3
  kind?: TexKind
  color?: string
  roughness?: number
  metalness?: number
  bumpScale?: number
}) {
  const tex = useMemo(
    () => tiled(kind, color, Math.max(0.5, size[0] / TILE_WORLD), Math.max(0.5, size[2] / TILE_WORLD)),
    [kind, color, size[0], size[1], size[2]]
  )
  return (
    <RigidBody type="fixed" colliders="cuboid" position={pos}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial map={tex.map} bumpMap={tex.bump} bumpScale={bumpScale} roughness={roughness} metalness={metalness} />
      </mesh>
    </RigidBody>
  )
}

// A non-solid textured wall pane (glass etc.); decorative containment only.
export function Pane({ pos, size, color = '#bfe6dc', opacity = 0.16 }: { pos: V3; size: V3; color?: string; opacity?: number }) {
  const tex = useMemo(() => tiled('glass', color, Math.max(0.5, size[0] / 3), Math.max(0.5, size[1] / 3)), [color, size[0], size[1], size[2]])
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial map={tex.map} color={color} emissive={color} emissiveIntensity={0.06} transparent opacity={opacity} roughness={0.08} metalness={0.25} depthWrite={false} />
    </mesh>
  )
}

// A glowing lamp post: a little vertical detail + light pool, for landmarks.
export function Lamp({ pos, color = '#ffe6a0', height = 2.2 }: { pos: V3; color?: string; height?: number }) {
  return (
    <group position={pos}>
      <mesh castShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.1, height, 8]} />
        <meshStandardMaterial color="#2b2e36" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, height + 0.1, 0]}>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} roughness={0.3} />
      </mesh>
      <pointLight position={[0, height + 0.1, 0]} color={color} intensity={6} distance={7} decay={2} />
    </group>
  )
}

// A stacked crate prop (textured), for skyblock-ish clutter.
export function Crate({ pos, color = '#caa472' }: { pos: V3; color?: string }) {
  const tex = useMemo(() => tiled('panel', color, 1, 1), [color])
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={[0.9, 0.9, 0.9]} />
      <meshStandardMaterial map={tex.map} bumpMap={tex.bump} bumpScale={0.06} roughness={0.85} />
    </mesh>
  )
}
