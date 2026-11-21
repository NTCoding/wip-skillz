import { type Navigate } from '../../navigation-click'

export const htmlBlockFrameSource = '/browser-page/html-block-frame.html'

export const htmlBlockFrameReady = 'html-block-frame-ready'

const opaqueOrigin = 'null'

const otherSiteSchemes = new Set(['http:', 'https:', 'mailto:'])

const frameStyles = [
  'html{color:var(--text);font-family:var(--font-body);font-size:var(--fs-body);line-height:var(--lh-body)}',
  'body{margin:0}',
].join('')

function customPropertyNames(rules: CSSRuleList): string[] {
  return [...rules].flatMap((rule) => {
    if (rule instanceof CSSStyleRule) {
      return [...rule.style].filter((name) => name.startsWith('--'))
    }
    return rule instanceof CSSGroupingRule ? customPropertyNames(rule.cssRules) : []
  })
}

export function tokenRuleFor(element: Element): string {
  const names = new Set(
    [...document.styleSheets].flatMap((sheet) => customPropertyNames(sheet.cssRules)),
  )
  const style = getComputedStyle(element)
  const declarations = [...names].flatMap((name) => {
    const value = style.getPropertyValue(name).trim()
    return value === '' ? [] : [`${name}:${value}`]
  })
  return `:root{color-scheme:${style.getPropertyValue('color-scheme')};${declarations.join(';')}}`
}

export function htmlBlockFrameScript(): void {
  const port = 'htmlBlockPort' in window ? window.htmlBlockPort : undefined
  if (!(port instanceof MessagePort)) {
    return
  }
  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (link !== null) {
      event.preventDefault()
      port.postMessage({ link: link.getAttribute('href') })
    }
  })
  const postHeight = (): void => {
    port.postMessage({ height: document.documentElement.getBoundingClientRect().height })
  }
  // Chrome doesn't run the ResizeObserver of a frame below the viewport until it is scrolled into
  // view. That's why the frame also posts its height on DOMContentLoaded of the written document.
  document.addEventListener('DOMContentLoaded', postHeight)
  const resizes = new ResizeObserver(postHeight)
  resizes.observe(document.documentElement)
}

export function htmlBlockDocument(html: string, tokenRule: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    `<style>${tokenRule}</style>`,
    `<style>${frameStyles}</style>`,
    `<script>(${htmlBlockFrameScript.toString()})()</script>`,
    '</head>',
    `<body>${html}</body>`,
    '</html>',
  ].join('\n')
}

export function heightIn(message: unknown): number | undefined {
  const height =
    typeof message === 'object' && message !== null && 'height' in message
      ? message.height
      : undefined
  return typeof height === 'number' && height > 0 ? Math.ceil(height) : undefined
}

export function linkIn(message: unknown): string | undefined {
  const link =
    typeof message === 'object' && message !== null && 'link' in message ? message.link : undefined
  return typeof link === 'string' ? link : undefined
}

export function followLink(href: string, onNavigate: Navigate): void {
  if (!URL.canParse(href, document.baseURI)) {
    return
  }
  const url = new URL(href, document.baseURI)
  if (url.origin === window.location.origin) {
    onNavigate(`${url.pathname}${url.search}${url.hash}`)
    return
  }
  if (otherSiteSchemes.has(url.protocol)) {
    window.open(url.href, '_blank', 'noopener,noreferrer')
  }
}

export function connectHtmlBlockFrame(
  frame: HTMLIFrameElement | null,
  html: string,
  onLink: (href: string) => void,
): (() => void) | undefined {
  if (frame === null) {
    return undefined
  }
  const connection: { port: MessagePort | undefined } = { port: undefined }
  const receiveFromFrame = (event: MessageEvent<unknown>): void => {
    const height = heightIn(event.data)
    if (height !== undefined) {
      frame.style.setProperty('--html-block-height', `${height}px`)
    }
    const link = linkIn(event.data)
    if (link !== undefined) {
      onLink(link)
    }
  }
  const receive = (event: MessageEvent<unknown>): void => {
    const [port] = event.ports
    const fromTheFrame = event.origin === opaqueOrigin && event.source === frame.contentWindow
    if (!fromTheFrame || event.data !== htmlBlockFrameReady || port === undefined) {
      return
    }
    connection.port = port
    port.onmessage = receiveFromFrame
    port.postMessage(htmlBlockDocument(html, tokenRuleFor(frame)))
  }
  window.addEventListener('message', receive)
  return () => {
    window.removeEventListener('message', receive)
    connection.port?.close()
  }
}
