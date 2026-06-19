import { useMemo } from 'react'
import * as THREE from 'three'

// A simple two-color gradient dome. It's rendered into the scene (not as a
// flat background), so the suited/bare color grade washes over it too.
export function SkyDome({ top, bottom }: { top: string; bottom: string }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uBottom: { value: new THREE.Color(bottom) },
        },
        vertexShader: `
          varying vec3 vP;
          void main() {
            vP = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vP;
          uniform vec3 uTop;
          uniform vec3 uBottom;
          void main() {
            float h = clamp(normalize(vP).y * 0.5 + 0.5, 0.0, 1.0);
            vec3 c = mix(uBottom, uTop, smoothstep(0.0, 0.85, h));
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    [top, bottom]
  )

  return (
    <mesh scale={260} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 16]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}
