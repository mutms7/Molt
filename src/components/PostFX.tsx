import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Effect } from 'postprocessing'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { fx } from '../game/fx'
import { audio } from '../audio/audio'

// The signature effect: suited = desaturated, cool, low-contrast.
// Bare = full saturation, a warm lift, a touch more contrast.
const frag = /* glsl */ `
uniform float uBare;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float sat = mix(0.2, 1.3, uBare);
  vec3 col = mix(vec3(l), c, sat);
  float contrast = mix(0.9, 1.09, uBare);
  col = (col - 0.5) * contrast + 0.5;
  vec3 tint = mix(vec3(0.79, 0.83, 0.96), vec3(1.09, 1.0, 0.92), uBare);
  col *= tint;
  col *= mix(0.86, 1.04, uBare);
  outputColor = vec4(clamp(col, 0.0, 1.0), inputColor.a);
}
`

class MoltGradeEffect extends Effect {
  constructor() {
    super('MoltGradeEffect', frag, { uniforms: new Map([['uBare', new THREE.Uniform(0)]]) })
  }
  set bare(v: number) {
    ;(this.uniforms.get('uBare') as THREE.Uniform).value = v
  }
}

export function PostFX() {
  const grade = useMemo(() => new MoltGradeEffect(), [])
  const bloom = useRef<{ intensity: number } | null>(null)
  const cur = useRef(0)

  useFrame((_, dt) => {
    const target = useGame.getState().suited ? 0 : 1
    cur.current = THREE.MathUtils.damp(cur.current, target, 4.5, dt)
    grade.bare = cur.current
    fx.bare = cur.current
    if (bloom.current) bloom.current.intensity = 0.12 + cur.current * 0.7
    audio.setBareness(cur.current)
  })

  return (
    <EffectComposer>
      <Bloom ref={bloom as never} mipmapBlur intensity={0.12} luminanceThreshold={0.78} luminanceSmoothing={0.18} />
      <primitive object={grade} />
      <Vignette offset={0.22} darkness={0.55} />
    </EffectComposer>
  )
}
