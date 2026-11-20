import { chmodSync } from 'node:fs'
import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/executable.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  outfile: 'dist/scratch-pad',
  banner: { js: '#!/usr/bin/env node' },
})

chmodSync('dist/scratch-pad', 0o755)
