import puppeteer from 'puppeteer'

// Smoke test for The Glasshouse (zone 2) plus a check of its core twist:
// the water-routes across the flooded nave are solid ONLY while bare.
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

// Unlock the glasshouse before the app boots (it normally unlocks by finishing Trend Mile).
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('molt-progress', JSON.stringify({
    state: { unlocked: ['trend-mile', 'glasshouse'], completed: ['trend-mile'] },
    version: 0,
  }))
})

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const pos = () => page.evaluate(() => {
  const p = globalThis.__moltPos
  return p ? { x: p.x, y: p.y, z: p.z } : null
})
const teleport = (x, y, z) => page.evaluate(([tx, ty, tz]) => globalThis.__moltDebug.teleport(tx, ty, tz), [x, y, z])
async function clickText(t) {
  await page.evaluate((tt) => {
    const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').toLowerCase().includes(tt.toLowerCase()))
    if (!el) throw new Error('no button ' + tt); el.click()
  }, t)
}
const hud = () => page.$eval('.state-pill', (e) => e.textContent.trim()).catch(() => '')
async function waitForHud(text, timeout = 8000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    if ((await hud()).toLowerCase().includes(text.toLowerCase())) return
    await wait(120)
  }
  throw new Error('HUD did not show: ' + text)
}
async function settle(frames = 55) {
  // Headless clamps the sim dt and runs at a low frame rate, so falls advance
  // slowly in wall-clock time. Wait generously, then report where we end up.
  let last = await pos()
  for (let i = 0; i < frames; i++) { await wait(120); last = await pos() }
  return last
}

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(700)
  await clickText('Begin'); await wait(400)
  await clickText('Glasshouse'); await wait(3500)

  const haveCanvas = !!(await page.$('canvas'))
  console.log('CANVAS present :', haveCanvas)
  console.log('HUD (suited)   :', await hud())
  await page.screenshot({ path: 'shot-glasshouse-suited.png' })

  await page.click('canvas').catch(() => {})

  // --- twist check: a water-route stone is solid bare, not solid suited ---
  const stone = [0, 0.95, -16.0] // a HiddenPlatform sits with its top at y 0 here

  // (1) Suited: stand on the stone position -> no collider, so fall away/respawn.
  await teleport(stone[0], stone[1], stone[2])
  const suitedRest = await settle()
  // Either dropped well below the stone, or the kill-plane respawned us off the nave.
  const suitedFellThrough = suitedRest.y < -0.5 || suitedRest.z > -10
  console.log('suited on stone:', JSON.stringify(suitedRest), suitedFellThrough ? '(fell through / respawned)' : '(DID NOT fall - BAD)')

  // (2) Bare: same spot -> the water-route is now solid, so we hold our footing.
  await page.keyboard.press('q')
  await waitForHud('Bare')
  await page.screenshot({ path: 'shot-glasshouse-bare.png' })
  await teleport(stone[0], stone[1], stone[2])
  const bareRest = await settle()
  const bareStands = bareRest.y > 0.6 && bareRest.z < -12 // still up on the stone, didn't fall
  console.log('bare on stone  :', JSON.stringify(bareRest), bareStands ? '(stands on water-route)' : '(fell - BAD)')

  // --- reaching the goal (on the high far bank) completes the zone ---
  await teleport(0, 4.6, -67)
  await wait(1200)
  const completed = await page.$eval('.card h2', (e) => e.textContent.trim()).catch(() => '')
  console.log('goal reached   :', completed ? `complete screen: "${completed}"` : '(no complete screen - BAD)')

  console.log('console errors :', errors.length ? errors.join(' | ') : '(none)')

  const ok = haveCanvas && suitedFellThrough && bareStands && /stepped out/i.test(completed) && errors.length === 0
  console.log(ok ? '\nPASS: Glasshouse renders, bare-only water-routes work, goal completes.' : '\nFAIL: check results above.')
  await browser.close()
  process.exit(ok ? 0 : 1)
} catch (e) {
  console.log('SCRIPT ERROR:', e.message, '| console:', errors.join(' | '))
  await browser.close()
  process.exit(1)
}
