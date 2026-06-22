import puppeteer from 'puppeteer'

// Reachability checks for The Trend Mile's two riskiest jumps, played for real
// (hold forward, dash, jump) rather than asserted:
//   1. the 6 m gap clears with a suited dash-jump, and a bare jump falls short
//      (which also exercises the CP1 respawn).
//   2. the 1.7 m finale step is climbable suited.
const URL = 'http://localhost:5173/'
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1000, height: 640 })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const pos = () => page.evaluate(() => { const p = globalThis.__moltPos; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) } })
const tp = (x, y, z) => page.evaluate(([a, b, c]) => globalThis.__moltDebug.teleport(a, b, c), [x, y, z])
const hud = () => page.$eval('.state-pill', (e) => e.textContent.trim()).catch(() => '')
async function clickText(t) {
  await page.evaluate((tt) => { const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').toLowerCase().includes(tt)); if (!el) throw new Error('no button ' + tt); el.click() }, t)
}
async function ensureState(wantSuited) {
  const isSuited = (await hud()).toLowerCase().includes('suited')
  if (isSuited !== wantSuited) { await page.keyboard.press('q'); await wait(900) }
}
// Run forward from a spot, optionally dashing, optionally jumping, and report
// the furthest -z reached plus where we end up.
async function run({ from, suited, dash, jump }) {
  await ensureState(suited)
  await tp(from[0], from[1], from[2])
  await wait(500)
  await page.keyboard.down('w')
  await wait(140)
  if (dash) { await page.keyboard.down('Shift'); await page.keyboard.up('Shift') }
  await wait(70)
  if (jump) { await page.keyboard.press('Space') }
  let minZ = (await pos()).z
  for (let i = 0; i < 45; i++) { await wait(90); const p = await pos(); minZ = Math.min(minZ, p.z) }
  await page.keyboard.up('w')
  await wait(400)
  const end = await pos()
  return { minZ: +minZ.toFixed(2), end }
}

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(700)
  await clickText('begin'); await wait(400)
  await clickText('trend mile'); await wait(3000)
  await page.click('canvas').catch(() => {})

  // 1) Checkpoints are monotonic, so test the earliest one first on fresh state:
  // a fall into the dash gap respawns to CP1 (the per-zone checkpoint, ~z -3).
  await tp(0, 2.0, -11)
  let rest = await pos()
  for (let i = 0; i < 40; i++) { await wait(110); rest = await pos() }
  const respawned = rest.z > -5 && rest.z < -1 && rest.y > 0.6 && rest.y < 1.8
  console.log('CP1 respawn    :', JSON.stringify(rest), respawned ? '(back on plaza B ~z-3)' : '(WRONG respawn)')

  // 2a) suited dash-jump across the 6 m gap (P_B front z-8 -> P_C z-14..-23).
  const sd = await run({ from: [0, 0.95, -6.5], suited: true, dash: true, jump: true })
  const suitedCrossed = sd.minZ < -14 && sd.end.y > 0.5 && sd.end.z < -13
  console.log('suited dash gap:', JSON.stringify(sd), suitedCrossed ? '(crossed to C)' : '(FAILED to cross)')

  // 2b) bare can't make it: never reaches C (it falls in and keeps respawning).
  const bd = await run({ from: [0, 0.95, -6.5], suited: false, dash: false, jump: true })
  const bareFell = bd.minZ > -13.5
  console.log('bare    dash gap:', JSON.stringify(bd), bareFell ? '(fell short, never reached C)' : '(unexpectedly crossed)')

  // 3) suited 1.7 m finale step-up (P_D top 0 -> S1 top 1.7 at z -40..-44).
  const climb = await run({ from: [0, 0.95, -39], suited: true, dash: false, jump: true })
  const climbed = climb.end.y > 2.3 && climb.minZ < -40
  console.log('suited step-up :', JSON.stringify(climb), climbed ? '(up onto S1)' : '(FAILED to climb)')

  console.log('console errors :', errors.length ? errors.join(' | ') : '(none)')
  const ok = suitedCrossed && bareFell && respawned && climbed && errors.length === 0
  console.log(ok ? '\nPASS: dash gap is suited-only, CP1 respawn works, finale step climbable.' : '\nFAIL: check results above.')
  await browser.close()
  process.exit(ok ? 0 : 1)
} catch (e) {
  console.log('SCRIPT ERROR:', e.message, '| console:', errors.join(' | '))
  await browser.close()
  process.exit(1)
}
