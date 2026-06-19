import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  RigidBody,
  CapsuleCollider,
  useRapier,
  type RapierRigidBody,
  type RapierCollider,
} from '@react-three/rapier'
import * as THREE from 'three'
import { keys, edges, look } from '../game/input'
import { useGame } from '../game/store'
import { playerPos, checkpoint, debugTeleport } from '../game/fx'

// Tuned for a crisp platformer: fairly strong gravity (little float),
// snappy jumps, instant horizontal response.
const SUIT = { speed: 9, jump: 15, maxJumps: 2 }
const BARE = { speed: 5.5, jump: 12.5, maxJumps: 1 }
const GRAVITY = -52
const DASH_SPEED = 24
const DASH_TIME = 0.2
const DASH_CD = 0.55
const COYOTE = 0.1
const GROUND_STICK = -4 // gentle downward press so you hug the ground / step down
const CAM_DIST = 6.4
const CAP_HALF = 0.5
const CAP_RADIUS = 0.4

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + delta * (1 - Math.exp(-lambda * dt))
}

export function Player({ spawn }: { spawn: [number, number, number] }) {
  const body = useRef<RapierRigidBody>(null)
  const colRef = useRef<RapierCollider>(null)
  const visual = useRef<THREE.Group>(null)
  const shell = useRef<THREE.Mesh>(null)
  const ctrl = useRef<ReturnType<typeof createCtrl> | null>(null)
  const { rapier, world } = useRapier()
  const camera = useThree((s) => s.camera)

  const s = useRef({
    vy: 0,
    grounded: false,
    coyote: 0,
    airJumps: 0,
    dashTimer: 0,
    dashCd: 0,
    camInit: false,
    cpDone: false,
  })
  const v = useRef({
    fwd: new THREE.Vector3(),
    right: new THREE.Vector3(),
    move: new THREE.Vector3(),
    dashDir: new THREE.Vector3(0, 0, -1),
    lookDir: new THREE.Vector3(),
    camTarget: new THREE.Vector3(),
    camPos: new THREE.Vector3(),
  }).current

  function createCtrl() {
    const cc = world.createCharacterController(0.02)
    cc.enableAutostep(0.3, 0.1, true) // small lips/curbs only; tall steps still need a jump
    cc.setMaxSlopeClimbAngle((50 * Math.PI) / 180)
    cc.setMinSlopeSlideAngle((38 * Math.PI) / 180)
    cc.setSlideEnabled(true) // slide along walls instead of stopping
    cc.setCharacterMass(1)
    return cc
  }

  useEffect(() => {
    const cc = createCtrl()
    ctrl.current = cc
    return () => {
      try { world.removeCharacterController(cc) } catch { /* world already gone */ }
      ctrl.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world])

  useFrame((_, dtRaw) => {
    const b = body.current
    const col = colRef.current
    const cc = ctrl.current
    if (!b || !col || !cc) return
    const dt = Math.min(dtRaw, 0.033)
    const suited = useGame.getState().suited
    const P = suited ? SUIT : BARE
    const st = s.current

    const setPosition = (x: number, y: number, z: number) => {
      const next = { x, y, z }
      b.setTranslation(next, true)
      b.setNextKinematicTranslation(next)
      playerPos.set(x, y, z)
    }

    if (debugTeleport.next) {
      const p = debugTeleport.next
      debugTeleport.next = null
      setPosition(p.x, p.y, p.z)
      st.vy = 0
      st.grounded = false
      st.coyote = 0
      st.airJumps = P.maxJumps - 1
      st.dashTimer = 0
      st.dashCd = 0
      return
    }

    // --- camera-relative input direction ---
    const yaw = look.yaw, pitch = look.pitch
    v.fwd.set(Math.sin(yaw), 0, -Math.cos(yaw))
    v.right.set(Math.cos(yaw), 0, Math.sin(yaw))
    const mz = keys.f - keys.b
    const mx = keys.r - keys.l
    v.move.set(0, 0, 0).addScaledVector(v.fwd, mz).addScaledVector(v.right, mx)
    const moving = v.move.lengthSq() > 1e-4
    if (moving) v.move.normalize()

    // --- timers ---
    st.dashTimer = Math.max(0, st.dashTimer - dt)
    st.dashCd = Math.max(0, st.dashCd - dt)
    const grounded = st.grounded
    if (grounded) {
      st.coyote = COYOTE
      st.airJumps = P.maxJumps - 1
    } else {
      st.coyote = Math.max(0, st.coyote - dt)
    }

    // --- dash (suited only); horizontal burst, vertical untouched ---
    if (edges.dash) {
      edges.dash = false
      if (suited && st.dashCd <= 0) {
        st.dashTimer = DASH_TIME
        st.dashCd = DASH_CD
        v.dashDir.copy(moving ? v.move : v.fwd)
      }
    }

    // --- horizontal velocity ---
    let hx: number, hz: number
    if (st.dashTimer > 0) {
      hx = v.dashDir.x * DASH_SPEED
      hz = v.dashDir.z * DASH_SPEED
    } else {
      hx = v.move.x * P.speed
      hz = v.move.z * P.speed
    }

    // --- vertical velocity (gravity + jump), resolved independently of X/Z ---
    st.vy += GRAVITY * dt
    if (grounded && st.vy < 0) st.vy = GROUND_STICK
    if (edges.jump) {
      edges.jump = false
      if (grounded || st.coyote > 0) {
        st.vy = P.jump
        st.coyote = 0
      } else if (st.airJumps > 0) {
        st.vy = P.jump
        st.airJumps--
      }
    }

    const moveWithController = (delta: { x: number; y: number; z: number }) => {
      cc.computeColliderMovement(col, delta, rapier.QueryFilterFlags.EXCLUDE_SENSORS)
      const applied = cc.computedMovement()
      const cur = b.translation()
      setPosition(cur.x + applied.x, cur.y + applied.y, cur.z + applied.z)
      return { applied, grounded: cc.computedGrounded() }
    }

    // --- per-axis move and slide: side hits cancel only side motion ---
    moveWithController({ x: hx * dt, y: 0, z: hz * dt })

    const desiredY = st.vy * dt
    const vertical = moveWithController({ x: 0, y: desiredY, z: 0 })
    const blockedDown = st.vy < 0 && vertical.applied.y > desiredY + 1e-4
    const newGrounded = vertical.grounded || blockedDown

    // Ceiling: rising but vertical movement got blocked -> stop rising.
    if (st.vy > 0 && vertical.applied.y < desiredY - 1e-4) st.vy = 0
    // Landed.
    if (newGrounded && st.vy < 0) st.vy = 0
    st.grounded = newGrounded

    const cur = b.translation()
    let nx = cur.x
    let ny = cur.y
    let nz = cur.z

    // --- checkpoint after the gap, gentle respawn if you fall ---
    if (!st.cpDone && nz < -16) {
      checkpoint.set(0, 1.6, -20)
      st.cpDone = true
    }
    if (ny < -7) {
      nx = checkpoint.x
      ny = checkpoint.y
      nz = checkpoint.z
      st.vy = 0
    }

    setPosition(nx, ny, nz)

    // --- visual facing + shell ---
    if (visual.current) {
      const face = st.dashTimer > 0 ? v.dashDir : moving ? v.move : null
      if (face) {
        const ang = Math.atan2(face.x, face.z)
        visual.current.rotation.y = dampAngle(visual.current.rotation.y, ang, 14, dt)
      }
    }
    if (shell.current) {
      shell.current.visible = suited
      shell.current.scale.setScalar(1 + Math.sin(performance.now() * 0.003) * 0.015)
    }

    // --- third-person camera ---
    v.lookDir.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    )
    v.camTarget.set(nx, ny + 1.2, nz)
    v.camPos.copy(v.camTarget).addScaledVector(v.lookDir, -CAM_DIST)
    if (!st.camInit) {
      camera.position.copy(v.camPos)
      st.camInit = true
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, v.camPos.x, 11, dt)
      camera.position.y = THREE.MathUtils.damp(camera.position.y, v.camPos.y, 11, dt)
      camera.position.z = THREE.MathUtils.damp(camera.position.z, v.camPos.z, 11, dt)
    }
    camera.lookAt(v.camTarget)
  })

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={spawn}
      ccd
    >
      <CapsuleCollider ref={colRef} args={[CAP_HALF, CAP_RADIUS]} />
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
