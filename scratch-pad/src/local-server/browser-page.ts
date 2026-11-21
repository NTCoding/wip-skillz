import { createHash } from 'node:crypto'
import { colourModes } from '../browser-page/design-system/colour-modes'
import { pageMarkdownParser } from '../rendered-page/page-markdown-parser'
import { type BrowserPageBundle } from './browser-page-bundle'

function escaped(text: string): string {
  return pageMarkdownParser.utils.escapeHtml(text)
}

const browserPageScriptPath = '/browser-page/scratch-pad.js'
const browserPageStylesheetPath = '/browser-page/scratch-pad.css'

const colourModeScript = [
  `try{const modes=${JSON.stringify(colourModes)};`,
  "const saved=localStorage.getItem('scratch-pad-colour-mode');",
  "const dark=matchMedia('(prefers-color-scheme: dark)').matches;",
  "document.documentElement.dataset.colourMode=modes.includes(saved)?saved:dark?'dark':'light'}",
  "catch{document.documentElement.dataset.colourMode='light'}",
].join('')

const colourModeBeforePaint = `<script>${colourModeScript}</script>`

const colourModeScriptHash = createHash('sha256').update(colourModeScript).digest('base64')

export const browserPagePolicy = [
  "default-src 'self'",
  `script-src 'self' 'sha256-${colourModeScriptHash}'`,
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  'img-src * data: blob:',
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

function htmlDocument(title: string, body: string, head: readonly string[] = []): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escaped(title)}</title>`,
    ...head,
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
    '',
  ].join('\n')
}

export function homePageHtml(home: string, names: readonly string[]): string {
  const links = names.map(
    (name) => `<li><a href="/${encodeURIComponent(name)}/">${escaped(name)}</a></li>`,
  )
  return htmlDocument(
    'Scratch pads',
    [
      '<main>',
      '<h1>Scratch pads</h1>',
      `<p>${escaped(home)}</p>`,
      `<ul>${links.join('')}</ul>`,
      '</main>',
    ].join('\n'),
  )
}

export function browserPageHtml(padName: string): string {
  return htmlDocument(
    padName,
    [
      `<div id="scratch-pad-page" data-scratch-pad="${escaped(padName)}"></div>`,
      `<script type="module" src="${browserPageScriptPath}"></script>`,
    ].join('\n'),
    [colourModeBeforePaint, `<link rel="stylesheet" href="${browserPageStylesheetPath}">`],
  )
}

export function browserPageJson(value: unknown): string {
  return JSON.stringify(value, (_key, part: unknown) => part ?? null)
}

interface ExportedBrowserPage {
  readonly padName: string
  readonly title: string
  readonly data: unknown
  readonly bundle: BrowserPageBundle
}

// The text of a script element or a style element ends at the first "</script" or "</style".
// "<!--" in a script can hide that end too. Each escape keeps the meaning of the JavaScript,
// the JSON and the CSS.
function inScriptElement(script: string): string {
  return script
    .replaceAll(/<\/(script)/giu, String.raw`<\/$1`)
    .replaceAll('<!--', String.raw`<\x21--`)
}

function inStyleElement(stylesheet: string): string {
  return stylesheet.replaceAll(/<\/(style)/giu, String.raw`<\/$1`)
}

export function exportedBrowserPageHtml(exported: ExportedBrowserPage): string {
  const json = browserPageJson(exported.data).replaceAll('<', String.raw`\u003c`)
  return htmlDocument(
    exported.title,
    [
      `<div id="scratch-pad-page" data-scratch-pad="${escaped(exported.padName)}"></div>`,
      `<script type="application/json" id="scratch-pad-export">${json}</script>`,
      `<script type="module">${inScriptElement(exported.bundle.script)}</script>`,
    ].join('\n'),
    [colourModeBeforePaint, `<style>${inStyleElement(exported.bundle.stylesheet)}</style>`],
  )
}
