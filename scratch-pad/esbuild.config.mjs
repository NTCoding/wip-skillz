import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { builtTool, builtToolFile } from './scripts/built-tool.mjs'

mkdirSync(dirname(builtToolFile), { recursive: true })
writeFileSync(builtToolFile, await builtTool())
chmodSync(builtToolFile, 0o755)
