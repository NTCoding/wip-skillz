import { type HtmlBlockFrameSource } from './design-system/design-system'
import {
  decisionLogHref,
  decisionLogPath,
  indexFile,
  pageHref,
  progressTrackerHref,
  progressTrackerPath,
} from './pad-paths'

export { decisionLogHref, fileOfPage, pageHref, progressTrackerHref } from './pad-paths'

export type BrowserRoute =
  | {
      readonly kind: 'page'
      readonly pad: string
      readonly file: string
      readonly section: string | undefined
    }
  | { readonly kind: 'progress-tracker'; readonly pad: string }
  | { readonly kind: 'decision-log'; readonly pad: string }

interface BrowserLocation {
  readonly pathname: string
  readonly hash: string
}

function decoded(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

function routeFrom(pad: string, file: string, section: string): BrowserRoute {
  if (file === progressTrackerPath) {
    return { kind: 'progress-tracker', pad }
  }
  if (file === decisionLogPath) {
    return { kind: 'decision-log', pad }
  }
  return {
    kind: 'page',
    pad,
    file: file === '' ? indexFile : file,
    section: section === '' ? undefined : section,
  }
}

function firstAndRest(path: string): string[] {
  return path.split(/\/(.*)/s).map(decoded)
}

export function routeOf(location: BrowserLocation): BrowserRoute {
  const [pad = '', rest = ''] = firstAndRest(location.pathname.replace(/^\//, ''))
  return routeFrom(pad, rest, decoded(location.hash.replace(/^#/, '')))
}

export interface PadAddresses {
  readonly routeOf: (location: BrowserLocation) => BrowserRoute
  readonly pageHref: (file: string, section?: string) => string
  readonly progressTrackerHref: string
  readonly decisionLogHref: string
  readonly htmlBlockFrame: HtmlBlockFrameSource
}

export function servedAddresses(pad: string): PadAddresses {
  return {
    routeOf,
    pageHref: (file, section) => pageHref(pad, file, section),
    progressTrackerHref: progressTrackerHref(pad),
    decisionLogHref: decisionLogHref(pad),
    htmlBlockFrame: 'server',
  }
}

// An export is one file without a server, so the address of a view is in the hash of the URL,
// like #/invoice-template.md/tax-number.
export function exportedAddresses(pad: string): PadAddresses {
  return {
    routeOf: (location) => exportedRouteOf(pad, location.hash),
    pageHref: (file, section) => {
      const page = `#/${encodeURIComponent(file)}`
      return section === undefined ? page : `${page}/${encodeURIComponent(section)}`
    },
    progressTrackerHref: `#/${progressTrackerPath}`,
    decisionLogHref: `#/${decisionLogPath}`,
    htmlBlockFrame: 'inline',
  }
}

function exportedRouteOf(pad: string, hash: string): BrowserRoute {
  const [file = '', section = ''] = firstAndRest(hash.replace(/^#\/?/, ''))
  return routeFrom(pad, file, section)
}
