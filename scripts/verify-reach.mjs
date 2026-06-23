import puppeteer from 'puppeteer'

// Framerate-independent checks for The Trend Mile obby. The textured scene runs
// the headless sim too slowly to replay precise platforming or wait out a morph,
// so we verify the decisive, timing-free things using debug hooks:
//   - the mid-air-molt target (a hidden plank) is solid ONLY while bare,
//   - a fall respawns to the right per-zone checkpoint,
//   - the goal (up high, off to the side) completes the zone.
// Raw jump distances are all within the documented movement budget (dash gap
// 5.5 m < ~6-7; +x double-jump 3.5 m flat / 2 m up; molt-switch 3.4 m on a
// suited jump that clears ~5 m), so they are not re-measured here.
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
const setSuit = (v) => page.evaluate((b) => globalThis.__moltDebug.setSuit(b), v)
async function clickText(t) {
  await page.evaluate((tt) => { const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').toLowerCase().includes(tt)); if (!el) throw new Error('no button ' + tt); el.click() }, t)
}
async function settle(frames = 40) {
  let p = await pos()
  for (let i = 0; i < frames; i++) { await wait(120); p = await pos() }
  return p
}
const results = []
const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`) }

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(700)
  await clickText('begin'); await wait(400)
  await clickText('trend mile'); await wait(3000)
  await page.click('canvas').catch(() => {})

  // The mid-air-molt landing plank (HID1, top y 1.2 at z -52) is a HiddenPlatform.
  // Suited -> not solid -> falls away. Bare -> solid -> stands.
  await setSuit(true)
  await tp(6, 2.7, -52)
  const sFall = await settle()
  check('TM hidden plank not solid while suited', sFall.y < 0.5 || sFall.z > -42, JSON.stringify(sFall))

  await setSuit(false)
  await tp(6, 2.7, -52)
  const bStand = await settle()
  check('TM hidden plank solid while bare', bStand.y > 1.4 && bStand.z < -48, JSON.stringify(bStand))

  // Drop just under the kill-plane in the first big gap -> respawns to CP1 (~z -19).
  await tp(0, -8, -24)
  const cp = await settle()
  check('TM CP1 respawn', cp.z > -22 && cp.z < -16 && cp.y > 1.4, JSON.stringify(cp))

  // Reaching the high, offset goal completes the zone.
  await tp(6, 8.6, -82)
  await wait(2600)
  const done = await page.$eval('.card h2', (e) => e.textContent.trim()).catch(() => '')
  check('TM goal completes', /stepped out/i.test(done), `"${done}"`)

  console.log('\nconsole errors:', errors.length ? errors.join(' | ') : '(none)')
  const ok = results.every(Boolean) && errors.length === 0
  console.log(ok ? '\nPASS: Trend Mile twist, checkpoint and goal all work.' : '\nFAIL: see above.')
  await browser.close()
  process.exit(ok ? 0 : 1)
} catch (e) {
  console.log('SCRIPT ERROR:', e.message, '| console:', errors.join(' | '))
  await browser.close()
  process.exit(1)
}
