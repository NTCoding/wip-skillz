import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { jsonObjectFrom } from '../local-server/request-body'

export interface ServerFile {
  readonly pid: number
  readonly port: number
}

const serverFileName = '.scratch-pad-server.json'
const serverLogFileName = '.scratch-pad-server.log'

export function serverLogPath(home: string): string {
  return join(home, serverLogFileName)
}

export function readServerFile(home: string): ServerFile | undefined {
  const path = join(home, serverFileName)
  if (!existsSync(path)) {
    return undefined
  }
  const saved = jsonObjectFrom(parsedJson(readFileSync(path, 'utf8')))
  const pid = saved?.['pid']
  const port = saved?.['port']
  return typeof pid === 'number' && typeof port === 'number' ? { pid, port } : undefined
}

export function writeServerFile(home: string, server: ServerFile): void {
  mkdirSync(home, { recursive: true })
  writeFileSync(join(home, serverFileName), `${JSON.stringify(server)}\n`)
}

export function removeServerFile(home: string, pid: number): void {
  if (readServerFile(home)?.pid === pid) {
    rmSync(join(home, serverFileName), { force: true })
  }
}

function parsedJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
