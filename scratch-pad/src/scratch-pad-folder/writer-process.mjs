import process from 'node:process'
import { runWriterProcess } from './two-processes-writers'

await runWriterProcess(process.argv.slice(2), process.stdin, (line) =>
  process.stdout.write(`${line}\n`),
)
