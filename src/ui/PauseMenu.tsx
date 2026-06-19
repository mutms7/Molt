import { useState } from 'react'
import { useGame } from '../game/store'
import { clearInput } from '../game/input'
import { ControlsGuide } from './ControlsGuide'

export function PauseMenu() {
  const [showControls, setShowControls] = useState(false)
  const setPaused = useGame((s) => s.setPaused)
  const restartZone = useGame((s) => s.restartZone)
  const toMenu = useGame((s) => s.toMenu)

  const resume = () => {
    clearInput()
    setPaused(false)
  }

  return (
    <div className="overlay pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="pause-card">
        <div className="eyebrow">Paused</div>
        <h2 id="pause-title">{showControls ? 'Controls' : 'Take a breath'}</h2>
        {showControls ? (
          <ControlsGuide />
        ) : (
          <p>Movement is frozen. Resume when you are ready to line up the next jump.</p>
        )}
        <div className="actions">
          <button className="btn" onClick={resume}>
            Resume
          </button>
          <button className="btn ghost" onClick={() => setShowControls((v) => !v)}>
            {showControls ? 'Hide controls' : 'Controls'}
          </button>
          <button className="btn ghost" onClick={() => restartZone()}>
            Restart
          </button>
          <button className="btn ghost" onClick={() => toMenu()}>
            Map
          </button>
        </div>
        <div className="next-note">Press Esc or P to resume. Press R to restart.</div>
      </div>
    </div>
  )
}
