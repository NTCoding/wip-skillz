// Bundles the tool into the text of dist/scratch-pad without writing any file.
// esbuild.config.mjs writes that text and built-tool-check.mjs compares it with the committed file.
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import * as esbuild from 'esbuild'

export const builtToolFile = 'dist/scratch-pad'

class MissingBundleFileError extends Error {}

async function browserPageBundle() {
  const browserPage = await esbuild.build({
    entryPoints: ['src/browser-page/browser-page.tsx'],
    bundle: true,
    platform: 'browser',
    target: 'es2023',
    format: 'esm',
    minify: true,
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    outdir: 'browser-page',
    write: false,
    logLevel: 'warning',
  })
  const bundled = (extension) => {
    const file = browserPage.outputFiles.find((output) => output.path.endsWith(extension))
    if (file === undefined) {
      throw new MissingBundleFileError(
        `The bundle of the browser page doesn't have a ${extension} file.`,
      )
    }
    return file.text
  }
  return { script: bundled('.js'), stylesheet: bundled('.css') }
}

// The build is a hash of the bundle that was built with a placeholder in place of the build.
const buildPlaceholder = 'scratch-pad-build-placeholder'

export async function builtTool() {
  const bundle = await browserPageBundle()
  const bundleModule = resolve('src/local-server/browser-page-bundle.ts')
  const buildModule = resolve('src/local-server/tool-build.ts')
  const tool = await esbuild.build({
    entryPoints: ['src/executable.ts'],
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    outfile: builtToolFile,
    banner: { js: '#!/usr/bin/env node' },
    write: false,
    plugins: [
      {
        name: 'browser-page-bundle',
        setup(build) {
          build.onLoad({ filter: /browser-page-bundle\.ts$/ }, (args) =>
            args.path === bundleModule
              ? {
                  loader: 'js',
                  contents: `export const browserPageBundle = ${JSON.stringify(bundle)}`,
                }
              : undefined,
          )
          build.onLoad({ filter: /tool-build\.ts$/ }, (args) =>
            args.path === buildModule
              ? { loader: 'js', contents: `export const toolBuild = '${buildPlaceholder}'` }
              : undefined,
          )
        },
      },
      {
        // The tool loads node:sqlite when it first needs it rather than when the file is loaded.
        // An older Node then prints the message of executable.ts instead of a failed import.
        name: 'sqlite-when-needed',
        setup(build) {
          build.onResolve({ filter: /^node:sqlite$/ }, (args) =>
            args.namespace === 'sqlite-when-needed'
              ? undefined
              : { path: 'node:sqlite', namespace: 'sqlite-when-needed' },
          )
          build.onLoad({ filter: /.*/, namespace: 'sqlite-when-needed' }, () => ({
            loader: 'js',
            contents: "export const { DatabaseSync } = process.getBuiltinModule('node:sqlite')",
          }))
        },
      },
    ],
  })
  const [file] = tool.outputFiles
  if (file === undefined) {
    throw new MissingBundleFileError('The bundle of the tool is empty.')
  }
  const build = createHash('sha256').update(file.text).digest('hex').slice(0, 16)
  return file.text.replace(buildPlaceholder, build)
}
