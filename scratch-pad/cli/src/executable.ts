import { fstatSync } from 'node:fs'
import { text } from 'node:stream/consumers'
import { nodeVersionProblem } from './node-version'

// The shell of an agent can leave standard input open without ever closing it, so a read of it
// would never end. That's why the tool only reads standard input when it's a file or a pipe,
// which is what a heredoc, a | or a < gives the tool.
function readStandardInput(): Promise<string> {
  const input = fstatSync(0)
  return input.isFIFO() || input.isFile() ? text(process.stdin) : Promise.resolve('')
}

const problem = nodeVersionProblem(process.versions.node)

if (problem === undefined) {
  const { runCommandLine } = await import('./command-line/command-line')
  const stopping = new AbortController()
  process.once('SIGTERM', () => stopping.abort())
  process.exitCode = await runCommandLine({
    argv: process.argv.slice(2),
    environment: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
    readStandardInput,
    toolCommand: [process.execPath, ...process.argv.slice(1, 2)],
    stopSignal: stopping.signal,
  })
} else {
  process.stderr.write(`${problem}\n`)
  process.exitCode = 1
}
