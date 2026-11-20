import { runCommandLine } from './command-line/command-line'

process.exitCode = runCommandLine({
  argv: process.argv.slice(2),
  environment: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
})
