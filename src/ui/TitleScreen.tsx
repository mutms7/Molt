import { useEffect } from 'react'
import { useGame } from '../game/store'
import { audio } from '../audio/audio'
import { ControlsGuide } from './ControlsGuide'

export function TitleScreen() {
  const setScreen = useGame((s) => s.setScreen)
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
      <div className="title-controls">
        <ControlsGuide />
      </div>
      <div style={{ marginTop: '1.8rem' }}>
        <button
          className="btn"
          onClick={begin}
        >
          Begin
        </button>
      </div>
      <p className="subtle">Press Enter, Space, or click Begin.</p>
    </div>
  )
}
