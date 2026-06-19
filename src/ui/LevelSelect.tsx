import { useGame } from '../game/store'
import { ZONES } from '../zones/zones'
import { audio } from '../audio/audio'

const MOMENT_COUNT: Record<string, number> = { 'trend-mile': 8 }

export function LevelSelect() {
  const unlocked = useGame((s) => s.unlocked)
  const completed = useGame((s) => s.completed)
  const startZone = useGame((s) => s.startZone)
  const setScreen = useGame((s) => s.setScreen)

  return (
    <div className="screen">
      <div className="menu-head">
        <h1>Where would you like to be?</h1>
        <p>Each place asks the same quiet question in a different way.</p>
      </div>

      <div className="zone-grid">
        {ZONES.map((z) => {
          const isUnlocked = unlocked.includes(z.id) && z.status === 'play'
          const isDone = completed.includes(z.id)
          return (
            <button
              key={z.id}
              className={`zone-card ${isUnlocked ? 'play' : 'soon'}`}
              disabled={!isUnlocked}
              onClick={() => {
                if (!isUnlocked) return
                audio.start()
                startZone(z.id, MOMENT_COUNT[z.id] ?? 0)
              }}
            >
              <div className="zone-stripe">
                {z.colors.map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </div>
              <div className="zone-body">
                <div className="zone-idx">
                  Zone {z.idx} · {z.tag}
                </div>
                <div className="zone-name">{z.name}</div>
                <div className="zone-twist">{z.twist}</div>
              </div>
              <span className={`zone-badge ${isDone ? 'done' : ''}`}>
                {isDone ? 'visited' : z.status === 'play' ? 'open' : 'soon'}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: '2.4rem' }}>
        <button className="btn ghost small" onClick={() => setScreen('title')}>
          Back
        </button>
      </div>
    </div>
  )
}
