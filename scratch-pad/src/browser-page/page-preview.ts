import { type ViewedPage } from './api-responses'
import { fileOfPage } from './browser-route'
import { type PreviewContent } from './design-system/design-system'

const largestCharacters = 460
const largestParagraphs = 7
const textBlocks = new Set(['P', 'LI', 'BLOCKQUOTE', 'H2', 'H3', 'H4'])
const headingLevel: Readonly<Record<string, number>> = { H1: 1, H2: 2, H3: 3, H4: 4 }

function levelOf(element: Element): number {
  return headingLevel[element.tagName] ?? 0
}

function blocksAfter(body: HTMLElement, headingId: string | undefined): Element[] {
  const children = [...body.children]
  const heading = children.find((child) => child.id === headingId && levelOf(child) > 0)
  if (heading === undefined) {
    return children.filter((child) => levelOf(child) !== 1)
  }
  const level = levelOf(heading)
  const rest = children.slice(children.indexOf(heading) + 1)
  const end = rest.findIndex((child) => levelOf(child) > 0 && levelOf(child) <= level)
  return end === -1 ? rest : rest.slice(0, end)
}

function textsOf(blocks: readonly Element[]): { text: string; heading: boolean }[] {
  return blocks.flatMap((block) => {
    const items = block.tagName === 'UL' || block.tagName === 'OL' ? [...block.children] : [block]
    return items
      .filter((item) => textBlocks.has(item.tagName))
      .map((item) => ({
        text: String(item.textContent).replaceAll(/\s+/g, ' ').trim(),
        heading: levelOf(item) > 0,
      }))
      .filter((item) => item.text !== '')
  })
}

function withinLimits<T extends { readonly text: string }>(paragraphs: readonly T[]): T[] {
  const counted = { characters: 0 }
  return paragraphs.slice(0, largestParagraphs).filter((paragraph) => {
    const fits = counted.characters < largestCharacters
    counted.characters += paragraph.text.length
    return fits
  })
}

export function pagePreview(
  page: ViewedPage,
  padTitle: string,
  headingId: string | undefined,
): PreviewContent {
  const body = new DOMParser().parseFromString(page.html, 'text/html').body
  const pageTitle = page.title ?? fileOfPage(page.page)
  const heading = page.headings.find((each) => each.id === headingId && each.level > 1)
  return {
    title: heading?.text ?? pageTitle,
    path: `${padTitle} / ${pageTitle}`,
    paragraphs: withinLimits(textsOf(blocksAfter(body, heading?.id))),
  }
}
