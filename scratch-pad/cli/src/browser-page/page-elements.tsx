import {
  cloneElement,
  createElement,
  Fragment,
  isValidElement,
  type Key,
  type ReactNode,
} from 'react'
import { type Answer, type ViewedPage } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import {
  AgentNote,
  CodeBlock,
  DecisionAnswerForm,
  DecisionCard,
  HtmlBlock,
  ImageBlock,
  Notice,
  PageLink,
  TableBlock,
  type DecisionAnswer,
  type Navigate,
  type PreviewContent,
} from './design-system/design-system'

export interface PageElementContext {
  readonly addresses: PadAddresses
  readonly page: ViewedPage
  readonly onNavigate: Navigate
  readonly loadPreview: (
    file: string,
    section: string | undefined,
  ) => Promise<PreviewContent | undefined>
  readonly onAnswerDecision: ((id: string, answer: DecisionAnswer) => Promise<void>) | undefined
  readonly onCommentOnBlock: ((lines: string) => void) | undefined
  readonly answersOnThisPage: ReadonlyMap<string, Answer>
}

interface ConversionContext extends PageElementContext {
  readonly highlightedText: ReadonlyMap<Node, readonly ReactNode[]>
  // The ids of the answered decisions that are shown in the margin rather than in the text
  readonly movedDecisions: ReadonlySet<string>
}

const copiedAttributes: Readonly<Record<string, string>> = {
  id: 'id',
  src: 'src',
  alt: 'alt',
  title: 'title',
  start: 'start',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  'data-lines': 'data-lines',
}

const skippedTags = new Set(['script', 'style', 'iframe', 'object', 'embed'])
const containersWithoutText = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'ul', 'ol', 'dl'])
const alignment = /text-align:\s*(left|center|right)/
const linkSchemes = new Set(['http:', 'https:', 'mailto:'])

function attributesOf(element: Element): Record<string, string> {
  const attributes = Object.fromEntries(
    [...element.attributes].flatMap((attribute) => {
      const name = copiedAttributes[attribute.name]
      return name === undefined ? [] : [[name, attribute.value]]
    }),
  )
  const align = alignment.exec(element.getAttribute('style') ?? 'none')?.[1]
  return align === undefined ? attributes : { ...attributes, 'data-align': align }
}

function childrenOf(element: Element, context: ConversionContext): ReactNode[] {
  const withoutText = containersWithoutText.has(element.tagName.toLowerCase())
  return [...element.childNodes]
    .filter((node) => !(withoutText && node.nodeType === Node.TEXT_NODE))
    .map((node, index) => nodeElement(node, index, context))
}

function answerText(answer: Answer): string {
  return 'choice' in answer ? answer.choice : answer.written
}

function decisionFields(element: Element, context: ConversionContext) {
  const field = (name: string): ReactNode => {
    const value = element.querySelector(`.decision-${name} > p:not(.decision-label)`)
    return value === null ? null : childrenOf(value, context)
  }
  return { proposal: field('proposal'), alternative: field('alternative'), pick: field('pick') }
}

// A decision that Nick has answered is shown in the margin beside the heading of its question,
// rather than in the text. A decision stays in the text if it doesn't have a heading above it, if
// it has a warning or if it's inside another block, because the margin can't show it there.
export interface AnsweredDecision {
  readonly id: string
  readonly question: string
  readonly headingLines: string
  readonly blockLines: string | undefined
  readonly proposal: ReactNode
  readonly alternative: ReactNode
  readonly pick: ReactNode
  readonly answer: string
  readonly context: readonly string[]
}

const headingTags = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'])

function elementsAbove(element: Element): Element[] {
  const above = element.previousElementSibling
  return above === null ? [] : [above, ...elementsAbove(above)]
}

function answeredDecisionOf(
  element: Element,
  context: ConversionContext,
): AnsweredDecision | undefined {
  const id = String(element.getAttribute('data-decision'))
  const decision = context.page.decisions.find((each) => each.id === id)
  const answer = decision?.answer ?? context.answersOnThisPage.get(id)
  const above = elementsAbove(element)
  // The headings that the server adds to the index page aren't in the file, so they don't have
  // any lines. The question of a decision is always a heading from the file.
  const headingIndex = above.findIndex(
    (each) => headingTags.has(each.tagName) && each.hasAttribute('data-lines'),
  )
  const heading = above[headingIndex]
  const warning = element.querySelector(':scope > .named-block-warning')
  const movable = element.parentElement?.tagName === 'BODY' && warning === null
  if (decision?.question === undefined || answer === undefined || heading === undefined) {
    return undefined
  }
  if (!movable) {
    return undefined
  }
  return {
    id,
    question: decision.question,
    headingLines: String(heading.getAttribute('data-lines')),
    blockLines: element.getAttribute('data-lines') ?? undefined,
    ...decisionFields(element, context),
    answer: answerText(answer),
    context: above
      .slice(0, headingIndex)
      .filter((each) => each.tagName === 'P')
      .map((each) => String(each.textContent).trim())
      .filter((text) => text !== '')
      .toReversed(),
  }
}

export function answeredDecisions(context: PageElementContext, body: Element): AnsweredDecision[] {
  const conversion = { ...context, highlightedText: new Map(), movedDecisions: new Set<string>() }
  return [...body.querySelectorAll(':scope > .decision')].flatMap((element) => {
    const decision = answeredDecisionOf(element, conversion)
    return decision === undefined ? [] : [decision]
  })
}

function decisionElement(element: Element, key: Key, context: ConversionContext): ReactNode {
  const id = String(element.getAttribute('data-decision'))
  if (context.movedDecisions.has(id)) {
    return null
  }
  const decision = context.page.decisions.find((each) => each.id === id)
  const answer = decision?.answer ?? context.answersOnThisPage.get(id)
  const answerable = answer === undefined && decision?.question !== undefined
  const { onAnswerDecision } = context
  const fields = decisionFields(element, context)
  const warnings = [...element.querySelectorAll(':scope > .named-block-warning')]
  return (
    <div
      key={key}
      id={id}
      tabIndex={-1}
      data-lines={element.getAttribute('data-lines') ?? undefined}
    >
      <DecisionCard
        id={id}
        question={decision?.question}
        proposal={fields.proposal}
        alternative={fields.alternative}
        pick={fields.pick}
        answer={answer === undefined ? undefined : answerText(answer)}
      >
        {warnings.map((warning, index) => nodeElement(warning, index, context))}
        {answerable && onAnswerDecision !== undefined && (
          <DecisionAnswerForm onAnswer={(chosen) => onAnswerDecision(id, chosen)} />
        )}
      </DecisionCard>
    </div>
  )
}

function opensAnotherSite(href: string): boolean {
  return (
    URL.canParse(href, document.baseURI) &&
    linkSchemes.has(new URL(href, document.baseURI).protocol)
  )
}

function linkElement(element: Element, key: Key, context: ConversionContext): ReactNode {
  const href = String(element.getAttribute('href'))
  const children = childrenOf(element, context)
  const pageLink = context.page.links.find((link) => link.kind === 'page' && link.href === href)
  if (pageLink?.kind === 'page') {
    const file = fileOfPage(pageLink.page)
    return (
      <PageLink
        key={key}
        href={context.addresses.pageHref(file, pageLink.headingId)}
        onNavigate={context.onNavigate}
        loadPreview={() => context.loadPreview(file, pageLink.headingId)}
      >
        {children}
      </PageLink>
    )
  }
  if (!opensAnotherSite(href)) {
    return <Fragment key={key}>{children}</Fragment>
  }
  return (
    <a key={key} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

function wrapped(element: Element, key: Key, block: ReactNode): ReactNode {
  return (
    <div key={key} data-lines={element.getAttribute('data-lines') ?? undefined}>
      {block}
    </div>
  )
}

function blockElement(element: Element, key: Key, context: ConversionContext): ReactNode {
  const tag = element.tagName.toLowerCase()
  if (tag === 'pre') {
    const language = /language-(\S+)/.exec(element.querySelector('code')?.className ?? 'none')?.[1]
    return wrapped(
      element,
      key,
      <CodeBlock code={String(element.textContent)} language={language} />,
    )
  }
  if (tag === 'table') {
    return wrapped(element, key, <TableBlock>{childrenOf(element, context)}</TableBlock>)
  }
  if (element.classList.contains('html-block')) {
    const lines = String(element.getAttribute('data-lines'))
    const { onCommentOnBlock } = context
    return wrapped(
      element,
      key,
      <HtmlBlock
        html={element.innerHTML}
        onNavigate={context.onNavigate}
        frameSource={context.addresses.htmlBlockFrame}
        onComment={onCommentOnBlock === undefined ? undefined : () => onCommentOnBlock(lines)}
      />,
    )
  }
  const image = element.children[0]
  if (tag === 'p' && element.childNodes.length === 1 && image?.tagName === 'IMG') {
    const source = String(image.getAttribute('src'))
    return wrapped(
      element,
      key,
      <ImageBlock src={source} alt={String(image.getAttribute('alt'))} />,
    )
  }
  return undefined
}

function textOf(node: ChildNode, context: ConversionContext): ReactNode {
  if (node.nodeType !== Node.TEXT_NODE) {
    return null
  }
  return context.highlightedText.get(node) ?? node.textContent
}

function nodeElement(node: ChildNode, key: Key, context: ConversionContext): ReactNode {
  if (!(node instanceof Element)) {
    return textOf(node, context)
  }
  const tag = node.tagName.toLowerCase()
  if (skippedTags.has(tag)) {
    return null
  }
  if (node.classList.contains('decision')) {
    return decisionElement(node, key, context)
  }
  if (node.classList.contains('agent-note')) {
    return wrapped(node, key, <AgentNote>{childrenOf(node, context)}</AgentNote>)
  }
  if (node.classList.contains('named-block-warning')) {
    return (
      <Notice key={key} tone="warning">
        {node.textContent}
      </Notice>
    )
  }
  if (tag === 'a') {
    return linkElement(node, key, context)
  }
  const block = blockElement(node, key, context)
  if (block !== undefined) {
    return block
  }
  const children = childrenOf(node, context)
  return createElement(tag, { key, ...attributesOf(node) }, ...children)
}

export function parsedPageBody(html: string): Element {
  return new DOMParser().parseFromString(html, 'text/html').body
}

function contentOf(node: ChildNode): string {
  return node instanceof Element
    ? node.outerHTML.replaceAll(/ data-lines="[^"]*"/gu, '')
    : `text:${String(node.textContent)}`
}

interface KeyedBlock {
  readonly node: ChildNode
  readonly key: string
}

export function keyedBlocks(nodes: readonly ChildNode[]): KeyedBlock[] {
  const seen = new Map<string, number>()
  return nodes.map((node) => {
    const content = contentOf(node)
    const count = (seen.get(content) ?? 0) + 1
    seen.set(content, count)
    return { node, key: `${count}:${content}` }
  })
}

// The read marks of a page. afterTitle is shown under the first heading of level 1, like the
// line that says that the page is new. If the page doesn't have a heading of level 1, afterTitle
// is shown above the first block.
export interface PageMarks {
  readonly changedSections: ReadonlySet<string>
  readonly afterTitle: ReactNode
}

const noMarks: PageMarks = { changedSections: new Set(), afterTitle: undefined }

const sectionTags = new Set(['H1', 'H2', 'H3'])

// Each block of the page belongs to the section of the heading of level 2 or 3 above it. A heading
// of level 1 ends the section above it.
function sectionsOfBlocks(blocks: readonly ChildNode[]): (string | undefined)[] {
  return blocks.reduce<(string | undefined)[]>((sections, block) => {
    const above = sections.at(-1)
    if (!(block instanceof Element) || !sectionTags.has(block.tagName)) {
      return [...sections, above]
    }
    return [...sections, block.tagName === 'H1' ? undefined : block.id]
  }, [])
}

interface ChangedSectionProps {
  readonly 'data-changed-section'?: string
}

function markedChanged(element: ReactNode): ReactNode {
  return isValidElement<ChangedSectionProps>(element) && typeof element.type === 'string'
    ? cloneElement(element, { 'data-changed-section': '' })
    : element
}

// movedDecisions contains the ids of the answered decisions that the margin shows, which
// answeredDecisions returns, so those decisions are left out of the text.
export function pageElements(
  context: PageElementContext,
  body: Element,
  highlightedText: ReadonlyMap<Node, readonly ReactNode[]>,
  marks: PageMarks = noMarks,
  movedDecisions: ReadonlySet<string> = new Set(),
): ReactNode[] {
  const conversion = { ...context, highlightedText, movedDecisions }
  const blocks = [...body.childNodes].filter(
    (node) => node instanceof Element || String(node.textContent).trim() !== '',
  )
  const sections = sectionsOfBlocks(blocks)
  const title = blocks.findIndex((node) => node instanceof Element && node.tagName === 'H1')
  const afterTitle =
    marks.afterTitle === undefined
      ? []
      : [<Fragment key="after-title">{marks.afterTitle}</Fragment>]
  const elements = keyedBlocks(blocks).flatMap(({ node, key }, index) => {
    const section = sections[index]
    const element = nodeElement(node, key, conversion)
    const shown = (
      <Fragment key={key}>
        {section !== undefined && marks.changedSections.has(section)
          ? markedChanged(element)
          : element}
      </Fragment>
    )
    return index === title ? [shown, ...afterTitle] : [shown]
  })
  return title === -1 ? [...afterTitle, ...elements] : elements
}
