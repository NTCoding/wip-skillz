import {
  decisionOfPage,
  decisionPageHtml,
  draftPageHtml,
  type DecisionPageHtml,
  finishedId,
  scanDecisionPage,
  type DecisionPage,
} from '../decision-pages/decision-page'
import { type DecisionBlock } from './decision-block'
import { type CustomFileReader } from './html-block'
import { renderNamedBlocks, type HtmlBlockSource } from './named-blocks'
import { type Token } from 'markdown-it'
import { addHeadingIds, headingsOf, type Heading } from './page-headings'
import { htmlOf, indexLayout, indexPage, plainLayout, type PageLayout } from './index-page'
import { linksOf, type PageLink } from './page-links'
import { pageMarkdownParser } from './page-markdown-parser'
import { byLine, type PageProblem } from './page-problem'
import { markTopLevelBlocks } from './source-lines'

interface PageSource {
  readonly page: string
  readonly markdown: string
  readonly readCustomFile: CustomFileReader
  // The ids of the decision pages that the agent has made ready. A decision page that isn't in the
  // set is a draft. A page without the set shows every decision page as ready.
  readonly readyDecisionPages?: ReadonlySet<string> | undefined
}

export interface RenderedPage {
  readonly html: string
  readonly headings: readonly Heading[]
  readonly links: readonly PageLink[]
  readonly decisions: readonly DecisionBlock[]
  readonly htmlBlocks: readonly HtmlBlockSource[]
  readonly problems: readonly PageProblem[]
  // Only a page with the marker of a decision page has one, even if the page is broken
  readonly decisionPage: DecisionPage | undefined
  // A decision page is a draft until the agent has made the decision ready
  readonly draft: boolean
}

type Layout = (
  tokens: readonly Token[],
  headings: readonly Heading[],
  lineCount: number,
) => PageLayout

export function renderPage(source: PageSource): RenderedPage {
  return rendered(source, addHeadingIds, source.page === indexPage ? indexLayout : plainLayout)
}

// The details of every improvement are shown on the same tab so a heading in the details
// doesn't have an id that could clash with another heading or with an anchor on the tab.
export function renderDetails(source: PageSource): RenderedPage {
  return rendered(source, headingsOf, plainLayout)
}

// The status and the table of contents are shown under the title, which is the first heading of
// level 1. The Decision section is shown after the text of the page. markdown-it always puts the
// inline token of a heading between its opening and closing tokens.
function decisionPageLayout(
  tokens: readonly Token[],
  added: ReturnType<typeof decisionPageHtml>,
  headings: readonly Heading[],
): PageLayout {
  const title = tokens.findIndex((token) => token.type === 'heading_open' && token.tag === 'h1')
  const split = title + 3
  return {
    html: [
      htmlOf(tokens.slice(0, split)),
      added.intro,
      htmlOf(tokens.slice(split)),
      added.decision,
    ].join(''),
    headings: [...headings, ...added.headings],
  }
}

// A page that has the marker is a draft until the agent makes the decision ready. The problems of
// a draft are the problems of the template that the agent hasn't filled in yet. The page doesn't
// show them, but `check` and the command `ready` report them.
interface DecisionPageView {
  readonly draft: boolean
  // The id of the decision that Nick can decide, which a draft page or a page that is broken
  // without having been ready doesn't have
  readonly decisionId: string | undefined
  // The status, the table of contents and the Decision section that the server adds
  readonly addition: DecisionPageHtml | undefined
  // The page as the marker block shows the page. A draft doesn't show its problems.
  readonly shown: DecisionPage | undefined
}

function decisionPageView(
  decisionPage: DecisionPage | undefined,
  ready: ReadonlySet<string> | undefined,
  headings: readonly Heading[],
  lineCount: number,
): DecisionPageView {
  if (decisionPage === undefined) {
    return { draft: false, decisionId: undefined, addition: undefined, shown: undefined }
  }
  if (decisionPage.id !== undefined && ready !== undefined && !ready.has(decisionPage.id)) {
    return {
      draft: true,
      decisionId: undefined,
      addition: draftPageHtml(decisionPage.id),
      shown: { ...decisionPage, problems: [] },
    }
  }
  const decisionId = keptId(decisionPage, ready)
  return {
    draft: false,
    decisionId,
    addition:
      decisionId === undefined
        ? undefined
        : decisionPageHtml(decisionPage, decisionId, headings, lineCount),
    shown: decisionPage,
  }
}

// A page that has been ready keeps its decision when the template breaks later, so Nick still
// sees the page and his answer. A page without a problem has its decision too.
function keptId(page: DecisionPage, ready: ReadonlySet<string> | undefined): string | undefined {
  return page.id !== undefined && ready?.has(page.id) === true ? page.id : finishedId(page)
}

function rendered(
  source: PageSource,
  headingsFrom: (tokens: readonly Token[]) => Heading[],
  layout: Layout,
): RenderedPage {
  const tokens = pageMarkdownParser.parse(source.markdown, {})
  const lines = source.markdown.split('\n')
  markTopLevelBlocks(tokens, lines)
  const headings = headingsFrom(tokens)
  const decisionPage = scanDecisionPage(tokens, headings, lines)
  const view = decisionPageView(decisionPage, source.readyDecisionPages, headings, lines.length)
  const links = linksOf(tokens, source.page)
  const namedBlocks = renderNamedBlocks(tokens, lines, {
    headings,
    readCustomFile: source.readCustomFile,
    decisionPage: view.shown,
  })
  const { addition } = view
  const draftProblems = decisionPage?.problems ?? []
  const shown =
    addition === undefined
      ? layout(tokens, headings, lines.length)
      : decisionPageLayout(tokens, addition, headings)
  return {
    html: shown.html,
    headings: shown.headings,
    links: [
      ...links,
      ...(addition?.contents ?? []).map((entry): PageLink => ({
        kind: 'page',
        line: entry.line,
        href: `#${entry.id}`,
        page: source.page,
        headingId: entry.id,
      })),
    ],
    // An inline decision on a draft page isn't listed anywhere until the agent makes the page ready
    decisions: [
      ...(view.draft ? [] : namedBlocks.decisions),
      ...(decisionPage === undefined || view.decisionId === undefined
        ? []
        : [decisionOfPage(decisionPage, view.decisionId, lines)]),
    ],
    htmlBlocks: namedBlocks.htmlBlocks,
    problems: [...namedBlocks.problems, ...(view.draft ? draftProblems : [])].toSorted(byLine),
    decisionPage,
    draft: view.draft,
  }
}

export function pageHeadings(markdown: string): Heading[] {
  return addHeadingIds(pageMarkdownParser.parse(markdown, {}))
}
