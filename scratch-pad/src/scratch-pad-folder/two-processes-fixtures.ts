import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { text } from 'node:stream/consumers'
import { buildSync } from 'esbuild'
import { type ScratchPadFolder } from './scratch-pad-folder'
import { temporaryHome } from './scratch-pad-folder-fixtures'
import { type WriterName } from './two-processes-writer-fixtures'

interface WriterProcess {
  readonly writer: WriterName
  readonly count: number
  readonly schema?: 'second-version'
}

export interface WriterOutput {
  readonly exitCode: number | null
  readonly lines: readonly string[]
  readonly errors: string
}

interface StartedWriter {
  readonly ready: Promise<unknown>
  readonly go: () => void
  readonly finished: Promise<WriterOutput>
}

export async function runTwoWriters(
  folder: ScratchPadFolder,
  first: WriterProcess,
  second: WriterProcess,
): Promise<readonly [WriterOutput, WriterOutput]> {
  const processFolder = temporaryHome()
  const bundle = join(processFolder, 'writer-process.mjs')
  buildSync({
    entryPoints: [join(import.meta.dirname, 'writer-process.mjs')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundle,
    logLevel: 'silent',
  })
  const firstWriter = startWriter(bundle, folder.path, first)
  const secondWriter = startWriter(bundle, folder.path, second)
  await Promise.all([firstWriter.ready, secondWriter.ready])
  firstWriter.go()
  secondWriter.go()
  return Promise.all([firstWriter.finished, secondWriter.finished])
}

function startWriter(bundle: string, padPath: string, run: WriterProcess): StartedWriter {
  const child = spawn(process.execPath, [
    bundle,
    run.writer,
    padPath,
    String(run.count),
    ...(run.schema === undefined ? [] : [run.schema]),
  ])
  const lines: string[] = []
  const errors = text(child.stderr)
  const stdout = createInterface({ input: child.stdout })
  stdout.on('line', (line) => lines.push(line))
  return {
    ready: once(stdout, 'line'),
    go: () => child.stdin.end('go\n'),
    finished: Promise.all([errors, once(child, 'close')]).then(([errorText]) => ({
      exitCode: child.exitCode,
      lines: lines.slice(1),
      errors: errorText,
    })),
  }
}

export function numbered(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`)
}

export function inTextOrder(lines: readonly string[]): string[] {
  return lines.toSorted((first, second) => first.localeCompare(second))
}
