import { type Token } from 'markdown-it'
import { decisionBlockContent, type DecisionBlock } from './decision-block'
import { htmlBlockContent, type CustomFileReader } from './html-block'
import { type NamedBlock, type NamedBlockContent } from './named-block'
import { type Heading } from './page-headings'
import { firstWordOf, namedBlockType, pageMarkdownParser } from './page-markdown-parser'
import { type PageProblem } from './page-problem'
import { linesAttribute, sourceLinesOf } from './source-lines'

const blockNames = ['decision', 'html']

interface NamedBlockContext {
  readonly headings: readonly Heading[]
  readonly readCustomFile: CustomFileReader
}

interface RenderedNamedBlocks {
  readonly decisions: readonly DecisionBlock[]
  readonly problems: readonly PageProblem[]
}

export function renderNamedBlocks(
  tokens: readonly Token[],
  lines: readonly string[],
  context: NamedBlockContext,
): RenderedNamedBlocks {
  const outputs = tokens.flatMap((token) =>
    token.type === namedBlockType && token.map !== null
      ? [renderNamedBlock(token, namedBlockOf(token, token.map, lines), context)]
      : [],
  )
  return {
    decisions: outputs.flatMap((output) =>
      output.decision === undefined ? [] : [output.decision],
    ),
    problems: outputs.flatMap((output) => output.problems),
  }
}

function namedBlockOf(token: Token, map: [number, number], lines: readonly string[]): NamedBlock {
  const name = firstWordOf(token.info)
  return {
    name,
    options: token.info.slice(name.length).trim(),
    body: token.content,
    closed: token.markup !== '',
    lines: sourceLinesOf(map, lines),
  }
}

function renderNamedBlock(
  token: Token,
  block: NamedBlock,
  context: NamedBlockContext,
): NamedBlockContent {
  const content = namedBlockContent(block, context)
  const problems = [
    ...(block.closed
      ? []
      : [
          {
            line: block.lines.firstLine,
            text: `the :::${block.name} block isn't closed with a ::: line`,
          },
        ]),
    ...content.problems,
  ]
  token.type = 'html_block'
  token.content = wrappedHtml(block, content, problems)
  return { ...content, problems }
}

function namedBlockContent(block: NamedBlock, context: NamedBlockContext): NamedBlockContent {
  if (block.name === 'decision') {
    const question = context.headings.findLast((heading) => heading.line < block.lines.firstLine)
    return decisionBlockContent(block, question?.text, (markdown) =>
      pageMarkdownParser.renderInline(markdown),
    )
  }
  if (block.name === 'html') {
    return htmlBlockContent(block, context.readCustomFile)
  }
  return unknownBlockContent(block)
}

function unknownBlockContent(block: NamedBlock): NamedBlockContent {
  const known = blockNames.map((name) => `:::${name}`).join(' and ')
  return {
    className: 'unknown-block',
    attributes: [],
    html: `<pre>${escaped(block.body)}</pre>\n`,
    problems: [
      {
        line: block.lines.firstLine,
        text: `there aren't any blocks called :::${block.name}. The blocks are ${known}`,
      },
    ],
    decision: undefined,
  }
}

function wrappedHtml(
  block: NamedBlock,
  content: NamedBlockContent,
  problems: readonly PageProblem[],
): string {
  const attributes = [
    ['class', content.className],
    ...content.attributes,
    ['data-lines', linesAttribute(block.lines)],
  ]
    .map(([name, value]) => ` ${name}="${escaped(value)}"`)
    .join('')
  const warnings = problems.map(
    (problem) => `<p class="named-block-warning">${escaped(problem.text)}</p>\n`,
  )
  const html =
    content.html === '' || content.html.endsWith('\n') ? content.html : `${content.html}\n`
  return `<div${attributes}>\n${warnings.join('')}${html}</div>\n`
}

function escaped(text: string): string {
  return pageMarkdownParser.utils.escapeHtml(text)
}
