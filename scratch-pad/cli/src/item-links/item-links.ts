import {
  decisionLogHref,
  fileOfPage,
  indexFile,
  pageHref,
  progressTrackerHref,
} from '../browser-page/pad-paths'

export interface ItemLinks {
  readonly pad: string
  readonly origin: string | undefined
}

export function serverOrigin(port: number): string {
  return `http://127.0.0.1:${port}`
}

export function itemLinks(pad: string, port: number | undefined): ItemLinks {
  return { pad, origin: port === undefined ? undefined : serverOrigin(port) }
}

export function pageLink(links: ItemLinks, page: string, section?: string): string | undefined {
  return linkTo(links, pageHref(links.pad, fileOfPage(page), section))
}

export function padLink(links: ItemLinks): string | undefined {
  return linkTo(links, pageHref(links.pad, indexFile))
}

export function progressTrackerLink(links: ItemLinks): string | undefined {
  return linkTo(links, progressTrackerHref(links.pad))
}

export function decisionLogLink(links: ItemLinks): string | undefined {
  return linkTo(links, decisionLogHref(links.pad))
}

export function linkLines(link: string | undefined, indent = ''): string[] {
  return link === undefined ? [] : [`${indent}link: ${link}`]
}

export function missingLinksLine(pad: string): string {
  return `there aren't any links because the server isn't running (scratch-pad start --pad ${pad})`
}

export function withLinksNote(links: ItemLinks, text: string): string {
  return links.origin === undefined ? `${text}\n${missingLinksLine(links.pad)}` : text
}

export function textWithLink(links: ItemLinks, text: string, link: string | undefined): string {
  return withLinksNote(links, [text, ...linkLines(link)].join('\n'))
}

function linkTo(links: ItemLinks, path: string): string | undefined {
  return links.origin === undefined ? undefined : `${links.origin}${path}`
}
