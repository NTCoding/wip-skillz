import { type PadChange } from './api-responses'

interface PadRevisions {
  readonly pages: number
  readonly page: Readonly<Record<string, number>>
  readonly decisions: number
  readonly threads: number
  readonly nickInbox: number
  readonly progressTracker: number
  readonly decisionLog: number
  readonly improvements: number
  readonly outbox: number
  readonly readMarks: number
}

export const firstRevisions: PadRevisions = {
  pages: 0,
  page: {},
  decisions: 0,
  threads: 0,
  nickInbox: 0,
  progressTracker: 0,
  decisionLog: 0,
  improvements: 0,
  outbox: 0,
  readMarks: 0,
}

export function revisedBy(revisions: PadRevisions, change: PadChange): PadRevisions {
  switch (change.kind) {
    case 'page':
      return {
        ...revisions,
        pages: revisions.pages + 1,
        page: { ...revisions.page, [change.page]: (revisions.page[change.page] ?? 0) + 1 },
        threads: revisions.threads + 1,
        nickInbox: revisions.nickInbox + 1,
        outbox: revisions.outbox + 1,
        readMarks: revisions.readMarks + 1,
      }
    case 'thread':
      return {
        ...revisions,
        pages: revisions.pages + 1,
        threads: revisions.threads + 1,
        nickInbox: revisions.nickInbox + 1,
        improvements: revisions.improvements + 1,
      }
    case 'decision':
      return {
        ...revisions,
        pages: revisions.pages + 1,
        decisions: revisions.decisions + 1,
        nickInbox: revisions.nickInbox + 1,
      }
    case 'progress-tracker':
      return { ...revisions, progressTracker: revisions.progressTracker + 1 }
    case 'decision-log':
      return { ...revisions, decisionLog: revisions.decisionLog + 1 }
    case 'improvements':
      return { ...revisions, improvements: revisions.improvements + 1 }
    case 'outbox':
      return { ...revisions, outbox: revisions.outbox + 1 }
    case 'read-marks':
      return { ...revisions, readMarks: revisions.readMarks + 1 }
  }
}

export function revisedAfterReconnect(revisions: PadRevisions): PadRevisions {
  return {
    ...revisions,
    pages: revisions.pages + 1,
    decisions: revisions.decisions + 1,
    threads: revisions.threads + 1,
    nickInbox: revisions.nickInbox + 1,
    progressTracker: revisions.progressTracker + 1,
    decisionLog: revisions.decisionLog + 1,
    improvements: revisions.improvements + 1,
    outbox: revisions.outbox + 1,
    readMarks: revisions.readMarks + 1,
  }
}

export function pageRevisionOf(revisions: PadRevisions, file: string): number {
  return (revisions.page[`pages/${file}`] ?? 0) + revisions.decisions
}
