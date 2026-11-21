import { describe, expect, it } from 'vitest'
import {
  browserPageHtml,
  browserPageJson,
  browserPagePolicy,
  exportedBrowserPageHtml,
} from './browser-page'

describe('browserPagePolicy', () => {
  it('doesn’t allow any inline script, any form or any other site in a frame when the page is served', () => {
    const scriptSource = browserPagePolicy.split('; ').find((part) => part.startsWith('script-src'))
    expect(scriptSource).toBe("script-src 'self'")
    expect(browserPagePolicy).toContain("form-action 'none'")
    expect(browserPagePolicy).toContain("frame-src 'self'")
  })
})

describe('browserPageHtml', () => {
  it('loads the bundle and the stylesheet without any inline script when the page is served', () => {
    const html = browserPageHtml('2026-11-20-invoice-export')
    expect(html).toContain('<script type="module" src="/browser-page/scratch-pad.js"></script>')
    expect(html).toContain('<link rel="stylesheet" href="/browser-page/scratch-pad.css">')
    expect(html).not.toContain('<script>')
  })
})

function exportedHtml(script: string, stylesheet = '', data: unknown = {}): string {
  return exportedBrowserPageHtml({
    padName: '2026-11-20-invoice-export',
    title: 'Invoice export',
    data,
    bundle: { script, stylesheet },
  })
}

function moduleScriptOf(html: string): string {
  return /<script type="module">(.*?)<\/script>/su.exec(html)?.[1] ?? 'no module script'
}

describe('browserPageJson', () => {
  it('writes null for a value that is undefined when the value is sent to the browser page', () => {
    expect(browserPageJson({ title: undefined, tasks: [] })).toBe('{"title":null,"tasks":[]}')
  })
})

describe('exportedBrowserPageHtml', () => {
  it('puts the root, the data and the bundle in one document when the scratch pad is exported', () => {
    const html = exportedHtml('startBrowserPage()', '.page{color:var(--text)}', { pages: [] })
    expect(html).toContain(
      '<div id="scratch-pad-page" data-scratch-pad="2026-11-20-invoice-export"></div>',
    )
    expect(html).toContain(
      '<script type="application/json" id="scratch-pad-export">{"pages":[]}</script>',
    )
    expect(moduleScriptOf(html)).toBe('startBrowserPage()')
    expect(html).not.toContain('<script>')
  })

  it('escapes every < of the data when the data contains the end of a script element', () => {
    const html = exportedHtml('', '', { text: '</script><script>alert(1)</script>' })
    expect(html).toContain(String.raw`{"text":"\u003c/script>\u003cscript>alert(1)\u003c/script>"}`)
  })

  it('escapes the end of a script element and the start of a comment when the bundle contains them', () => {
    const script = 'const end="</SCRIPT>";const start="<!--"'
    expect(moduleScriptOf(exportedHtml(script))).toBe(
      String.raw`const end="<\/SCRIPT>";const start="<\x21--"`,
    )
  })

  it('escapes the end of a style element when the stylesheet contains it', () => {
    expect(exportedHtml('', '.a::after{content:"</style>"}')).toContain(
      String.raw`<style>.a::after{content:"<\/style>"}</style>`,
    )
  })
})
