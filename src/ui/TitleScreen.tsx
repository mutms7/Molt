import { useEffect, useState } from 'react'
import { useGame } from '../game/store'
import { audio } from '../audio/audio'
import { ControlsGuide } from './ControlsGuide'

export function TitleScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const [showControls, setShowControls] = useState(false)
  const begin = () => {
    audio.start()
    setScreen('select')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        begin()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="screen">
      <h1 className="title-name">
        m<span className="title-mark">o</span>lt
      </h1>

      {showControls ? (
        <div className="title-controls">
          <ControlsGuide />
        </div>
      ) : (
        <div className="title-lore" style={{ maxWidth: '46rem', margin: '0 auto', lineHeight: 1.7, opacity: 0.92, textAlign: 'left' }}>
          <p>
            There is a city that learned to wear itself like a coat, and almost everyone here keeps a
            shell, a bright and certain second skin that makes them quick and sure and just a little
            unreachable. Most people never take it off, because the world inside the shell is quieter
            and the colors are kinder and very little can get in.
          </p>
          <p>
            You have one too. The thing nobody says out loud is that the shell is also a kind of
            blindness, and that the small bright moments, and the narrow paths that run around the
            edges of a place, only ever show themselves to the person who is willing to step out of it
            and be slow, and seen, and a little afraid for a while.
          </p>
          <p>
            So that is the whole of it, really. You move through these places, and again and again you
            arrive at the same quiet question, which is whether to keep the shell on and trust your
            speed, or to molt, and stand in the open, and finally notice what was there the entire time.
          </p>
        </div>
      )}

      <div style={{ marginTop: '1.8rem', display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
        <button className="btn" onClick={begin}>
          Begin
        </button>
        <button className="btn ghost small" onClick={() => setShowControls((v) => !v)}>
          {showControls ? 'Back to story' : 'Controls'}
        </button>
      </div>
      <p className="subtle">Press Enter, Space, or click Begin.</p>
    </div>
  )
}
