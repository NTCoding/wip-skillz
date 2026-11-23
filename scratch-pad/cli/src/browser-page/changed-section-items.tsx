import { useRef, useState } from 'react'
import { type PageReadMark, type SectionHash } from './api-responses'
import {
  MarginMarker,
  NewPageLine,
  problemOf,
  SectionChange,
  type MarginItem,
} from './design-system/design-system'
import { shownTime } from './message-time'
import { type PageMarks } from './page-elements'

// The browser posts the hashes of the sections that it shows. That's why a text that the agent
// saves after that will still show as changed.
export interface ReadMarkActions {
  readonly markPageRead: (file: string, sections: readonly SectionHash[]) => Promise<void>
  readonly markPageUnread: (file: string) => Promise<void>
  readonly markSectionRead: (file: string, section: SectionHash) => Promise<void>
}

interface SectionReads {
  readonly markRead: (section: SectionHash) => void
  // The problem of the last click in each section that couldn't be marked as read, by the id of
  // the section
  readonly problems: ReadonlyMap<string, string>
}

interface ReadMarksOfPage {
  readonly marks: PageMarks
  readonly problems: ReadonlyMap<string, string>
}

function changedKey(section: string): string {
  return `changed-${section}`
}

function withoutProblem(problems: ReadonlyMap<string, string>, section: string) {
  return new Map([...problems].filter(([id]) => id !== section))
}

// A click inside a changed section marks the section as read. The section isn't posted again while
// its request is pending. That's why a double click only sends one request. The card of the section
// shows the problem of a request that has failed, like the server's error when the agent has
// renamed the heading of the section. The card is opened too, because below a reading width of
// 1040px the cards are hidden behind their markers.
function useSectionReads(
  actions: ReadMarkActions | undefined,
  file: string,
  openCard: (key: string) => void,
): SectionReads {
  const pending = useRef(new Set<string>())
  const [problems, setProblems] = useState<ReadonlyMap<string, string>>(new Map())
  const markRead = (section: SectionHash): void => {
    if (actions === undefined || pending.current.has(section.id)) {
      return
    }
    pending.current.add(section.id)
    setProblems((shown) => withoutProblem(shown, section.id))
    actions
      .markSectionRead(file, section)
      .catch((error: unknown) => {
        setProblems((shown) => new Map([...shown, [section.id, problemOf(error)]]))
        openCard(changedKey(section.id))
      })
      .finally(() => pending.current.delete(section.id))
  }
  return { markRead, problems }
}

function pageMarksOf(
  readMark: PageReadMark | undefined,
  actions: ReadMarkActions | undefined,
  file: string,
  reads: SectionReads,
): PageMarks {
  if (readMark === undefined || actions === undefined) {
    return { changedSections: new Map(), afterTitle: undefined }
  }
  return {
    changedSections: new Map(
      readMark.changedSections.map((section) => [section.id, () => reads.markRead(section)]),
    ),
    afterTitle:
      readMark.state === 'new' ? (
        <NewPageLine onMarkAsRead={() => actions.markPageRead(file, readMark.sections)} />
      ) : undefined,
  }
}

// The read marks that the page shows in its text and the problems that the cards of the changed
// sections show. openCard makes the card with the key active, which opens its popup below the
// marker in a narrow reading column.
export function usePageMarks(
  readMark: PageReadMark | undefined,
  actions: ReadMarkActions | undefined,
  file: string,
  openCard: (key: string) => void,
): ReadMarksOfPage {
  const reads = useSectionReads(actions, file, openCard)
  return { marks: pageMarksOf(readMark, actions, file, reads), problems: reads.problems }
}

interface ChangedSectionContext {
  readonly body: Element
  readonly active: string | undefined
  readonly toggle: (key: string) => void
  readonly problems: ReadonlyMap<string, string>
}

// Each changed section has a card in the margin beside its heading. The card and its marker are
// removed when Nick clicks inside the section, because the click marks the section as read.
export function changedSectionItems(
  readMark: PageReadMark | undefined,
  actions: ReadMarkActions | undefined,
  context: ChangedSectionContext,
): MarginItem[] {
  if (readMark === undefined || actions === undefined) {
    return []
  }
  return readMark.changedSections.map((section) => {
    const key = changedKey(section.id)
    const heading = [...context.body.children].find((element) => element.id === section.id)
    return {
      key,
      anchorLines: heading?.getAttribute('data-lines') ?? undefined,
      content: (
        <SectionChange
          title={section.title}
          shownTime={shownTime(readMark.changedTime)}
          active={key === context.active}
          problem={context.problems.get(section.id)}
        />
      ),
      marker: (
        <MarginMarker
          label={`${section.title} has changed`}
          kind="changed"
          messages={1}
          open={key === context.active}
          onClick={() => context.toggle(key)}
        />
      ),
      popup: key === context.active,
    }
  })
}
