import { type PageReadMark, type SectionHash } from './api-responses'
import {
  MarginMarker,
  NewPageLine,
  SectionChange,
  type MarginItem,
} from './design-system/design-system'
import { shownTime } from './message-time'
import { type PageMarks } from './page-elements'

// The browser posts the hashes of the sections that it shows, so a text that the agent saves after
// that will still show as changed.
export interface ReadMarkActions {
  readonly markPageRead: (file: string, sections: readonly SectionHash[]) => Promise<void>
  readonly markPageUnread: (file: string) => Promise<void>
  readonly markSectionRead: (file: string, section: SectionHash) => Promise<void>
}

function changedKey(section: string): string {
  return `changed-${section}`
}

export function pageMarksOf(
  readMark: PageReadMark | undefined,
  actions: ReadMarkActions | undefined,
  file: string,
): PageMarks {
  if (readMark === undefined || actions === undefined) {
    return { changedSections: new Set(), afterTitle: undefined }
  }
  return {
    changedSections: new Set(readMark.changedSections.map((section) => section.id)),
    afterTitle:
      readMark.state === 'new' ? (
        <NewPageLine onMarkAsRead={() => actions.markPageRead(file, readMark.sections)} />
      ) : undefined,
  }
}

interface ChangedSectionContext {
  readonly body: Element
  readonly file: string
  readonly active: string | undefined
  readonly toggle: (key: string) => void
}

// Each changed section has a card in the margin beside its heading.
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
          onMarkAsRead={() => actions.markSectionRead(context.file, section)}
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
