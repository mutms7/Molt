import puppeteer from 'puppeteer'

// Framerate-independent checks for The Trend Mile obby (the textured scene runs
// the headless sim too slowly to replay precise platforming, so we verify the
// decisive, timing-free things via debug hooks): the bare-only plank is solid
// only while bare, a fall respawns to the right checkpoint, the goal is gated on
// the moment minimum, and once the minimum is met the goal completes the zone.
// Raw jump distances are within the documented (retuned) budget: suited single
// ~3.5 up / ~8 flat, double-jump ~7 up, bare ~4.6 flat.
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
const addMoment = () => page.evaluate(() => globalThis.__moltDebug.addMoment())
const complete = () => page.$eval('.card h2', (e) => e.textContent.trim()).catch(() => '')
async function clickText(t) {
  await page.evaluate((tt) => { const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').toLowerCase().includes(tt)); if (!el) throw new Error('no button ' + tt); el.click() }, t)
}
async function settle(frames = 55) {
  let p = await pos()
  for (let i = 0; i < frames; i++) { await wait(130); p = await pos() }
  return p
}
const results = []
const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`) }

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(700)
  await clickText('begin'); await wait(400)
  await clickText('trend mile'); await wait(5000)
  await page.click('canvas').catch(() => {})

  // 1. CP1 respawn (checkpoints are monotonic, so test the first one on fresh state):
  // drop below the kill-plane in the first gap -> respawns onto A1 (~z 1, y ~5.3).
  await tp(0, -5, -5)
  const cp = await settle()
  check('TM CP1 respawn (onto A1)', cp.z > -2 && cp.z < 4 && cp.y > 4, JSON.stringify(cp))

  // 2/3. The mid-air-molt plank (E1, top y 1.5 at z -34) is bare-only.
  await setSuit(true)
  await tp(0, 2.7, -34.1)
  const sFall = await settle()
  check('TM plank not solid while suited', sFall.z > -30, JSON.stringify(sFall))

  await setSuit(false)
  await tp(0, 2.7, -34.1)
  const bStand = await settle()
  check('TM plank solid while bare', bStand.z < -32 && bStand.y > 1.4, JSON.stringify(bStand))

  // 4. Goal is gated: under the minimum (moments 0), reaching it does not complete.
  await tp(4, 11, -54)
  await wait(5000)
  check('TM goal gated under the minimum', !/stepped out/i.test(await complete()), `"${await complete()}"`)

  // 5. Meet the minimum, then the goal flourishes and completes (~2 s flourish,
  // which is many wall-seconds at the headless framerate, so poll generously).
  for (let i = 0; i < 5; i++) await addMoment()
  await tp(4, 11, -54)
  let done = ''
  for (let i = 0; i < 90 && !/stepped out/i.test(done); i++) { await wait(500); done = await complete() }
  check('TM goal completes once minimum met', /stepped out/i.test(done), `"${done}"`)

  console.log('\nconsole errors:', errors.length ? errors.join(' | ') : '(none)')
  const ok = results.every(Boolean) && errors.length === 0
  console.log(ok ? '\nPASS: Trend Mile twist, checkpoint, moment-gate and goal all work.' : '\nFAIL: see above.')
  await browser.close()
  process.exit(ok ? 0 : 1)
} catch (e) {
  console.log('SCRIPT ERROR:', e.message, '| console:', errors.join(' | '))
  await browser.close()
  process.exit(1)
}
