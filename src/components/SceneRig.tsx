import { SkyDome } from './SkyDome'

export function SceneRig({
  skyTop,
  skyBottom,
  fog,
  sun,
}: {
  skyTop: string
  skyBottom: string
  fog: string
  sun: string
}) {
  return (
    <>
      <color attach="background" args={[skyBottom]} />
      <fog attach="fog" args={[fog, 38, 155]} />
      <SkyDome top={skyTop} bottom={skyBottom} />
      <hemisphereLight args={[skyTop, '#b9986f', 0.65]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        castShadow
        color={sun}
        intensity={1.55}
        position={[26, 40, 16]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={55}
        shadow-camera-bottom={-35}
        shadow-bias={-0.0004}
      />
    </>
  )
}
