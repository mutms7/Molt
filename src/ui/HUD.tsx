import { useEffect, useState } from 'react'
import { useGame } from '../game/store'
import { clearInput } from '../game/input'

export function HUD() {
  const suited = useGame((s) => s.suited)
  const moments = useGame((s) => s.moments)
  const total = useGame((s) => s.totalMoments)
  const exposure = useGame((s) => s.exposure)
  const setPaused = useGame((s) => s.setPaused)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const fn = () => setLocked(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', fn)
    return () => document.removeEventListener('pointerlockchange', fn)
  }, [])

  return (
    <div className="hud">
      <div className="tl">
        <div className={`state-pill ${suited ? 'suited' : 'bare'}`}>
          <span className="dot" />
          {suited ? 'Suited' : 'Bare'}
          <span className="sub">{suited ? 'fast · blind' : 'slow · seeing'}</span>
        </div>
        <div className="moments">
          <span className="star">✦</span>
          {moments} <span style={{ opacity: 0.6 }}>/ {total} moments</span>
        </div>
        {exposure < 0.999 && (
          <div className="exposure">
            <div className="lbl">exposure</div>
            <div className="track">
              <div className="fill" style={{ width: `${Math.round(exposure * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="tr">
        <button
          className="btn ghost small"
          onClick={() => {
            clearInput()
            if (document.pointerLockElement) document.exitPointerLock()
            setPaused(true)
          }}
        >
          Pause
        </button>
      </div>

      <div className="crosshair" />
      {!locked && <div className="look-prompt">Click to look around</div>}

      <div className="bc">
        <span>
          <kbd>W A S D</kbd> move
        </span>
        <span>
          <kbd>Space</kbd> jump
        </span>
        <span>
          <kbd>Shift</kbd> dash
        </span>
        <span>
          <b>
            <kbd>Q</kbd> molt
          </b>
        </span>
        <span>
          <kbd>Esc</kbd> pause
        </span>
        <span>
          <kbd>R</kbd> restart
        </span>
        <span>mouse to look</span>
      </div>
    </div>
  )
}
