import { type Token } from 'markdown-it'
import { isDecisionId } from '../items/item-id'
import { bodyLines, type NamedBlock, type NamedBlockContent } from './named-block'
import { firstWordOf, namedBlockType } from './page-markdown-parser'
import { type PageProblem } from './page-problem'

// The context is optional, because the decisions on an older page don't have one. The check
// command reports an open decision without a context.
const decisionFields = ['context', 'proposal', 'alternative', 'pick'] as const
const requiredFields = ['proposal', 'alternative', 'pick'] as const
type DecisionField = (typeof decisionFields)[number]
type DecisionFields = Readonly<Record<DecisionField, string | undefined>>

const fieldLabels: Readonly<Record<DecisionField, string>> = {
  context: 'Context',
  proposal: 'Proposal',
  alternative: 'Alternative',
  pick: 'Pick',
}

// An option that Nick can choose on a decision page. The choice is the value that the browser
// sends, like option-2. The label is the heading of the option on the page.
export interface DecisionChoice {
  readonly choice: string
  readonly label: string
}

export interface DecisionBlock extends DecisionFields {
  readonly id: string
  readonly firstLine: number
  readonly lastLine: number
  readonly question: string | undefined
  // Only the decision of a decision page has options. An inline block has a proposal and an
  // alternative instead.
  readonly options?: readonly DecisionChoice[] | undefined
}

interface FieldScan {
  readonly current: DecisionField | undefined
  readonly fields: DecisionFields
  readonly problems: readonly PageProblem[]
}

type MarkdownRenderer = (markdown: string) => string

// The context can contain a paragraph and a numbered list, which are rendered as blocks. Each of the
// other fields is rendered as one paragraph.
interface DecisionRenderers {
  readonly inline: MarkdownRenderer
  readonly blocks: MarkdownRenderer
}

export function isDecision(token: Token): boolean {
  return token.type === namedBlockType && firstWordOf(token.info) === 'decision'
}

export function decisionBlockContent(
  block: NamedBlock,
  question: string | undefined,
  render: DecisionRenderers,
): NamedBlockContent {
  const id = isDecisionId(block.options) ? block.options : undefined
  const name = id === undefined ? 'the decision' : `decision ${id}`
  const scan = scanFields(block, name)
  // An empty context: line counts as a missing context. So the page doesn't show an empty label and
  // the check command reports the decision.
  const fields = {
    ...scan.fields,
    context: scan.fields.context === '' ? undefined : scan.fields.context,
  }
  const problems = [
    ...idProblems(block),
    ...(question === undefined
      ? [
          {
            line: block.lines.firstLine,
            text: `${name} doesn't have a heading above it (write the question as a heading)`,
          },
        ]
      : []),
    ...scan.problems,
    ...requiredFields
      .filter((field) => fields[field] === undefined)
      .map((field) => ({
        line: block.lines.firstLine,
        text: `${name} doesn't have the ${field}: line`,
      })),
  ]
  return {
    className: 'decision',
    attributes: id === undefined ? [] : [['data-decision', id]],
    html: [
      ...decisionFields.flatMap((field) => fieldHtml(field, fields[field], render)),
      ...(id === undefined ? [] : [buttonsHtml]),
    ].join(''),
    problems,
    decision: id === undefined ? undefined : { id, ...block.lines, question, ...fields },
  }
}

function idProblems(block: NamedBlock): PageProblem[] {
  const line = block.lines.firstLine
  if (block.options === '') {
    return [{ line, text: "the decision doesn't have an id (write :::decision d-1)" }]
  }
  return isDecisionId(block.options)
    ? []
    : [{ line, text: `"${block.options}" isn't a decision id. A decision id looks like d-1` }]
}

function scanFields(block: NamedBlock, name: string): FieldScan {
  const start: FieldScan = {
    current: undefined,
    fields: { context: undefined, proposal: undefined, alternative: undefined, pick: undefined },
    problems: [],
  }
  return bodyLines(block).reduce(
    (scan, text, index) => scanField(scan, text, block.lines.firstLine + 1 + index, name),
    start,
  )
}

function scanField(scan: FieldScan, text: string, line: number, name: string): FieldScan {
  if (text.trim() === '') {
    return scan
  }
  const field = decisionFields.find((candidate) => text.startsWith(`${candidate}:`))
  if (field !== undefined) {
    const value = text.slice(field.length + 1).trim()
    return scan.fields[field] === undefined
      ? { ...scan, current: field, fields: { ...scan.fields, [field]: value } }
      : withProblem(scan, line, `${name} has a second ${field}: line`)
  }
  if (scan.current !== undefined) {
    const value = `${scan.fields[scan.current]}\n${text.trim()}`
    return { ...scan, fields: { ...scan.fields, [scan.current]: value } }
  }
  return withProblem(
    scan,
    line,
    "the line doesn't start with context:, proposal:, alternative: or pick:",
  )
}

function withProblem(scan: FieldScan, line: number, text: string): FieldScan {
  return { ...scan, problems: [...scan.problems, { line, text }] }
}

function fieldHtml(
  field: DecisionField,
  value: string | undefined,
  render: DecisionRenderers,
): string[] {
  if (value === undefined) {
    return []
  }
  const html = field === 'context' ? render.blocks(value) : `<p>${render.inline(value)}</p>`
  return [
    `<div class="decision-${field}"><p class="decision-label">${fieldLabels[field]}</p>`,
    `${html}</div>\n`,
  ]
}

const buttonsHtml = [
  '<div class="decision-buttons">',
  '<button type="button" data-choice="proposal">Proposal</button>',
  '<button type="button" data-choice="alternative">Alternative</button>',
  '<button type="button" data-choice="written">Write an answer</button>',
  '</div>\n',
].join('')
