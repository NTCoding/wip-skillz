import process from 'node:process'
import { runWriterProcess } from './two-processes-writer-fixtures'

await runWriterProcess(process.argv.slice(2), process.stdin, (line) =>
  process.stdout.write(`${line}\n`),
)
