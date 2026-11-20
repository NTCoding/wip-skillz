import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { afterAll, beforeAll } from 'vitest'
import { temporaryHome } from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { stopServerProcess, type ToolCommand } from './server-process'

const serverHomes: string[] = []

export function builtTool(): () => ToolCommand {
  const folder = { path: tmpdir() }
  beforeAll(() => {
    folder.path = mkdtempSync(join(tmpdir(), 'scratch-pad-tool-'))
    buildSync({
      entryPoints: [join(import.meta.dirname, '..', 'executable.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: join(folder.path, 'scratch-pad.mjs'),
      logLevel: 'silent',
    })
  })
  afterAll(() => {
    rmSync(folder.path, { recursive: true, force: true })
  })
  return () => [process.execPath, join(folder.path, 'scratch-pad.mjs')]
}

export function homeForServer(): string {
  const home = temporaryHome()
  serverHomes.push(home)
  return home
}

export async function stopServers(): Promise<void> {
  await Promise.all(serverHomes.splice(0).map((home) => stopServerProcess(home, 5000)))
}
