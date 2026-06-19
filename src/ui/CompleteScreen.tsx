import { useEffect } from 'react'
import { useGame } from '../game/store'
import { zoneById } from '../zones/zones'

const MOMENT_COUNT: Record<string, number> = { 'trend-mile': 8 }

export function CompleteScreen() {
  const zoneId = useGame((s) => s.zoneId)
  const moments = useGame((s) => s.moments)
  const total = useGame((s) => s.totalMoments)
  const toMenu = useGame((s) => s.toMenu)
  const startZone = useGame((s) => s.startZone)
  const zone = zoneById(zoneId)
  const next = zone?.next ? zoneById(zone.next) : undefined

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [])

  const all = total > 0 && moments >= total
  const closing = all
    ? 'You noticed everything here. Nothing asked you to. That is rather the point.'
    : moments > 0
      ? 'You stopped, a few times, and looked. The place is still here. So are you.'
      : 'You made it through. Next time, try stepping out. There was more to see.'

  return (
    <div className="overlay">
      <div className="card">
        <div className="eyebrow">{zone?.name ?? 'A place'}</div>
        <h2>You stepped out.</h2>
        <p>{closing}</p>
        <div className="tally">
          moments noticed: <b>{moments}</b> / {total}
        </div>
        <div className="actions">
          <button
            className="btn"
            onClick={() => zoneId && startZone(zoneId, MOMENT_COUNT[zoneId] ?? total)}
          >
            Wander again
          </button>
          <button className="btn ghost" onClick={toMenu}>
            Back to the map
          </button>
        </div>
        {next && <div className="next-note">Next: {next.name} — coming soon.</div>}
      </div>
    </div>
  )
}
