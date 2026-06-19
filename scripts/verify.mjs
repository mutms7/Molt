import puppeteer from 'puppeteer'

const URL = 'http://localhost:5173/'
const errors = []
const logs = []

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 760 })

page.on('console', (m) => {
  const t = m.type()
  const text = m.text()
  logs.push(`[${t}] ${text}`)
  if (t === 'error') errors.push(text)
})
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`) })

async function clickText(text) {
  await page.evaluate((t) => {
    const els = [...document.querySelectorAll('button')]
    const el = els.find((b) => (b.textContent || '').toLowerCase().includes(t.toLowerCase()))
    if (!el) throw new Error('no button containing: ' + t)
    el.click()
  }, text)
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(800)
  console.log('TITLE ok:', await page.$eval('.title-name', (e) => e.textContent.trim()))

  await clickText('Begin')
  await wait(500)
  console.log('SELECT ok:', await page.$$eval('.zone-card', (n) => n.length) + ' zone cards')

  await clickText('Trend Mile')
  await wait(4000) // let the Canvas, physics, postprocessing initialize and run frames

  const hasCanvas = await page.$('canvas')
  console.log('CANVAS present:', !!hasCanvas)
  console.log('HUD state:', await page.$eval('.state-pill', (e) => e.textContent.trim()).catch(() => 'no HUD'))

  // Capture the suited (muted) state.
  await page.screenshot({ path: 'shot-suited.png' })

  // Toggle to bare and let the color flood animate in.
  await page.focus('canvas').catch(() => {})
  await page.keyboard.press('q')
  await wait(1400)
  await page.screenshot({ path: 'shot-bare.png' })
  console.log('BARE HUD:', await page.$eval('.state-pill', (e) => e.textContent.trim()).catch(() => '?'))

  // Exercise movement + jump while bare (hits physics + ground ray paths).
  await page.keyboard.down('w')
  await wait(500)
  await page.keyboard.press('Space')
  await wait(500)
  await page.keyboard.up('w')
  await wait(600)
  console.log('SCREENSHOTS saved: shot-suited.png, shot-bare.png')
} catch (e) {
  errors.push('SCRIPT: ' + e.message)
}

await browser.close()

console.log('\n===== CONSOLE ERRORS =====')
console.log(errors.length ? errors.join('\n') : '(none)')
console.log('\n===== HTTP 4xx/5xx =====')
console.log(logs.filter((l) => l.startsWith('[http')).join('\n') || '(none)')
console.log('\n===== WARN/LOG TAIL =====')
console.log(logs.filter((l) => l.startsWith('[warn]') || l.startsWith('[error]')).slice(-20).join('\n') || '(no warnings)')
process.exit(errors.length ? 1 : 0)
