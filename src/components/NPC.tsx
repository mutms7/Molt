// A suited passer-by. Decorative crowd, no AI. Their decoration color is
// muted along with the whole world while you're suited, and blooms when bare.
export function NPC({
  position,
  color,
  rot = 0,
}: {
  position: [number, number, number]
  color: string
  rot?: number
}) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh castShadow position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.34, 0.8, 6, 12]} />
        <meshStandardMaterial color="#46506a" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshStandardMaterial color="#e9cdb8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0.32]}>
        <boxGeometry args={[0.28, 0.28, 0.07]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}
