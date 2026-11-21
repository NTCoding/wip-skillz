// Fails when the built dist/scratch-pad isn't the bundle of the current source.
import { readFileSync } from 'node:fs'
import { builtTool, builtToolFile } from './built-tool.mjs'

const built = readFileSync(builtToolFile, 'utf8')
if (built === (await builtTool())) {
  console.log(`${builtToolFile} matches the source`)
} else {
  console.error(`${builtToolFile} doesn't match the source. Run pnpm build.`)
  process.exitCode = 1
}
