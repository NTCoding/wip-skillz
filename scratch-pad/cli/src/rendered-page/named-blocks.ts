import { type Token } from 'markdown-it'
import { agentNoteBlockContent, agentNoteBlockName } from './agent-note-block'
import { decisionBlockContent, type DecisionBlock } from './decision-block'
import { htmlBlockContent, type CustomFileReader } from './html-block'
import { type NamedBlock, type NamedBlockContent } from './named-block'
import { type Heading } from './page-headings'
import {
  blockBodyParser,
  firstWordOf,
  namedBlockType,
  pageMarkdownParser,
} from './page-markdown-parser'
import { type PageProblem } from './page-problem'
import { linesAttribute, sourceLinesOf } from './source-lines'

const blockNames = ['decision', 'html', agentNoteBlockName]
const blockList = new Intl.ListFormat('en-GB', { type: 'conjunction' })

interface NamedBlockContext {
  readonly headings: readonly Heading[]
  readonly readCustomFile: CustomFileReader
}

export interface HtmlBlockSource {
  readonly line: number
  readonly html: string
}

interface RenderedNamedBlocks {
  readonly decisions: readonly DecisionBlock[]
  readonly htmlBlocks: readonly HtmlBlockSource[]
  readonly problems: readonly PageProblem[]
}

interface RenderedNamedBlock extends NamedBlockContent {
  readonly block: NamedBlock
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
    htmlBlocks: outputs
      .filter((output) => output.block.name === 'html')
      .map((output) => ({ line: output.block.lines.firstLine, html: output.html })),
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
): RenderedNamedBlock {
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
  return { ...content, problems, block }
}

function namedBlockContent(block: NamedBlock, context: NamedBlockContext): NamedBlockContent {
  if (block.name === 'decision') {
    const question = context.headings.findLast((heading) => heading.line < block.lines.firstLine)
    return decisionBlockContent(block, question?.text, {
      inline: (markdown) => pageMarkdownParser.renderInline(markdown),
      blocks: (markdown) => blockBodyParser.render(markdown),
    })
  }
  if (block.name === 'html') {
    return htmlBlockContent(block, context.readCustomFile)
  }
  if (block.name === agentNoteBlockName) {
    return agentNoteBlockContent(block)
  }
  return unknownBlockContent(block)
}

function unknownBlockContent(block: NamedBlock): NamedBlockContent {
  const known = blockList.format(blockNames.map((name) => `:::${name}`))
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
