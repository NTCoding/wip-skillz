import { createHash } from 'node:crypto'
import { pageHeadings } from '../rendered-page/rendered-page'
import { ScratchPadError } from '../scratch-pad-error'

// Nick marks a page and its sections as read in the browser. A section starts at a heading of
// level 2 or 3 and ends before the next heading whose level is 3 or less. The hash of a section's
// text is stored when Nick marks the section as read. So a section has changed if the hash of its
// text is different now, or if the section wasn't on the page when Nick read the page.
// The hash of a section's text, which the browser posts back when Nick marks the section as read.
// So Nick only marks the text as read that the browser showed him.
export interface SectionHash {
  readonly id: string
  readonly hash: string
}

export interface SectionText extends SectionHash {
  readonly title: string
}

export interface ReadSection {
  readonly page: string
  readonly section: string
  readonly hash: string
}

export interface ReadMarks {
  readonly pages: readonly string[]
  readonly sections: readonly ReadSection[]
}

type PageReadState =
  | { readonly kind: 'new' }
  | { readonly kind: 'read'; readonly changedSections: readonly SectionText[] }

export class UnknownSectionError extends ScratchPadError {
  constructor(section: string, page: string) {
    super(`There isn't any section ${section} on ${page}. Reload the page and try again.`)
  }
}

function hashOf(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function sectionTexts(markdown: string): SectionText[] {
  const lines = markdown.split('\n')
  const headings = pageHeadings(markdown).filter((heading) => heading.level <= 3)
  return headings.flatMap((heading, index) => {
    if (heading.level === 1) {
      return []
    }
    const end = headings[index + 1]?.line ?? lines.length + 1
    const text = lines
      .slice(heading.line - 1, end - 1)
      .join('\n')
      .trim()
    return [{ id: heading.id, title: heading.text, hash: hashOf(text) }]
  })
}

export function findSection(
  sections: readonly SectionText[],
  id: string,
  page: string,
): SectionText {
  const section = sections.find((each) => each.id === id)
  if (section === undefined) {
    throw new UnknownSectionError(id, page)
  }
  return section
}

export function pageReadState(
  page: string,
  sections: readonly SectionText[],
  marks: ReadMarks,
): PageReadState {
  if (!marks.pages.includes(page)) {
    return { kind: 'new' }
  }
  const hashes = new Map(
    marks.sections.filter((mark) => mark.page === page).map((mark) => [mark.section, mark.hash]),
  )
  return {
    kind: 'read',
    changedSections: sections.filter((section) => hashes.get(section.id) !== section.hash),
  }
}
