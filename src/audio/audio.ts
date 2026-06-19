// Procedural Web Audio engine. No audio files shipped.
// The "suit filter" is a real low-pass: muffled when suited, open when bare.
// The hummed melody (the motif) bypasses the filter and fades in with bareness.

type Note = { f: number; d: number }

// A gentle, wistful phrase (A minor pentatonic-ish). 0 = rest.
const MELODY: Note[] = [
  { f: 440.0, d: 0.45 }, { f: 587.33, d: 0.45 }, { f: 659.25, d: 0.6 }, { f: 523.25, d: 0.45 },
  { f: 0, d: 0.3 }, { f: 493.88, d: 0.45 }, { f: 440.0, d: 0.9 }, { f: 0, d: 0.9 },
]

class Engine {
  ctx: AudioContext | null = null
  private master!: GainNode
  private filter!: BiquadFilterNode
  private padGain!: GainNode
  private humGain!: GainNode
  private timer: number | null = null
  private idx = 0
  private nextT = 0

  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor()
    this.ctx = ctx

    this.master = ctx.createGain()
    this.master.gain.value = 0.0001
    this.master.connect(ctx.destination)
    this.master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.5)

    // The suit's low-pass filter.
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 600
    this.filter.Q.value = 0.6
    this.filter.connect(this.master)

    // Ambient pad through the filter.
    this.padGain = ctx.createGain()
    this.padGain.gain.value = 0.0001
    this.padGain.connect(this.filter)
    this.padGain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 3)
    const chord = [110, 164.81, 220, 277.18]
    chord.forEach((f, i) => {
      const o = ctx.createOscillator()
      o.type = i % 2 ? 'sine' : 'triangle'
      o.frequency.value = f
      o.detune.value = (i - 1) * 4
      const g = ctx.createGain()
      g.gain.value = i === 0 ? 0.5 : 0.26
      o.connect(g); g.connect(this.padGain)
      o.start()
    })
    // Slow breathing.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lg = ctx.createGain()
    lg.gain.value = 0.025
    lfo.connect(lg); lg.connect(this.padGain.gain)
    lfo.start()

    // Hum bus bypasses the filter so it "breaks through" when bare.
    this.humGain = ctx.createGain()
    this.humGain.gain.value = 0.0001
    this.humGain.connect(this.master)

    this.nextT = ctx.currentTime + 0.4
    this.timer = window.setInterval(() => this.schedule(), 30)
  }

  private schedule() {
    const ctx = this.ctx
    if (!ctx) return
    while (this.nextT < ctx.currentTime + 0.2) {
      const n = MELODY[this.idx % MELODY.length]
      this.idx++
      if (n.f > 0) {
        const o = ctx.createOscillator()
        o.type = 'triangle'
        o.frequency.value = n.f
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, this.nextT)
        g.gain.exponentialRampToValueAtTime(0.5, this.nextT + 0.04)
        g.gain.exponentialRampToValueAtTime(0.0008, this.nextT + n.d * 0.95)
        o.connect(g); g.connect(this.humGain)
        o.start(this.nextT)
        o.stop(this.nextT + n.d + 0.05)
      }
      this.nextT += n.d
    }
  }

  setBareness(b: number) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const cutoff = 380 * Math.pow(40, b) // ~380Hz muffled -> ~15kHz open
    this.filter.frequency.setTargetAtTime(cutoff, t, 0.12)
    this.humGain.gain.setTargetAtTime(b * 0.8, t, 0.15)
  }

  molt(toSuited: boolean) {
    if (!this.ctx) return
    const ctx = this.ctx, t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.32)
    o.connect(g); g.connect(this.master)
    if (toSuited) {
      o.frequency.setValueAtTime(700, t)
      o.frequency.exponentialRampToValueAtTime(180, t + 0.3)
    } else {
      o.frequency.setValueAtTime(220, t)
      o.frequency.exponentialRampToValueAtTime(1300, t + 0.3)
    }
    o.start(t)
    o.stop(t + 0.35)
  }

  chime() {
    if (!this.ctx) return
    const ctx = this.ctx, t = ctx.currentTime
    ;[880, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = ctx.createGain()
      const st = t + i * 0.06
      g.gain.setValueAtTime(0.0001, st)
      g.gain.exponentialRampToValueAtTime(0.16, st + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0006, st + 0.25)
      o.connect(g); g.connect(this.master)
      o.start(st)
      o.stop(st + 0.3)
    })
  }
}

export const audio = new Engine()
