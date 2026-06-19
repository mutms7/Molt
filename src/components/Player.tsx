import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { keys, edges, look } from '../game/input'
import { useGame } from '../game/store'
import { playerPos, checkpoint } from '../game/fx'

const SUIT = { speed: 9, jump: 11, maxJumps: 2 }
const BARE = { speed: 5, jump: 8, maxJumps: 1 }
const DASH_SPEED = 22
const DASH_TIME = 0.22
const DASH_CD = 0.6
const CAM_DIST = 6.4

// Shortest-arc damp for an angle.
function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let delta = target - current
  delta = Math.atan2(Math.sin(delta), Math.cos(delta))
  return current + delta * (1 - Math.exp(-lambda * dt))
}

export function Player({ spawn }: { spawn: [number, number, number] }) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const shell = useRef<THREE.Mesh>(null)
  const { rapier, world } = useRapier()
  const camera = useThree((s) => s.camera)

  const ray = useRef<InstanceType<typeof rapier.Ray> | null>(null)
  const s = useRef({ jumpsLeft: 2, dashTimer: 0, dashCd: 0, coyote: 0, camInit: false, cpDone: false })
  const v = useRef({
    fwd: new THREE.Vector3(),
    right: new THREE.Vector3(),
    move: new THREE.Vector3(),
    dashDir: new THREE.Vector3(0, 0, -1),
    lookDir: new THREE.Vector3(),
    camTarget: new THREE.Vector3(),
    camPos: new THREE.Vector3(),
  }).current

  useFrame((_, dtRaw) => {
    const b = body.current
    if (!b) return
    const dt = Math.min(dtRaw, 0.033)
    if (!ray.current) ray.current = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 })

    const suited = useGame.getState().suited
    const P = suited ? SUIT : BARE
    const st = s.current

    // Camera-relative move direction.
    const yaw = look.yaw, pitch = look.pitch
    v.fwd.set(Math.sin(yaw), 0, -Math.cos(yaw))
    v.right.set(Math.cos(yaw), 0, Math.sin(yaw))
    const mz = keys.f - keys.b
    const mx = keys.r - keys.l
    v.move.set(0, 0, 0).addScaledVector(v.fwd, mz).addScaledVector(v.right, mx)
    const moving = v.move.lengthSq() > 1e-4
    if (moving) v.move.normalize()

    // Ground check (raycast down, exclude self).
    const t = b.translation()
    ray.current.origin.x = t.x
    ray.current.origin.y = t.y
    ray.current.origin.z = t.z
    const hit = world.castRay(ray.current, 1.15, true, undefined, undefined, undefined, b)
    const grounded = !!hit
    if (grounded) {
      st.jumpsLeft = P.maxJumps
      st.coyote = 0.1
    } else {
      st.coyote = Math.max(0, st.coyote - dt)
    }

    st.dashTimer = Math.max(0, st.dashTimer - dt)
    st.dashCd = Math.max(0, st.dashCd - dt)

    // Dash (suited only): a quick burst, also usable mid-air.
    if (edges.dash) {
      edges.dash = false
      if (suited && st.dashCd <= 0) {
        st.dashTimer = DASH_TIME
        st.dashCd = DASH_CD
        v.dashDir.copy(moving ? v.move : v.fwd)
      }
    }

    const lin = b.linvel()
    let vx: number, vz: number
    if (st.dashTimer > 0) {
      vx = v.dashDir.x * DASH_SPEED
      vz = v.dashDir.z * DASH_SPEED
    } else {
      vx = v.move.x * P.speed
      vz = v.move.z * P.speed
    }
    let vy = lin.y

    if (edges.jump) {
      edges.jump = false
      if (st.jumpsLeft > 0 || st.coyote > 0) {
        vy = P.jump
        st.jumpsLeft = Math.max(0, st.jumpsLeft - 1)
        st.coyote = 0
      }
    }

    b.setLinvel({ x: vx, y: vy, z: vz }, true)

    playerPos.set(t.x, t.y, t.z)

    // One checkpoint, once you've crossed the gap.
    if (!st.cpDone && t.z < -19) {
      checkpoint.set(0, 1.4, -23)
      st.cpDone = true
    }
    // Gentle reset if you fall.
    if (t.y < -7) {
      b.setTranslation({ x: checkpoint.x, y: checkpoint.y, z: checkpoint.z }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }

    // Visual: face movement, show/hide the shell.
    if (visual.current) {
      const face = st.dashTimer > 0 ? v.dashDir : moving ? v.move : null
      if (face) {
        const ang = Math.atan2(face.x, face.z)
        visual.current.rotation.y = dampAngle(visual.current.rotation.y, ang, 12, dt)
      }
    }
    if (shell.current) {
      shell.current.visible = suited
      const sc = 1 + Math.sin(performance.now() * 0.003) * 0.015
      shell.current.scale.setScalar(sc)
    }

    // Third-person camera.
    v.lookDir.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    )
    v.camTarget.set(t.x, t.y + 1.2, t.z)
    v.camPos.copy(v.camTarget).addScaledVector(v.lookDir, -CAM_DIST)
    if (!st.camInit) {
      camera.position.copy(v.camPos)
      st.camInit = true
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, v.camPos.x, 10, dt)
      camera.position.y = THREE.MathUtils.damp(camera.position.y, v.camPos.y, 10, dt)
      camera.position.z = THREE.MathUtils.damp(camera.position.z, v.camPos.z, 10, dt)
    }
    camera.lookAt(v.camTarget)
  })

  return (
    <RigidBody
      ref={body}
      colliders={false}
      mass={1}
      position={spawn}
      enabledRotations={[false, false, false]}
      canSleep={false}
      friction={0.2}
      linearDamping={0.04}
    >
      <CapsuleCollider args={[0.5, 0.4]} />
      <group ref={visual}>
        <mesh castShadow position={[0, 0.75, 0]}>
          <sphereGeometry args={[0.28, 20, 20]} />
          <meshStandardMaterial color="#f2d4bf" roughness={0.75} />
        </mesh>
        <mesh castShadow position={[0, 0.05, 0]}>
          <capsuleGeometry args={[0.32, 0.62, 8, 16]} />
          <meshStandardMaterial color="#3b4a63" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.18, 0.33]}>
          <boxGeometry args={[0.3, 0.3, 0.08]} />
          <meshStandardMaterial color="#F5B68C" emissive="#F5B68C" emissiveIntensity={0.45} roughness={0.4} />
        </mesh>
        <mesh ref={shell} position={[0, 0.12, 0]}>
          <capsuleGeometry args={[0.56, 0.95, 8, 16]} />
          <meshStandardMaterial
            color="#A8E6CF"
            emissive="#A8E6CF"
            emissiveIntensity={0.3}
            transparent
            opacity={0.26}
            roughness={0.1}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      </group>
    </RigidBody>
  )
}
