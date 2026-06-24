import puppeteer from 'puppeteer'

// Framerate-independent checks for The Glasshouse obby: a nave water-route plank
// is solid only while bare, the goal is gated on the moment minimum, and once it
// is met the goal completes. Also saves before/after screenshots. The dash /
// double-jump / mid-air-molt combos are within the documented budget and are not
// replayed here (headless renders the textured scene too slowly for that).
const URL = 'http://localhost:5173/'
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1100, height: 700 })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('molt-progress', JSON.stringify({
    state: { unlocked: ['trend-mile', 'glasshouse'], completed: ['trend-mile'] }, version: 0,
  }))
})

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const pos = () => page.evaluate(() => { const p = globalThis.__moltPos; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) } })
const tp = (x, y, z) => page.evaluate(([a, b, c]) => globalThis.__moltDebug.teleport(a, b, c), [x, y, z])
const setSuit = (v) => page.evaluate((b) => globalThis.__moltDebug.setSuit(b), v)
const addMoment = () => page.evaluate(() => globalThis.__moltDebug.addMoment())
const complete = () => page.$eval('.card h2', (e) => e.textContent.trim()).catch(() => '')
const hud = () => page.$eval('.state-pill', (e) => e.textContent.trim()).catch(() => '')
async function clickText(t) {
  await page.evaluate((tt) => { const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').toLowerCase().includes(tt.toLowerCase())); if (!el) throw new Error('no button ' + tt); el.click() }, t)
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
  await clickText('glasshouse'); await wait(5000)
  const haveCanvas = !!(await page.$('canvas'))
  check('GH renders', haveCanvas, `canvas=${haveCanvas}, hud="${await hud()}"`)
  await page.screenshot({ path: 'shot-glasshouse-suited.png' })
  await page.click('canvas').catch(() => {})

  // A nave water-route plank (W2, top y 0.6 at z -21, clear of the gust) is bare-only.
  await setSuit(true)
  await tp(-3, 1.6, -21)
  const sFall = await settle()
  // Fell through the (non-solid) plank: dropped well below it, or respawned to CP1.
  check('GH water-route not solid while suited', sFall.y < 0 || sFall.z > -18, JSON.stringify(sFall))

  await setSuit(false)
  await tp(-3, 1.6, -21)
  const bStand = await settle()
  await page.screenshot({ path: 'shot-glasshouse-bare.png' })
  check('GH water-route solid while bare', bStand.z < -18 && bStand.y > 1.0, JSON.stringify(bStand))

  // Goal gated under the minimum (moments 0).
  await tp(0, 6, -76)
  await wait(5000)
  check('GH goal gated under the minimum', !/stepped out/i.test(await complete()), `"${await complete()}"`)

  // Meet the minimum, then the goal completes after its flourish.
  for (let i = 0; i < 6; i++) await addMoment()
  await tp(0, 6, -76)
  let done = ''
  for (let i = 0; i < 90 && !/stepped out/i.test(done); i++) { await wait(500); done = await complete() }
  check('GH goal completes once minimum met', /stepped out/i.test(done), `"${done}"`)

  console.log('\nconsole errors:', errors.length ? errors.join(' | ') : '(none)')
  const ok = results.every(Boolean) && errors.length === 0
  console.log(ok ? '\nPASS: Glasshouse twist, moment-gate and goal all work.' : '\nFAIL: see above.')
  await browser.close()
  process.exit(ok ? 0 : 1)
} catch (e) {
  console.log('SCRIPT ERROR:', e.message, '| console:', errors.join(' | '))
  await browser.close()
  process.exit(1)
}
