// Fails when the committed dist/scratch-pad isn't the bundle of the current source.
import { readFileSync } from 'node:fs'
import { builtTool, builtToolFile } from './built-tool.mjs'

const committed = readFileSync(builtToolFile, 'utf8')
if (committed === (await builtTool())) {
  console.log(`${builtToolFile} matches the source`)
} else {
  console.error(`${builtToolFile} doesn't match the source. Run pnpm build and commit the file.`)
  process.exitCode = 1
}
