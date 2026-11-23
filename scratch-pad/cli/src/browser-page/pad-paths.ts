// This file doesn't import anything because the command line imports it too.
export const indexFile = 'index.md'
export const progressTrackerPath = 'progress-tracker'
export const decisionLogPath = 'decisions'
export const improvementsPath = 'improvements'
export const inboxOutboxPath = 'inbox-outbox'

export function padPath(pad: string): string {
  return `/${encodeURIComponent(pad)}/`
}

export function pageHref(pad: string, file: string, section?: string): string {
  const path = file === indexFile ? padPath(pad) : `${padPath(pad)}${encodeURIComponent(file)}`
  return section === undefined ? path : `${path}#${encodeURIComponent(section)}`
}

export function progressTrackerHref(pad: string, section?: string): string {
  const path = `${padPath(pad)}${progressTrackerPath}`
  return section === undefined ? path : `${path}#${encodeURIComponent(section)}`
}

export function decisionLogHref(pad: string): string {
  return `${padPath(pad)}${decisionLogPath}`
}

export function inboxOutboxHref(pad: string): string {
  return `${padPath(pad)}${inboxOutboxPath}`
}

export function fileOfPage(page: string): string {
  return page.replace(/^pages\//, '')
}

export function improvementsHref(pad: string, section?: string): string {
  const path = `${padPath(pad)}${improvementsPath}`
  return section === undefined ? path : `${path}#${encodeURIComponent(section)}`
}

export function improvementAnchor(number: number): string {
  return `improvement-${number}`
}
