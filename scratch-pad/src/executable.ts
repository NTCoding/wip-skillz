import { runCommandLine } from './command-line/command-line'

const stopping = new AbortController()
process.once('SIGTERM', () => stopping.abort())

process.exitCode = await runCommandLine({
  argv: process.argv.slice(2),
  environment: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
  toolCommand: [process.execPath, ...process.argv.slice(1, 2)],
  stopSignal: stopping.signal,
})
