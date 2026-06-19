import puppeteer from 'puppeteer'

const URL = 'http://localhost:5173/'
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1000, height: 640 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const pos = () => page.evaluate(() => {
  const p = globalThis.__moltPos
  return p ? { x: p.x, y: p.y, z: p.z } : null
})
const teleport = (x, y, z) => page.evaluate(([tx, ty, tz]) => {
  if (!globalThis.__moltDebug) throw new Error('missing __moltDebug')
  globalThis.__moltDebug.teleport(tx, ty, tz)
}, [x, y, z])
async function clickText(t) {
  await page.evaluate((tt) => {
    const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').toLowerCase().includes(tt.toLowerCase()))
    if (!el) throw new Error('no button ' + tt); el.click()
  }, t)
}
// Sample peak rise above a baseline y while doing something, then settle.
async function jumpAndMeasure(holdKey) {
  await page.click('canvas').catch(() => {})
  const base = (await pos()).y
  if (holdKey) await page.keyboard.down(holdKey)
  await page.keyboard.press('Space')
  let peak = base
  let minY = base
  let maxX = (await pos()).x
  for (let i = 0; i < 26; i++) {
    await wait(45)
    const p = await pos()
    peak = Math.max(peak, p.y)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
  }
  if (holdKey) await page.keyboard.up(holdKey)
  return { rise: +(peak - base).toFixed(3), drop: +(base - minY).toFixed(3), base: +base.toFixed(2), maxX: +maxX.toFixed(2) }
}

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(700)
  await clickText('Begin'); await wait(400)
  await clickText('Trend Mile'); await wait(3000) // settle on the ground
  await page.click('canvas').catch(() => {})

  // 1) Free jump apex (no wall).
  const free = await jumpAndMeasure(null)
  await wait(4000) // settle back to the ground (headless runs slow, so wait generously)

  // 2) Start just inside the +x side wall (inner face x ~ 11.6), then jump while pushing into it.
  await teleport(11.05, free.base, 8.5)
  await wait(900)
  await page.keyboard.down('d')
  await wait(1200)
  const atWall = await pos()
  const wall = await jumpAndMeasure('d') // keeps 'd' held (pushing into wall) during the jump
  await page.keyboard.up('d')

  const preserved = wall.rise >= free.rise * 0.8
  const jumpedFreely = free.rise > 1.2
  const reachedWall = atWall.x > 10.85 // got close enough to actually press the wall
  const blockedHoriz = wall.maxX - atWall.x < 0.35 // didn't push meaningfully further into wall

  console.log('free jump   :', JSON.stringify(free))
  console.log('at wall x   :', atWall.x.toFixed(2), reachedWall ? '(reached wall)' : '(failed to reach wall)')
  console.log('wall jump   :', JSON.stringify(wall))
  console.log('free jump baseline valid       :', jumpedFreely)
  console.log('vertical preserved against wall:', preserved, `(wall rise ${wall.rise} vs free ${free.rise})`)
  console.log('horizontal blocked by wall     :', blockedHoriz, `(x moved ${(wall.maxX - atWall.x).toFixed(2)})`)
  console.log('console errors:', errors.length ? errors.join(' | ') : '(none)')

  await page.screenshot({ path: 'shot-wall.png' })
  const ok = jumpedFreely && preserved && reachedWall && blockedHoriz && errors.length === 0
  console.log(ok ? '\nPASS: per-axis wall collision works (vertical preserved against wall).' : '\nFAIL: check results above.')
  await browser.close()
  process.exit(ok ? 0 : 1)
} catch (e) {
  console.log('SCRIPT ERROR:', e.message, '| console:', errors.join(' | '))
  await browser.close()
  process.exit(1)
}
