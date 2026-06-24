import { useEffect, useRef, useState } from 'react'
import { useGame } from '../game/store'
import { playerPos } from '../game/fx'

// The suit talks. CARAPACE Mk.III is a personal shell with the soul of an
// instruction manual: clipped directives, numbered, and quietly convinced it is
// doing you a favor. It only narrates the first couple of zones (the tutorial).

type Snap = { x: number; y: number; z: number; suited: boolean; everBare: boolean; moments: number; min: number }
type Line = { text: string; ready: (s: Snap) => boolean }

const SCRIPTS: Record<string, Line[]> = {
  'trend-mile': [
    { ready: () => true, text: 'CARAPACE Mk.III online. Greetings, OCCUPANT. You are now wearing me. Please do not take it personally.' },
    { ready: (s) => s.z < 9, text: 'Locomotion: nominal. The legs are yours. The composure is mine.' },
    { ready: (s) => s.z < 6 && s.y < 2.6, text: 'DIRECTIVE 01 // that ledge is too high for one jump. So jump, and then jump AGAIN in mid-air. The second one is a feature. You are welcome.' },
    { ready: (s) => s.y > 3.5, text: 'Elevation achieved. I never doubted you. (I am required to say that.)' },
    { ready: (s) => s.y > 3.5, text: 'DIRECTIVE 02 // the path ahead looks missing. It is not. Press Q to MOLT, shed me, and your bare eyes will find what the shell politely hides.' },
    { ready: (s) => s.everBare, text: 'Shell disengaged. Brr. You are slower and colder now, and you can see everything. Growth tends to feel like that.' },
    { ready: (s) => s.moments >= 1, text: 'That glow is a MOMENT. Gather them. The exit stays shut until you have enough. I do not make the rules. I am, technically, the rules.' },
    { ready: (s) => s.z < -11, text: 'DIRECTIVE 03 // this gap is too wide for the bare. Press Q to seal me back on and borrow my reach. See? A team. A reluctant one.' },
    { ready: (s) => s.z < -23, text: 'DIRECTIVE 04 // advanced. Leap with the shell ON for distance, then MOLT in the air so the far plank turns solid beneath you. Mistime it and you fall, and I will narrate the fall.' },
    { ready: (s) => s.z < -43, text: 'Final ascent. Double-jump, turn, repeat. The exit sits up and off to one side, because nothing worth reaching is ever in a straight line.' },
    { ready: (s) => s.moments >= s.min && s.min > 0, text: 'Minimum moments secured. The way is open. Onward, OCCUPANT. The next place rains, and I will remind you that I am not waterproof.' },
  ],
  'glasshouse': [
    { ready: () => true, text: 'CARAPACE Mk.III, still online, now damp. Welcome to the Glasshouse. Mind the water. The brochure promised waterproof. The brochure lied.' },
    { ready: (s) => s.z < 6, text: 'DIRECTIVE // a wide gap. A running double-jump clears it. And no, the DASH is still locked: requisition pending. Ask me again two places from now.' },
    { ready: (s) => s.z < -6, text: 'The water is a story the shell tells you. MOLT in the air and the story becomes a path. Cross it before the rain talks you out of being bare.' },
    { ready: (s) => s.everBare, text: 'Bare again. Good. The planks only hold for the unshelled. Keep moving; standing water and standing still tend to end the same way.' },
    { ready: (s) => s.z < -22, text: 'Squall ahead. Your exposure drains inside it. Hurry, or I reassemble around you, uninvited, mid-stride.' },
    { ready: (s) => s.z < -40, text: 'Up we go. Seal the shell, climb, and try not to look down. I will be looking down for the both of us.' },
    { ready: (s) => s.z < -50, text: 'DIRECTIVE // the long one. A full double-jump for the distance, a MOLT in the air to land. You have done this before. Mostly.' },
    { ready: (s) => s.moments >= s.min && s.min > 0, text: 'Exit ahead. You are, regrettably, getting good at this. I will deny having said so.' },
  ],
}

export function SuitGuide() {
  const screen = useGame((s) => s.screen)
  const zoneId = useGame((s) => s.zoneId)
  const [msg, setMsg] = useState('')
  const [typed, setTyped] = useState('')
  const idx = useRef(0)
  const everBare = useRef(false)
  const lastShown = useRef(0)

  // Reset the script whenever the zone changes.
  useEffect(() => {
    idx.current = 0
    everBare.current = false
    lastShown.current = 0
    setMsg('')
    setTyped('')
  }, [zoneId])

  // Advance the script from polled game + player state (cheap, off the render path).
  useEffect(() => {
    if (screen !== 'play') return
    const script = SCRIPTS[zoneId ?? ''] || []
    const iv = setInterval(() => {
      const g = useGame.getState()
      if (g.paused || g.finishing) return
      if (!g.suited) everBare.current = true
      const snap: Snap = { x: playerPos.x, y: playerPos.y, z: playerPos.z, suited: g.suited, everBare: everBare.current, moments: g.moments, min: g.minMoments }
      const now = Date.now()
      if (idx.current < script.length && now - lastShown.current > 3600 && script[idx.current].ready(snap)) {
        setMsg(script[idx.current].text)
        setTyped('')
        lastShown.current = now
        idx.current++
      } else if (lastShown.current && now - lastShown.current > 11000) {
        setMsg('')
      }
    }, 160)
    return () => clearInterval(iv)
  }, [screen, zoneId])

  // Typewriter reveal.
  useEffect(() => {
    if (!msg) return
    let i = 0
    const t = setInterval(() => {
      i += 2
      setTyped(msg.slice(0, i))
      if (i >= msg.length) clearInterval(t)
    }, 22)
    return () => clearInterval(t)
  }, [msg])

  if (screen !== 'play' || !msg) return null

  return (
    <div className="suit-guide" aria-live="polite">
      <style>{`
        .suit-guide{position:fixed;left:16px;bottom:64px;max-width:380px;z-index:40;pointer-events:none;
          font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
          background:linear-gradient(180deg,rgba(20,26,30,0.86),rgba(14,18,22,0.92));
          border:1px solid rgba(168,230,207,0.35);border-left:3px solid #a8e6cf;border-radius:8px;
          box-shadow:0 6px 24px rgba(0,0,0,0.35);overflow:hidden;animation:sg-in .25s ease-out}
        @keyframes sg-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .suit-guide .sg-head{display:flex;align-items:center;gap:8px;padding:6px 10px;
          background:rgba(168,230,207,0.10);border-bottom:1px solid rgba(168,230,207,0.18);
          font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#a8e6cf}
        .suit-guide .sg-dot{width:8px;height:8px;border-radius:50%;background:#a8e6cf;
          box-shadow:0 0 8px #a8e6cf;animation:sg-blink 1.3s steps(1) infinite}
        @keyframes sg-blink{0%,60%{opacity:1}61%,100%{opacity:0.25}}
        .suit-guide .sg-tag{opacity:0.6;margin-left:auto;letter-spacing:0.1em}
        .suit-guide .sg-body{padding:9px 11px 11px;color:#eef4f1;font-size:13px;line-height:1.5}
        .suit-guide .sg-cursor{display:inline-block;width:7px;color:#a8e6cf;animation:sg-blink 0.8s steps(1) infinite}
      `}</style>
      <div className="sg-head">
        <span className="sg-dot" />
        CARAPACE Mk.III
        <span className="sg-tag">advisory</span>
      </div>
      <div className="sg-body">
        {typed}
        <span className="sg-cursor">{typed.length < msg.length ? '█' : ''}</span>
      </div>
    </div>
  )
}
