// Exports an invented scratch pad with the built tool after the server has stopped.
// Then it opens export.html from the disk in headless Chrome, checks what a reader sees and
// takes screenshots.
// Usage: node scripts/export-in-chrome.mjs <output folder>
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'
import { indexPage, invoiceTemplatePage, retryLimitPage } from './example-scratch-pad.mjs'

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const tool = resolve('dist/scratch-pad')
const output = resolve(process.argv[2] ?? 'export-screenshots')
const home = mkdtempSync(join(tmpdir(), 'scratch-pad-export-'))
const environment = { ...process.env, SCRATCH_PADS_HOME: home }
const pad = basename(
  execFileSync(process.execPath, [tool, 'new', 'Invoice export'], {
    env: environment,
    encoding: 'utf8',
  })
    .split('\n')[0]
    .replace(/^created /, ''),
)
environment.SCRATCH_PAD = pad
const checks = {}
const failures = []

function run(...words) {
  return execFileSync(process.execPath, [tool, ...words], { env: environment, encoding: 'utf8' })
}

function check(name, actual, expected) {
  checks[name] = actual
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
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

function anchorOf(markdown, selectedText) {
  const lines = markdown.split('\n')
  const index = lines.findIndex((line) => line.includes(selectedText))
  const [prefix, suffix] = lines[index].split(selectedText)
  return {
    firstLine: index + 1,
    lastLine: index + 1,
    selectedText,
    prefix: prefix.trim(),
    suffix: suffix.trim(),
  }
}

async function post(address, path, body) {
  const response = await fetch(`${address}api/scratch-pads/${pad}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`POST ${path} returned ${response.status}: ${await response.text()}`)
  }
}

async function writeScratchPad() {
  run('goal', 'Ship the invoice export job.')
  run('task', 'add', 'Design the export job')
  run('task', 'add', 'Write the invoice template')
  run('task', 'add', 'Check the retry limit')
  run('task', 'start', '1')
  run('task', 'done', '1')
  run('decide', 'The export job runs every night.')
  const pages = join(home, pad, 'pages')
  writeFileSync(join(pages, 'index.md'), indexPage)
  writeFileSync(join(pages, 'invoice-template.md'), invoiceTemplatePage)
  writeFileSync(join(pages, 'retry-limit.md'), retryLimitPage)
  const port = await freePort()
  run('start', '--port', String(port))
  const address = `http://127.0.0.1:${port}/`
  try {
    await post(address, 'threads', {
      type: 'comment',
      page: 'pages/index.md',
      ...anchorOf(indexPage, 'writes one file per shop'),
      message: 'Does a shop without any invoices receive a file too?',
    })
    await post(address, 'threads', {
      type: 'grammar',
      page: 'pages/invoice-template.md',
      ...anchorOf(invoiceTemplatePage, 'the line is left out'),
      message: 'Write who leaves the line out.',
    })
    await post(address, 'threads', {
      type: 'comment',
      page: 'pages/retry-limit.md',
      ...anchorOf(retryLimitPage, 'twice as long'),
      message: 'Is there an upper limit for the wait?',
    })
    await post(address, 'decisions/d-1', { page: 'pages/index.md', choice: 'proposal' })
  } finally {
    checks.stopped = run('stop').trim()
  }
  run('reply', 'c-1', 'Yes. A shop without any invoices receives an empty file.')
  run('done', 'g-1', 'The template leaves the line out.')
  checks.exported = run('export').trim()
}

async function shoot(page, name) {
  await new Promise((resolveWait) => setTimeout(resolveWait, 400))
  await page.screenshot({ path: join(output, `${name}.png`) })
}

async function shownTitle(page, title) {
  await page.waitForFunction(
    (expected) => document.querySelector('article h1')?.textContent === expected,
    {},
    title,
  )
}

async function pageChecks(page, exportUrl) {
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(exportUrl, { waitUntil: 'load' })
  await shownTitle(page, 'Invoice export')
  await page.waitForSelector('[aria-label="Comment c-1"]')
  check('replyBoxes', await page.$$eval('textarea', (boxes) => boxes.length), 0)
  check('inboxButton', await page.$('button[aria-haspopup]'), null)
  check(
    'decisionAnswer',
    await page.$eval('#d-1', (decision) => decision.textContent.includes('proposal')),
    true,
  )
  const frame = await page.waitForSelector('iframe[title="HTML block"]')
  const frameContent = await frame.contentFrame()
  await frameContent.waitForFunction(() => document.body.textContent.includes('Upload each file'))
  check(
    'htmlBlockHeight',
    await page.$eval('iframe[title="HTML block"]', (element) => element.clientHeight > 40),
    true,
  )
  await shoot(page, '01-index-with-thread')
  await page.evaluate(() =>
    document.querySelector('iframe[title="HTML block"]').scrollIntoView({ block: 'center' }),
  )
  await shoot(page, '02-html-block-and-decision')
}

async function navigationChecks(page) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.click('nav[aria-label="Pages of the scratch pad"] a[href="#/invoice-template.md"]')
  await shownTitle(page, 'Invoice template')
  check('hashAfterSidebarClick', await page.evaluate(() => location.hash), '#/invoice-template.md')
  await page.waitForSelector('[aria-label="Grammar / tone g-1"]')
  await shoot(page, '03-second-page-with-resolved-note')
  await page.goBack()
  await shownTitle(page, 'Invoice export')
  check('hashAfterBack', await page.evaluate(() => location.hash), '')
  const link = await page.waitForSelector('article a[href="#/invoice-template.md/tax-number"]')
  await link.hover()
  await page.waitForSelector('[role="tooltip"]')
  await shoot(page, '04-link-preview')
  await link.click()
  await shownTitle(page, 'Invoice template')
  await new Promise((resolveWait) => setTimeout(resolveWait, 300))
  checks.sectionTopAfterLink = await page.evaluate(() =>
    Math.round(document.getElementById('tax-number').getBoundingClientRect().top),
  )
  await page.click('a[href="#/retry-limit.md"]')
  await shownTitle(page, 'Retry limit')
  await page.waitForSelector('[aria-label="Comment c-2"]')
  await shoot(page, '05-third-page')
  await page.click('a[href="#/progress-tracker"]')
  await shownTitle(page, 'Progress tracker')
  await shoot(page, '06-progress-tracker')
  await page.click('a[href="#/decisions"]')
  await shownTitle(page, 'Decisions')
  checks.decisionLog = await page.$eval('article', (article) => article.textContent)
  await shoot(page, '07-decisions')
}

async function reloadChecks(page, exportUrl) {
  await page.goto(`${exportUrl}#/retry-limit.md`, { waitUntil: 'load' })
  await shownTitle(page, 'Retry limit')
  await page.goto(exportUrl, { waitUntil: 'load' })
  await shownTitle(page, 'Invoice export')
  await page.waitForSelector('iframe[title="HTML block"]')
  await shoot(page, '08-index-after-reload')
}

mkdirSync(output, { recursive: true })
await writeScratchPad()
const exportFile = join(home, pad, 'export.html')
copyFileSync(exportFile, join(output, 'export.html'))
const exportUrl = pathToFileURL(exportFile).href
const browser = await puppeteer.launch({ executablePath: chrome, headless: true })
try {
  const page = await browser.newPage()
  const requests = []
  page.on('request', (request) => requests.push(request.url()))
  page.on('pageerror', (error) => failures.push(`page error: ${String(error)}`))
  await pageChecks(page, exportUrl)
  await navigationChecks(page)
  await reloadChecks(page, exportUrl)
  check(
    'requestsToAServer',
    requests.filter((url) => url.startsWith('http')),
    [],
  )
} finally {
  await browser.close()
  rmSync(home, { recursive: true, force: true })
}
checks.exportBytes = readFileSync(join(output, 'export.html')).length
console.log(JSON.stringify({ checks, failures }, null, 2))
process.exitCode = failures.length === 0 ? 0 : 1
