import { type HtmlBlockFrameSource } from './design-system/design-system'
import {
  decisionLogHref,
  decisionLogPath,
  improvementsHref,
  improvementsPath,
  inboxOutboxHref,
  inboxOutboxPath,
  indexFile,
  pageHref,
  progressTrackerHref,
  progressTrackerPath,
} from './pad-paths'

export {
  decisionLogHref,
  fileOfPage,
  improvementAnchor,
  improvementsHref,
  pageHref,
  progressTrackerHref,
} from './pad-paths'

export type BrowserRoute =
  | {
      readonly kind: 'page'
      readonly pad: string
      readonly file: string
      readonly section: string | undefined
    }
  | {
      readonly kind: 'progress-tracker'
      readonly pad: string
      readonly section: string | undefined
    }
  | { readonly kind: 'decision-log'; readonly pad: string }
  | { readonly kind: 'inbox-outbox'; readonly pad: string }
  | { readonly kind: 'improvements'; readonly pad: string; readonly section: string | undefined }

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
  const sectionOrNone = section === '' ? undefined : section
  if (file === progressTrackerPath) {
    return { kind: 'progress-tracker', pad, section: sectionOrNone }
  }
  if (file === decisionLogPath) {
    return { kind: 'decision-log', pad }
  }
  if (file === inboxOutboxPath) {
    return { kind: 'inbox-outbox', pad }
  }
  if (file === improvementsPath) {
    return { kind: 'improvements', pad, section: sectionOrNone }
  }
  return { kind: 'page', pad, file: file === '' ? indexFile : file, section: sectionOrNone }
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
  readonly progressTrackerHref: (section?: string) => string
  readonly decisionLogHref: string
  readonly improvementsHref: (section?: string) => string
  readonly inboxOutboxHref: string
  readonly htmlBlockFrame: HtmlBlockFrameSource
}

export function servedAddresses(pad: string): PadAddresses {
  return {
    routeOf,
    pageHref: (file, section) => pageHref(pad, file, section),
    progressTrackerHref: (section) => progressTrackerHref(pad, section),
    decisionLogHref: decisionLogHref(pad),
    improvementsHref: (section) => improvementsHref(pad, section),
    inboxOutboxHref: inboxOutboxHref(pad),
    htmlBlockFrame: 'server',
  }
}

// An export is one file without a server, so the address of a view is in the hash of the URL,
// like #/invoice-template.md/tax-number.
export function exportedAddresses(pad: string): PadAddresses {
  return {
    routeOf: (location) => exportedRouteOf(pad, location.hash),
    pageHref: (file, section) => exportedHref(file, section),
    progressTrackerHref: (section) => exportedHref(progressTrackerPath, section),
    decisionLogHref: `#/${decisionLogPath}`,
    improvementsHref: (section) => exportedHref(improvementsPath, section),
    inboxOutboxHref: `#/${inboxOutboxPath}`,
    htmlBlockFrame: 'inline',
  }
}

function exportedHref(file: string, section: string | undefined): string {
  const view = `#/${encodeURIComponent(file)}`
  return section === undefined ? view : `${view}/${encodeURIComponent(section)}`
}

function exportedRouteOf(pad: string, hash: string): BrowserRoute {
  const [file = '', section = ''] = firstAndRest(hash.replace(/^#\/?/, ''))
  return routeFrom(pad, file, section)
}
