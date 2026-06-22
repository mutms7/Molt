import { useEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
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
const LAND_TIME = 0.18
const SUIT_TRANSITION_SPEED = 2.4

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + delta * (1 - Math.exp(-lambda * dt))
}

// Per-zone respawn config. A checkpoint arms (becomes the respawn point) the
// first frame its `when` predicate is true; they arm in order as you progress.
export type PlayerPoint = { x: number; y: number; z: number }
export type Checkpoint = { when: (p: PlayerPoint) => boolean; at: [number, number, number] }

export function Player({
  spawn,
  killY = -7,
  checkpoints = [],
}: {
  spawn: [number, number, number]
  killY?: number
  checkpoints?: Checkpoint[]
}) {
  const body = useRef<RapierRigidBody>(null)
  const colRef = useRef<RapierCollider>(null)
  const visual = useRef<THREE.Group>(null)
  const rig = useRef<THREE.Group>(null)
  const squash = useRef<THREE.Group>(null)
  const bareLook = useRef<THREE.Group>(null)
  const suitLook = useRef<THREE.Group>(null)
  const bareHead = useRef<THREE.Group>(null)
  const bareTorso = useRef<THREE.Group>(null)
  const bareArmL = useRef<THREE.Group>(null)
  const bareArmR = useRef<THREE.Group>(null)
  const bareLegL = useRef<THREE.Group>(null)
  const bareLegR = useRef<THREE.Group>(null)
  const suitHead = useRef<THREE.Group>(null)
  const suitTorso = useRef<THREE.Group>(null)
  const suitArmL = useRef<THREE.Group>(null)
  const suitArmR = useRef<THREE.Group>(null)
  const suitLegL = useRef<THREE.Group>(null)
  const suitLegR = useRef<THREE.Group>(null)
  const suitPack = useRef<THREE.Group>(null)
  const suitPanel = useRef<THREE.Mesh>(null)
  const shell = useRef<THREE.Mesh>(null)
  const ctrl = useRef<ReturnType<typeof createCtrl> | null>(null)
  const { rapier, world } = useRapier()

  const s = useRef({
    vy: 0,
    grounded: false,
    coyote: 0,
    airJumps: 0,
    dashTimer: 0,
    dashCd: 0,
    camInit: false,
    cpIndex: 0,
    runPhase: 0,
    runBlend: 0,
    landTimer: 0,
    wasGrounded: false,
    victoryTime: 0,
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

  function poseLimb(ref: RefObject<THREE.Group | null>, x: number, y = 0, z = 0) {
    if (ref.current) ref.current.rotation.set(x, y, z)
  }

  function setLookOpacity(group: THREE.Group | null, opacity: number) {
    if (!group) return
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      const materials = Array.isArray(material) ? material : material ? [material] : []
      materials.forEach((mat) => {
        const faded = mat as THREE.Material & { opacity: number; transparent: boolean; depthWrite: boolean; userData: { baseOpacity?: number; baseDepthWrite?: boolean } }
        if (faded.userData.baseOpacity === undefined) {
          faded.userData.baseOpacity = faded.opacity
          faded.userData.baseDepthWrite = faded.depthWrite
        }
        faded.opacity = faded.userData.baseOpacity * opacity
        faded.transparent = faded.opacity < 0.999 || faded.userData.baseOpacity < 0.999
        faded.depthWrite = faded.opacity >= 0.999 ? (faded.userData.baseDepthWrite ?? true) : false
      })
    })
  }

  function animateRig(dt: number, suitProgress: number, moving: boolean, grounded: boolean, vy: number, speed: number, complete: boolean) {
    const st = s.current
    const time = performance.now() * 0.001
    const runTarget = moving && grounded && !complete ? THREE.MathUtils.clamp(speed / SUIT.speed, 0, 1) : 0
    st.runBlend = THREE.MathUtils.damp(st.runBlend, runTarget, 14, dt)
    st.runPhase += (3.5 + speed * 1.25) * st.runBlend * dt
    st.landTimer = Math.max(0, st.landTimer - dt)
    st.victoryTime = complete ? st.victoryTime + dt : 0

    const stride = Math.sin(st.runPhase)
    const stride2 = Math.sin(st.runPhase + Math.PI)
    const idle = Math.sin(time * 2.4)
    const land = st.landTimer / LAND_TIME
    const airborne = !grounded && !complete
    const rising = airborne && vy > 0
    const victory = complete ? 1 : 0
    const suitAlpha = THREE.MathUtils.smoothstep(suitProgress, 0.08, 0.95)
    const bareAlpha = 1 - THREE.MathUtils.smoothstep(suitProgress, 0.05, 0.88)

    if (bareLook.current) {
      bareLook.current.visible = bareAlpha > 0.02
      bareLook.current.scale.setScalar(1 - suitAlpha * 0.08)
      bareLook.current.position.y = -suitAlpha * 0.04
      setLookOpacity(bareLook.current, bareAlpha)
    }
    if (suitLook.current) {
      suitLook.current.visible = suitAlpha > 0.02
      suitLook.current.scale.setScalar(0.72 + suitAlpha * 0.28)
      suitLook.current.position.y = (1 - suitAlpha) * 0.1
      suitLook.current.rotation.z = (1 - suitAlpha) * Math.sin(time * 14) * 0.08
      setLookOpacity(suitLook.current, suitAlpha)
    }

    if (rig.current) {
      rig.current.position.y = (grounded ? idle * 0.018 * (1 - st.runBlend) : 0) - land * 0.05
      rig.current.rotation.y = victory ? Math.sin(st.victoryTime * 5.5) * 0.55 : 0
      rig.current.rotation.z = victory ? Math.sin(st.victoryTime * 8) * 0.08 : 0
    }
    if (squash.current) {
      const jumpStretch = airborne && rising ? 0.06 : 0
      squash.current.scale.set(1 + land * 0.12 - jumpStretch * 0.35, 1 - land * 0.18 + jumpStretch, 1 + land * 0.12 - jumpStretch * 0.35)
    }

    const armAir = airborne ? (rising ? -0.8 : 0.45) : 0
    const legAir = airborne ? (rising ? -0.35 : 0.55) : 0
    const victoryArm = victory ? -2.45 + Math.sin(st.victoryTime * 10) * 0.15 : 0
    const victoryLeg = victory ? 0.18 + Math.sin(st.victoryTime * 12) * 0.08 : 0
    const runArm = st.runBlend * 0.9
    const runLeg = st.runBlend * 0.7

    poseLimb(bareArmL, stride2 * runArm + armAir + victoryArm, 0, -0.12 - victory * 0.35)
    poseLimb(bareArmR, stride * runArm + armAir + victoryArm, 0, 0.12 + victory * 0.35)
    poseLimb(bareLegL, stride * runLeg + legAir + victoryLeg, 0, 0.05)
    poseLimb(bareLegR, stride2 * runLeg + legAir + victoryLeg, 0, -0.05)

    poseLimb(suitArmL, stride2 * runArm * 0.72 + armAir * 0.75 + victoryArm, 0, -0.2 - victory * 0.45)
    poseLimb(suitArmR, stride * runArm * 0.72 + armAir * 0.75 + victoryArm, 0, 0.2 + victory * 0.45)
    poseLimb(suitLegL, stride * runLeg * 0.55 + legAir * 0.55 + victoryLeg, 0, 0.04)
    poseLimb(suitLegR, stride2 * runLeg * 0.55 + legAir * 0.55 + victoryLeg, 0, -0.04)

    if (bareHead.current) bareHead.current.position.y = 0.83 + idle * 0.012 * (1 - st.runBlend)
    if (bareTorso.current) bareTorso.current.rotation.x = airborne ? (rising ? -0.08 : 0.16) : stride * st.runBlend * 0.03
    if (suitHead.current) suitHead.current.position.y = 0.86 + idle * 0.008 * (1 - st.runBlend)
    if (suitTorso.current) suitTorso.current.rotation.x = airborne ? (rising ? -0.05 : 0.12) : stride * st.runBlend * 0.02
    if (suitPack.current) suitPack.current.position.z = -0.39 - (1 - suitAlpha) * 0.22 + Math.sin(time * 3.2) * 0.012
    if (suitPanel.current) suitPanel.current.scale.setScalar(Math.max(0.12, suitAlpha) * (1 + Math.sin(time * 7) * 0.04))
    if (shell.current) shell.current.scale.setScalar(0.8 + suitAlpha * 0.2 + Math.sin(time * 3) * 0.018 + victory * 0.04)
  }

  function createCtrl() {
    const cc = world.createCharacterController(0.02)
    cc.enableAutostep(0.3, 0.1, true) // small lips/curbs only; tall steps still need a jump
    cc.setMaxSlopeClimbAngle((50 * Math.PI) / 180)
    cc.setMinSlopeSlideAngle((38 * Math.PI) / 180)
    cc.setSlideEnabled(true) // slide along walls instead of stopping
    cc.setCharacterMass(1)
    return cc
  }

  // Default respawn point is the spawn. Game remounts per run (keyed on runId),
  // so this re-seeds the checkpoint and arming index at the start of every run.
  useEffect(() => {
    checkpoint.set(spawn[0], spawn[1], spawn[2])
    s.current.cpIndex = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const cc = createCtrl()
    ctrl.current = cc
    return () => {
      try { world.removeCharacterController(cc) } catch { /* world already gone */ }
      ctrl.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world])

  useFrame((frame, dtRaw) => {
    const b = body.current
    const col = colRef.current
    const cc = ctrl.current
    if (!b || !col || !cc) return
    const dt = Math.min(dtRaw, 0.033)
    let game = useGame.getState()
    if (game.paused) return
    if (game.screen === 'play' && game.suitDirection !== 0) {
      game.setSuitProgress(game.suitProgress + game.suitDirection * SUIT_TRANSITION_SPEED * dt)
      game = useGame.getState()
    }
    const acceptingInput = game.screen === 'play'
    const complete = game.screen === 'complete'
    const suited = game.suited
    const suitProgress = game.suitProgress
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
    const mz = acceptingInput ? keys.f - keys.b : 0
    const mx = acceptingInput ? keys.r - keys.l : 0
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
    if (acceptingInput && edges.dash) {
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
    if (acceptingInput && edges.jump) {
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

    if (!st.wasGrounded && newGrounded) st.landTimer = LAND_TIME
    st.wasGrounded = newGrounded

    // Ceiling: rising but vertical movement got blocked -> stop rising.
    if (st.vy > 0 && vertical.applied.y < desiredY - 1e-4) st.vy = 0
    // Landed.
    if (newGrounded && st.vy < 0) st.vy = 0
    st.grounded = newGrounded

    const cur = b.translation()
    let nx = cur.x
    let ny = cur.y
    let nz = cur.z

    // --- per-zone checkpoints arm in order; gentle respawn on a fall ---
    while (st.cpIndex < checkpoints.length && checkpoints[st.cpIndex].when({ x: nx, y: ny, z: nz })) {
      const at = checkpoints[st.cpIndex].at
      checkpoint.set(at[0], at[1], at[2])
      st.cpIndex++
    }
    if (ny < killY) {
      nx = checkpoint.x
      ny = checkpoint.y
      nz = checkpoint.z
      st.vy = 0
    }

    setPosition(nx, ny, nz)

    // --- visual facing + character animation ---
    if (visual.current) {
      const face = st.dashTimer > 0 ? v.dashDir : moving ? v.move : null
      if (face) {
        const ang = Math.atan2(face.x, face.z)
        visual.current.rotation.y = dampAngle(visual.current.rotation.y, ang, 14, dt)
      }
    }
    animateRig(dt, suitProgress, moving, newGrounded, st.vy, Math.hypot(hx, hz), complete)

    // --- third-person camera ---
    v.lookDir.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    )
    v.camTarget.set(nx, ny + 1.2, nz)
    v.camPos.copy(v.camTarget).addScaledVector(v.lookDir, -CAM_DIST)
    const camera = frame.camera
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
        <group ref={rig}>
          <group ref={squash}>
            <group ref={bareLook} visible={false}>
              <group ref={bareTorso} position={[0, 0.12, 0]}>
                <mesh castShadow>
                  <capsuleGeometry args={[0.25, 0.58, 8, 18]} />
                  <meshStandardMaterial color="#f5b68c" roughness={0.78} />
                </mesh>
                <mesh position={[0, 0.03, 0.27]}>
                  <boxGeometry args={[0.22, 0.2, 0.05]} />
                  <meshStandardMaterial color="#ffd7b5" emissive="#f5b68c" emissiveIntensity={0.25} roughness={0.65} />
                </mesh>
              </group>
              <group ref={bareHead} position={[0, 0.83, 0]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.24, 20, 20]} />
                  <meshStandardMaterial color="#f2d4bf" roughness={0.72} />
                </mesh>
                <mesh position={[0, 0.12, -0.02]} scale={[1.02, 0.48, 1.02]}>
                  <sphereGeometry args={[0.245, 18, 18]} />
                  <meshStandardMaterial color="#4b332d" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.01, 0.22]}>
                  <boxGeometry args={[0.18, 0.045, 0.03]} />
                  <meshStandardMaterial color="#2b2e36" roughness={0.5} />
                </mesh>
              </group>
              <group ref={bareArmL} position={[-0.31, 0.35, 0]}>
                <mesh castShadow position={[0, -0.21, 0]}>
                  <capsuleGeometry args={[0.07, 0.34, 6, 10]} />
                  <meshStandardMaterial color="#f2d4bf" roughness={0.82} />
                </mesh>
                <mesh castShadow position={[0, -0.45, 0]}>
                  <sphereGeometry args={[0.075, 10, 10]} />
                  <meshStandardMaterial color="#f2d4bf" roughness={0.82} />
                </mesh>
              </group>
              <group ref={bareArmR} position={[0.31, 0.35, 0]}>
                <mesh castShadow position={[0, -0.21, 0]}>
                  <capsuleGeometry args={[0.07, 0.34, 6, 10]} />
                  <meshStandardMaterial color="#f2d4bf" roughness={0.82} />
                </mesh>
                <mesh castShadow position={[0, -0.45, 0]}>
                  <sphereGeometry args={[0.075, 10, 10]} />
                  <meshStandardMaterial color="#f2d4bf" roughness={0.82} />
                </mesh>
              </group>
              <group ref={bareLegL} position={[-0.13, -0.32, 0]}>
                <mesh castShadow position={[0, -0.24, 0]}>
                  <capsuleGeometry args={[0.085, 0.4, 6, 10]} />
                  <meshStandardMaterial color="#374459" roughness={0.86} />
                </mesh>
                <mesh castShadow position={[0, -0.51, 0.07]}>
                  <boxGeometry args={[0.17, 0.09, 0.28]} />
                  <meshStandardMaterial color="#2b2e36" roughness={0.82} />
                </mesh>
              </group>
              <group ref={bareLegR} position={[0.13, -0.32, 0]}>
                <mesh castShadow position={[0, -0.24, 0]}>
                  <capsuleGeometry args={[0.085, 0.4, 6, 10]} />
                  <meshStandardMaterial color="#374459" roughness={0.86} />
                </mesh>
                <mesh castShadow position={[0, -0.51, 0.07]}>
                  <boxGeometry args={[0.17, 0.09, 0.28]} />
                  <meshStandardMaterial color="#2b2e36" roughness={0.82} />
                </mesh>
              </group>
            </group>

            <group ref={suitLook}>
              <group ref={suitTorso} position={[0, 0.13, 0]}>
                <mesh castShadow>
                  <capsuleGeometry args={[0.36, 0.78, 8, 20]} />
                  <meshStandardMaterial color="#3d5366" roughness={0.58} metalness={0.08} />
                </mesh>
                <mesh ref={suitPanel} position={[0, 0.1, 0.35]}>
                  <boxGeometry args={[0.34, 0.3, 0.07]} />
                  <meshStandardMaterial color="#a8e6cf" emissive="#6fcfae" emissiveIntensity={0.7} roughness={0.28} />
                </mesh>
                <mesh position={[-0.43, 0.2, 0]} castShadow>
                  <boxGeometry args={[0.25, 0.2, 0.34]} />
                  <meshStandardMaterial color="#5f8791" roughness={0.5} />
                </mesh>
                <mesh position={[0.43, 0.2, 0]} castShadow>
                  <boxGeometry args={[0.25, 0.2, 0.34]} />
                  <meshStandardMaterial color="#5f8791" roughness={0.5} />
                </mesh>
              </group>
              <group ref={suitHead} position={[0, 0.86, 0]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.31, 24, 24]} />
                  <meshStandardMaterial color="#6f8f9b" roughness={0.38} metalness={0.12} />
                </mesh>
                <mesh position={[0, 0, 0.24]} scale={[1, 0.58, 0.22]}>
                  <sphereGeometry args={[0.23, 18, 18]} />
                  <meshStandardMaterial color="#1f2d3a" emissive="#a8e6cf" emissiveIntensity={0.12} roughness={0.2} />
                </mesh>
              </group>
              <group ref={suitArmL} position={[-0.48, 0.32, 0]}>
                <mesh castShadow position={[0, -0.21, 0]}>
                  <capsuleGeometry args={[0.105, 0.34, 6, 12]} />
                  <meshStandardMaterial color="#4f6f82" roughness={0.55} metalness={0.08} />
                </mesh>
                <mesh castShadow position={[0, -0.45, 0]}>
                  <sphereGeometry args={[0.11, 12, 12]} />
                  <meshStandardMaterial color="#a8e6cf" roughness={0.42} metalness={0.06} />
                </mesh>
              </group>
              <group ref={suitArmR} position={[0.48, 0.32, 0]}>
                <mesh castShadow position={[0, -0.21, 0]}>
                  <capsuleGeometry args={[0.105, 0.34, 6, 12]} />
                  <meshStandardMaterial color="#4f6f82" roughness={0.55} metalness={0.08} />
                </mesh>
                <mesh castShadow position={[0, -0.45, 0]}>
                  <sphereGeometry args={[0.11, 12, 12]} />
                  <meshStandardMaterial color="#a8e6cf" roughness={0.42} metalness={0.06} />
                </mesh>
              </group>
              <group ref={suitLegL} position={[-0.17, -0.34, 0]}>
                <mesh castShadow position={[0, -0.24, 0]}>
                  <capsuleGeometry args={[0.12, 0.42, 6, 12]} />
                  <meshStandardMaterial color="#34495a" roughness={0.62} metalness={0.08} />
                </mesh>
                <mesh castShadow position={[0, -0.53, 0.09]}>
                  <boxGeometry args={[0.22, 0.12, 0.34]} />
                  <meshStandardMaterial color="#223240" roughness={0.5} />
                </mesh>
              </group>
              <group ref={suitLegR} position={[0.17, -0.34, 0]}>
                <mesh castShadow position={[0, -0.24, 0]}>
                  <capsuleGeometry args={[0.12, 0.42, 6, 12]} />
                  <meshStandardMaterial color="#34495a" roughness={0.62} metalness={0.08} />
                </mesh>
                <mesh castShadow position={[0, -0.53, 0.09]}>
                  <boxGeometry args={[0.22, 0.12, 0.34]} />
                  <meshStandardMaterial color="#223240" roughness={0.5} />
                </mesh>
              </group>
              <group ref={suitPack} position={[0, 0.14, -0.39]}>
                <mesh castShadow>
                  <boxGeometry args={[0.46, 0.72, 0.18]} />
                  <meshStandardMaterial color="#263746" roughness={0.48} metalness={0.12} />
                </mesh>
                <mesh position={[0, 0.16, -0.1]}>
                  <boxGeometry args={[0.28, 0.12, 0.08]} />
                  <meshStandardMaterial color="#a8e6cf" emissive="#6fcfae" emissiveIntensity={0.45} roughness={0.35} />
                </mesh>
              </group>
              <mesh ref={shell} position={[0, 0.16, 0]}>
                <capsuleGeometry args={[0.55, 0.98, 8, 18]} />
                <meshStandardMaterial
                  color="#a8e6cf"
                  emissive="#a8e6cf"
                  emissiveIntensity={0.25}
                  transparent
                  opacity={0.18}
                  roughness={0.1}
                  metalness={0}
                  depthWrite={false}
                />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </RigidBody>
  )
}
