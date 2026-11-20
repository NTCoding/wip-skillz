import { isDecisionId } from '../items/item-id'
import { bodyLines, type NamedBlock, type NamedBlockContent } from './named-block'
import { type PageProblem } from './page-problem'

const decisionFields = ['proposal', 'alternative', 'pick'] as const
type DecisionField = (typeof decisionFields)[number]
type DecisionFields = Readonly<Record<DecisionField, string | undefined>>

const fieldLabels: Readonly<Record<DecisionField, string>> = {
  proposal: 'Proposal',
  alternative: 'Alternative',
  pick: 'Pick',
}

export interface DecisionBlock extends DecisionFields {
  readonly id: string
  readonly firstLine: number
  readonly lastLine: number
  readonly question: string | undefined
}

interface FieldScan {
  readonly current: DecisionField | undefined
  readonly fields: DecisionFields
  readonly problems: readonly PageProblem[]
}

type InlineRenderer = (markdown: string) => string

export function decisionBlockContent(
  block: NamedBlock,
  question: string | undefined,
  renderInline: InlineRenderer,
): NamedBlockContent {
  const id = isDecisionId(block.options) ? block.options : undefined
  const name = id === undefined ? 'the decision' : `decision ${id}`
  const scan = scanFields(block, name)
  const problems = [
    ...idProblems(block),
    ...scan.problems,
    ...decisionFields
      .filter((field) => scan.fields[field] === undefined)
      .map((field) => ({
        line: block.lines.firstLine,
        text: `${name} doesn't have the ${field}: line`,
      })),
  ]
  return {
    className: 'decision',
    attributes: id === undefined ? [] : [['data-decision', id]],
    html: [
      ...decisionFields.flatMap((field) => fieldHtml(field, scan.fields[field], renderInline)),
      ...(id === undefined ? [] : [buttonsHtml]),
    ].join(''),
    problems,
    decision: id === undefined ? undefined : { id, ...block.lines, question, ...scan.fields },
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
    fields: { proposal: undefined, alternative: undefined, pick: undefined },
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
  return withProblem(scan, line, "the line doesn't start with proposal:, alternative: or pick:")
}

function withProblem(scan: FieldScan, line: number, text: string): FieldScan {
  return { ...scan, problems: [...scan.problems, { line, text }] }
}

function fieldHtml(
  field: DecisionField,
  value: string | undefined,
  renderInline: InlineRenderer,
): string[] {
  return value === undefined
    ? []
    : [
        `<div class="decision-${field}"><p class="decision-label">${fieldLabels[field]}</p>`,
        `<p>${renderInline(value)}</p></div>\n`,
      ]
}

const buttonsHtml = [
  '<div class="decision-buttons">',
  '<button type="button" data-choice="proposal">Proposal</button>',
  '<button type="button" data-choice="alternative">Alternative</button>',
  '<button type="button" data-choice="written">Write an answer</button>',
  '</div>\n',
].join('')
