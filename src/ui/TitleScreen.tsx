import { useGame } from '../game/store'
import { audio } from '../audio/audio'

export function TitleScreen() {
  const setScreen = useGame((s) => s.setScreen)
  return (
    <div className="screen">
      <h1 className="title-name">
        m<span className="title-mark">o</span>lt
      </h1>
      <p className="tagline">A game about stepping out of your shell, and actually seeing the world.</p>
      <div style={{ marginTop: '2rem' }}>
        <button
          className="btn"
          onClick={() => {
            audio.start()
            setScreen('select')
          }}
        >
          Begin
        </button>
      </div>
      <p className="subtle">
        Everyone moves through the city sealed in a suit. Suited, you are fast and you fit in, but the
        world is muted and most of it stays hidden. Step out and it floods back: color, sound, the small
        living things, the paths you could not see.
      </p>
    </div>
  )
}
