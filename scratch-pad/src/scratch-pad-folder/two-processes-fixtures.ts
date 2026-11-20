import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { text } from 'node:stream/consumers'
import { buildSync } from 'esbuild'
import { type ScratchPadFolder } from './scratch-pad-folder'
import { temporaryHome } from './scratch-pad-folder-fixtures'

type Writer =
  | 'agent-adds-tasks'
  | 'agent-replies'
  | 'agent-reads-inbox'
  | 'agent-reads-decisions'
  | 'nick-comments'
  | 'nick-replies'
  | 'nick-answers-twice'

interface WriterRun {
  readonly writer: Writer
  readonly count: number
}

export interface WriterOutput {
  readonly exitCode: number | null
  readonly lines: readonly string[]
  readonly errors: string
}

interface StartedWriter {
  readonly ready: Promise<unknown>
  readonly finished: Promise<WriterOutput>
}

export async function runTwoWriters(
  folder: ScratchPadFolder,
  first: WriterRun,
  second: WriterRun,
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
  const goFile = join(processFolder, 'go')
  const firstWriter = startWriter(bundle, folder.path, first, goFile)
  const secondWriter = startWriter(bundle, folder.path, second, goFile)
  await Promise.all([firstWriter.ready, secondWriter.ready])
  writeFileSync(goFile, '')
  return Promise.all([firstWriter.finished, secondWriter.finished])
}

function startWriter(
  bundle: string,
  padPath: string,
  run: WriterRun,
  goFile: string,
): StartedWriter {
  const child = spawn(process.execPath, [bundle, run.writer, padPath, String(run.count), goFile])
  const lines: string[] = []
  const errors = text(child.stderr)
  const stdout = createInterface({ input: child.stdout })
  stdout.on('line', (line) => lines.push(line))
  return {
    ready: once(stdout, 'line'),
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
