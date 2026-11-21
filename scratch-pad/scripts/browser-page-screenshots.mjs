// Starts the built tool with an invented scratch pad and takes screenshots of
// the browser page and of the gallery with headless Chrome.
// Usage: node scripts/browser-page-screenshots.mjs <output folder>
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import puppeteer from 'puppeteer-core'
import { indexPage, invoiceTemplatePage, retryLimitPage } from './example-scratch-pad.mjs'

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const tool = resolve('dist/scratch-pad')
const output = resolve(process.argv[2] ?? 'screenshots')
const home = mkdtempSync(join(tmpdir(), 'scratch-pad-screens-'))
const environment = { ...process.env, SCRATCH_PADS_HOME: home }
const pad = basename(
  run('new', 'Invoice export')
    .split('\n')[0]
    .replace(/^created /, ''),
)
environment.SCRATCH_PAD = pad
const checks = {}

function run(...words) {
  return execFileSync(process.execPath, [tool, ...words], { env: environment, encoding: 'utf8' })
}

function freePort() {
  return new Promise((resolvePort) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolvePort(port))
    })
  })
}

function servedGallery(port) {
  const root = resolve('storybook-static')
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  }
  const server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname
    const file = join(root, path === '/' ? 'index.html' : path)
    try {
      response.writeHead(200, {
        'content-type': types[extname(file)] ?? 'application/octet-stream',
      })
      response.end(readFileSync(file))
    } catch {
      response.writeHead(404).end()
    }
  })
  return new Promise((resolveServer) =>
    server.listen(port, '127.0.0.1', () => resolveServer(server)),
  )
}

function writePages() {
  run('goal', 'Ship the invoice export job.')
  run('task', 'add', 'Design the export job')
  run('task', 'add', 'Write the invoice template')
  run('task', 'add', 'Check the retry limit')
  run('task', 'start', '1')
  run('task', 'done', '1')
  run('decide', 'The export job runs every night.')
  run('decide', 'A guest without a company sees the word Private.')
  const pages = join(home, pad, 'pages')
  writeFileSync(join(pages, 'index.md'), indexPage)
  writeFileSync(join(pages, 'invoice-template.md'), invoiceTemplatePage)
  writeFileSync(join(pages, 'retry-limit.md'), retryLimitPage)
  checks.check = run('check').trim()
}

async function shoot(page, name) {
  await new Promise((resolveWait) => setTimeout(resolveWait, 300))
  await page.screenshot({ path: join(output, `${name}.png`) })
}

async function openPad(page, path = '') {
  await page.goto(`${checks.address}${pad}/${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('article h1')
}

async function pageShots(page) {
  await page.setViewport({ width: 1440, height: 900 })
  await openPad(page)
  await shoot(page, '01-page-1440')

  await page.evaluate(() =>
    document.querySelector('figure.code-block').scrollIntoView({ block: 'center' }),
  )
  await page.click('figure.code-block button[aria-label^="Open the"]')
  await page.waitForSelector('[role="dialog"]')
  await shoot(page, '03-code-block-full-size')
  await page.keyboard.press('Escape')
  checks.dialogAfterEscape = await page.evaluate(
    () => document.querySelector('[role="dialog"]') === null,
  )

  await page.evaluate(() => window.scrollTo(0, 0))
  const link = await page.waitForSelector('article a[href$="invoice-template.md#tax-number"]')
  await link.hover()
  await page.waitForSelector('[role="tooltip"]')
  await shoot(page, '04-link-preview')
  await page.mouse.move(5, 500)
}

async function liveUpdateShots(page) {
  await page.evaluate(() => window.scrollTo(0, 400))
  await new Promise((resolveWait) => setTimeout(resolveWait, 300))
  const scrollBefore = await page.evaluate(() => window.scrollY)
  await shoot(page, '05-live-update-before')
  const file = join(home, pad, 'pages', 'index.md')
  writeFileSync(
    file,
    readFileSync(file, 'utf8').replace(
      'It then writes one file per shop',
      'It then writes one file per shop, **checks the total of each file**,',
    ),
  )
  await page.waitForFunction(
    () => document.body.textContent.includes('checks the total of each file'),
    { timeout: 5000 },
  )
  checks.scrollBeforeEdit = scrollBefore
  checks.scrollAfterEdit = await page.evaluate(() => window.scrollY)
  await shoot(page, '06-live-update-after')
}

async function navigationChecks(page) {
  await page.click('nav[aria-label="Pages of the scratch pad"] a[href$="retry-limit.md"]')
  await page.waitForFunction(
    () => document.querySelector('article h1')?.textContent === 'Retry limit',
  )
  checks.addressAfterClick = await page.evaluate(() => location.pathname)
  await page.goBack()
  await page.waitForFunction(
    () => document.querySelector('article h1')?.textContent === 'Invoice export',
  )
  checks.addressAfterBack = await page.evaluate(() => location.pathname)
  await openPad(page, 'invoice-template.md#layout')
  await new Promise((resolveWait) => setTimeout(resolveWait, 500))
  checks.sectionTopAfterHash = await page.evaluate(() =>
    Math.round(document.getElementById('layout').getBoundingClientRect().top),
  )
  checks.currentSection = await page.evaluate(
    () => document.querySelector('[aria-current="location"]')?.textContent,
  )
  await shoot(page, '07-section-from-hash')
  await page.click('a[href$="/progress-tracker"]')
  await page.waitForFunction(
    () => document.querySelector('article h1')?.textContent === 'Progress tracker',
  )
  await shoot(page, '08-progress-tracker')
  await page.click('a[href$="/decisions"]')
  await page.waitForFunction(
    () => document.querySelector('article h1')?.textContent === 'Decisions',
  )
  await shoot(page, '09-decisions')
}

async function widthShots(page) {
  for (const [width, height] of [
    [1280, 800],
    [2560, 1440],
  ]) {
    await page.setViewport({ width, height })
    await openPad(page)
    checks[`overflowAt${width}`] = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    await shoot(page, `10-page-${width}`)
  }
  await page.setViewport({ width: 1280, height: 360 })
  await openPad(page)
  checks.sidebarAt360 = await page.evaluate(() => {
    const list = document.querySelector('.sidebar__scroll')
    list.scrollTop = list.scrollHeight
    const last = [...list.querySelectorAll('a')].at(-1).getBoundingClientRect()
    const foot = document.querySelector('.sidebar__foot').getBoundingClientRect()
    return {
      scrolls: list.scrollHeight > list.clientHeight,
      lastLinkAboveFoot: last.bottom <= foot.top,
      footVisible: foot.bottom <= window.innerHeight,
    }
  })
  await shoot(page, '11-sidebar-short-window')
  await page.setViewport({ width: 1440, height: 900 })
  await openPad(page)
  await page.click('button[aria-label="Collapse the sidebar"]')
  await shoot(page, '12-sidebar-collapsed')
  await page.click('button[aria-label="Expand the sidebar"]')
}

async function galleryShots(page) {
  const port = await freePort()
  const server = await servedGallery(port)
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(`http://127.0.0.1:${port}/?path=/story/design-system-codeblock--type-script`, {
    waitUntil: 'networkidle0',
  })
  await shoot(page, '13-gallery-code-block')
  await page.goto(
    `http://127.0.0.1:${port}/?path=/story/design-system-decisioncard--waiting-for-nick`,
    { waitUntil: 'networkidle0' },
  )
  await shoot(page, '14-gallery-decision-card')
  server.close()
}

mkdirSync(output, { recursive: true })
writePages()
const port = await freePort()
checks.started = run('start', '--port', String(port)).trim()
checks.address = `http://127.0.0.1:${port}/`
const browser = await puppeteer.launch({ executablePath: chrome, headless: true })
try {
  const page = await browser.newPage()
  page.on('pageerror', (error) => {
    checks.pageErrors = [...(checks.pageErrors ?? []), String(error)]
  })
  await pageShots(page)
  await liveUpdateShots(page)
  await navigationChecks(page)
  await widthShots(page)
  await galleryShots(page)
} finally {
  await browser.close()
  checks.stopped = run('stop').trim()
  rmSync(home, { recursive: true, force: true })
}
console.log(JSON.stringify(checks, null, 2))
