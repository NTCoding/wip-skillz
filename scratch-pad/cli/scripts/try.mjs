// Starts the build of this checkout in the foreground with a copy of a scratch pad in a
// temporary folder. A branch can then be tried without touching the real scratch pads or the
// real server. Ctrl+C stops the server and removes the temporary folder.
// Usage: pnpm try [<folder>] [--port <port>]
import { execFileSync, spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { backup, DatabaseSync } from 'node:sqlite'
import { createExampleScratchPad } from './example-scratch-pad.mjs'

const tool = resolve('dist/scratch-pad')
const defaultPort = 4800
const usage = 'Usage: pnpm try [<folder>] [--port <port>]'

function fail(message) {
  console.error(message)
  process.exit(1)
}

function parsedArguments(words) {
  let folder
  let port = defaultPort
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]
    if (word === '--port') {
      port = Number(words[index + 1])
      index += 1
      if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        fail(`The port has to be a number from 1 to 65535. ${usage}`)
      }
    } else if (folder === undefined && !word.startsWith('-')) {
      folder = word
    } else {
      fail(`pnpm try doesn't know ${word}. ${usage}`)
    }
  }
  return { folder, port }
}

// The real tool reads the scratch pads from SCRATCH_PADS_HOME, else from ~/scratchpads.
function realScratchPadsHome() {
  const home = process.env.SCRATCH_PADS_HOME
  return home === undefined || home === '' ? join(homedir(), 'scratchpads') : resolve(home)
}

function portIsFree(port) {
  return new Promise((resolvePort) => {
    const server = createServer()
    server.once('error', () => resolvePort(false))
    server.listen(port, '127.0.0.1', () => server.close(() => resolvePort(true)))
  })
}

// The real server may be writing pad.db at the same time. That's why the real pad.db is opened
// read only and the copy is made with the backup of SQLite.
async function copyScratchPad(folder, home) {
  const realHome = realScratchPadsHome()
  if (folder.includes('/') || folder.startsWith('.')) {
    fail(`${folder} isn't the name of a scratch pad. Pass the name of a folder in ${realHome}.`)
  }
  const source = join(realHome, folder)
  if (!existsSync(join(source, 'pad.db'))) {
    fail(`There isn't any scratch pad at ${source}.`)
  }
  const copy = join(home, folder)
  mkdirSync(copy)
  for (const part of ['pages', 'custom']) {
    if (existsSync(join(source, part))) {
      cpSync(join(source, part), join(copy, part), { recursive: true })
    }
  }
  const database = new DatabaseSync(join(source, 'pad.db'), { readOnly: true, timeout: 5000 })
  try {
    await backup(database, join(copy, 'pad.db'))
  } finally {
    database.close()
  }
  return folder
}

function exampleScratchPad(home) {
  const environment = { ...process.env, SCRATCH_PADS_HOME: home }
  delete environment.SCRATCH_PAD
  const run = (...words) =>
    execFileSync(process.execPath, [tool, ...words], { env: environment, encoding: 'utf8' })
  return createExampleScratchPad(run, home)
}

async function serverIsListening(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/server`)
    return response.ok
  } catch {
    return false
  }
}

const { folder, port } = parsedArguments(process.argv.slice(2))
if (!existsSync(tool)) {
  fail(`${tool} doesn't exist. Run pnpm build first.`)
}
if (!(await portIsFree(port))) {
  fail(`Port ${port} is already in use. Pass another port with: pnpm try --port <port>`)
}
const home = mkdtempSync(join(tmpdir(), 'scratch-pad-try-'))
const pad = folder === undefined ? exampleScratchPad(home) : await copyScratchPad(folder, home)
const server = spawn(process.execPath, [tool, 'serve', '--port', String(port)], {
  stdio: 'inherit',
  env: { ...process.env, SCRATCH_PADS_HOME: home, SCRATCH_PAD: pad },
})
const stop = () => server.kill('SIGTERM')
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
server.once('exit', (code) => {
  rmSync(home, { recursive: true, force: true })
  console.log(`The try server has stopped and ${home} has been removed.`)
  process.exit(code ?? 0)
})
const deadline = Date.now() + 5000
while (!(await serverIsListening(port)) && Date.now() < deadline && server.exitCode === null) {
  await new Promise((resolveWait) => setTimeout(resolveWait, 100))
}
if (server.exitCode === null) {
  console.log(`Try the scratch pad at http://127.0.0.1:${port}/${pad}/`)
  console.log(`The scratch pads of the try server are in ${home}.`)
  console.log(`Press Ctrl+C to stop the try server, or run: kill ${process.pid}`)
}
