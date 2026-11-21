import { type DecisionBlock } from './decision-block'
import { type CustomFileReader } from './html-block'
import { renderNamedBlocks, type HtmlBlockSource } from './named-blocks'
import { type Token } from 'markdown-it'
import { addHeadingIds, headingsOf, type Heading } from './page-headings'
import { linksOf, type PageLink } from './page-links'
import { pageMarkdownParser } from './page-markdown-parser'
import { byLine, type PageProblem } from './page-problem'
import { markTopLevelBlocks } from './source-lines'

interface PageSource {
  readonly page: string
  readonly markdown: string
  readonly readCustomFile: CustomFileReader
}

export interface RenderedPage {
  readonly html: string
  readonly headings: readonly Heading[]
  readonly links: readonly PageLink[]
  readonly decisions: readonly DecisionBlock[]
  readonly htmlBlocks: readonly HtmlBlockSource[]
  readonly problems: readonly PageProblem[]
}

export function renderPage(source: PageSource): RenderedPage {
  return rendered(source, addHeadingIds)
}

// The details of every improvement are shown on the same tab so a heading in the details
// doesn't have an id that could clash with another heading or with an anchor on the tab.
export function renderDetails(source: PageSource): RenderedPage {
  return rendered(source, headingsOf)
}

function rendered(
  source: PageSource,
  headingsFrom: (tokens: readonly Token[]) => Heading[],
): RenderedPage {
  const tokens = pageMarkdownParser.parse(source.markdown, {})
  const lines = source.markdown.split('\n')
  markTopLevelBlocks(tokens, lines)
  const headings = headingsFrom(tokens)
  const links = linksOf(tokens, source.page)
  const namedBlocks = renderNamedBlocks(tokens, lines, {
    headings,
    readCustomFile: source.readCustomFile,
  })
  return {
    html: pageMarkdownParser.renderer.render(tokens, pageMarkdownParser.options, {}),
    headings,
    links,
    decisions: namedBlocks.decisions,
    htmlBlocks: namedBlocks.htmlBlocks,
    problems: namedBlocks.problems.toSorted(byLine),
  }
}

export function pageHeadings(markdown: string): Heading[] {
  return addHeadingIds(pageMarkdownParser.parse(markdown, {}))
}
