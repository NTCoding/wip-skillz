import { type Token } from 'markdown-it'
import { isDecisionId } from '../items/item-id'
import { type DecisionBlock, type DecisionChoice } from '../rendered-page/decision-block'
import { type Heading, uniqueHeadingId } from '../rendered-page/page-headings'
import { firstWordOf, namedBlockType } from '../rendered-page/page-markdown-parser'
import { type PageProblem } from '../rendered-page/page-problem'

// A decision page is a sub page that the agent writes from a template. The first block of the page
// is a marker, which the command `page --type=decision` writes with the id of the decision:
//
//   :::decision-page d-4
//   :::
//
// The server recognises a decision page by the marker. The server checks the page against the
// template each time the page is read. A page with a problem is broken. Nick can't decide a broken
// page.
export const decisionPageBlockName = 'decision-page'

const requiredSections = ['Context', 'Options', 'Agent recommendation'] as const
const sectionList = new Intl.ListFormat('en-GB', { type: 'conjunction' })
const optionHeadingPattern = /^Option (\d+): (\S.*)$/u

export function decisionPageTemplate(id: string): string {
  return [
    `:::${decisionPageBlockName} ${id}`,
    ':::',
    '',
    '# <title>',
    '<description>',
    '',
    '## Context',
    '<the problem or goal, explained with examples>',
    '',
    '## Options',
    '',
    '<Write one "### Option N: name" section for each option. Add as many as the decision needs. There have to be at least 2. Delete this line.>',
    '',
    '### Option 1: <name>',
    '<prose>',
    '',
    '## Agent recommendation',
    '<which option and why>',
    '',
  ].join('\n')
}

export interface DecisionPageOption {
  readonly number: number
  readonly name: string
}

export interface DecisionPage {
  // The id in the marker, or undefined when the marker doesn't have a valid id
  readonly id: string | undefined
  // The line of the first marker. The problems of the page are shown under the marker.
  readonly markerLine: number
  readonly title: string | undefined
  readonly titleLine: number
  readonly options: readonly DecisionPageOption[]
  readonly problems: readonly PageProblem[]
}

interface Section {
  readonly heading: Heading
  readonly text: string
}

function isMarker(token: Token): boolean {
  return token.type === namedBlockType && firstWordOf(token.info) === decisionPageBlockName
}

function lineOf(token: Token): number {
  return Number(token.map?.[0]) + 1
}

function problem(line: number, text: string): PageProblem {
  return { line, text }
}

// The text of the lines after the heading on a line, up to the line before the end line. A line is
// numbered from 1.
function textBetween(lines: readonly string[], headingLine: number, endLine: number): string {
  return lines
    .slice(headingLine, endLine - 1)
    .join('\n')
    .trim()
}

// Every heading of one level, together with the text under the heading. The text ends at the next
// heading of the same level or a higher level. That means a sub section is part of the text.
function sectionsOf(
  headings: readonly Heading[],
  lines: readonly string[],
  level: number,
): Section[] {
  return headings.flatMap((heading, index): Section[] => {
    const next = headings.slice(index + 1).find((other) => other.level <= level)
    return heading.level === level
      ? [{ heading, text: textBetween(lines, heading.line, next?.line ?? lines.length + 1) }]
      : []
  })
}

// The text under a heading up to the next heading of any level
function ownText(headings: readonly Heading[], lines: readonly string[], heading: Heading): string {
  const next = headings[headings.indexOf(heading) + 1]
  return textBetween(lines, heading.line, next?.line ?? lines.length + 1)
}

// The placeholders of the template. A page has a problem when a line still has one of them exactly
// as the template writes it. Other text in angle brackets, like List<Invoice>, is content.
const placeholders = [
  '<title>',
  '<description>',
  '<the problem or goal, explained with examples>',
  '<name>',
  '<prose>',
  '<which option and why>',
]
const clueLinePattern = /<Write one .*? Delete this line\.>/u

function placeholderProblems(lines: readonly string[]): PageProblem[] {
  return lines.flatMap((text, index): PageProblem[] => [
    ...placeholders
      .filter((placeholder) => text.includes(placeholder))
      .map((placeholder) =>
        problem(
          index + 1,
          `the page still has the placeholder ${placeholder} from the template. Replace the placeholder with real content`,
        ),
      ),
    ...(clueLinePattern.test(text)
      ? [
          problem(
            index + 1,
            'the page still has the instruction line from the template. Delete the line',
          ),
        ]
      : []),
  ])
}

function sectionProblems(headings: readonly Heading[], firstLine: number): PageProblem[] {
  const names = headings.filter((heading) => heading.level === 2)
  const expected = sectionList.format(requiredSections)
  const missing = requiredSections.filter(
    (section) => !names.some((heading) => heading.text === section),
  )
  const unexpected = names.filter(
    (heading) => !requiredSections.some((section) => section === heading.text),
  )
  const twice = requiredSections.filter(
    (section) => names.filter((heading) => heading.text === section).length > 1,
  )
  const written = names
    .map((heading) => heading.text)
    .filter((text) => requiredSections.some((section) => section === text))
  const outOfOrder =
    missing.length === 0 &&
    twice.length === 0 &&
    written.some((text, index) => text !== requiredSections[index])
  return [
    ...missing.map((section) =>
      problem(firstLine, `the "${section}" section is missing. The sections are ${expected}`),
    ),
    ...unexpected.map((heading) =>
      problem(
        heading.line,
        `the section "${heading.text}" isn't one of the sections. The sections are ${expected}`,
      ),
    ),
    ...twice.map((section) => problem(firstLine, `the "${section}" section is written twice`)),
    ...(outOfOrder
      ? [problem(firstLine, `the sections are out of order. The order is ${expected}`)]
      : []),
  ]
}

function optionProblems(
  headings: readonly Heading[],
  lines: readonly string[],
  firstLine: number,
): { readonly options: DecisionPageOption[]; readonly problems: PageProblem[] } {
  const optionsIndex = headings.findIndex(
    (heading) => heading.level === 2 && heading.text === 'Options',
  )
  if (optionsIndex === -1) {
    return { options: [], problems: [] }
  }
  const after = headings.slice(optionsIndex + 1)
  const endIndex = after.findIndex((heading) => heading.level <= 2)
  const inside = endIndex === -1 ? after : after.slice(0, endIndex)
  const optionHeadings = inside.filter((heading) => heading.level === 3)
  const options = optionHeadings.flatMap((heading): DecisionPageOption[] => {
    const match = optionHeadingPattern.exec(heading.text)
    return match === null ? [] : [{ number: Number(match[1]), name: String(match[2]) }]
  })
  const headingProblems = optionHeadings.flatMap((heading, index): PageProblem[] => {
    const match = optionHeadingPattern.exec(heading.text)
    if (match === null) {
      return [
        problem(
          heading.line,
          `"${heading.text}" isn't an option heading. Write the heading as ### Option ${index + 1}: name`,
        ),
      ]
    }
    return Number(match[1]) === index + 1
      ? []
      : [
          problem(
            heading.line,
            `the option is numbered ${match[1]} but it is option ${index + 1}. Number the options 1, 2, 3 and so on in order`,
          ),
        ]
  })
  const textProblems = sectionsOf(inside, lines, 3).flatMap((section): PageProblem[] =>
    section.text === ''
      ? [
          problem(
            section.heading.line,
            `"${section.heading.text}" doesn't have any text. Describe the option`,
          ),
        ]
      : [],
  )
  const countProblems =
    options.length < 2
      ? [
          problem(
            firstLine,
            'the page has fewer than 2 options. A decision needs at least 2 options',
          ),
        ]
      : []
  return { options, problems: [...countProblems, ...headingProblems, ...textProblems] }
}

function titleProblems(
  headings: readonly Heading[],
  lines: readonly string[],
): { readonly title: Heading | undefined; readonly problems: PageProblem[] } {
  const [title, ...others] = headings.filter((heading) => heading.level === 1)
  if (title === undefined) {
    return {
      title,
      problems: [problem(1, "the page doesn't have a title. Write the title as a # heading")],
    }
  }
  return {
    title,
    problems: [
      ...others.map((heading) =>
        problem(heading.line, 'the page has more than one # heading. Write the title once'),
      ),
      ...(ownText(headings, lines, title) === ''
        ? [problem(title.line, "the title doesn't have a description under it")]
        : []),
    ],
  }
}

function proseSectionProblems(
  headings: readonly Heading[],
  lines: readonly string[],
): PageProblem[] {
  return sectionsOf(headings, lines, 2).flatMap((section): PageProblem[] => {
    const needsText =
      section.heading.text === 'Context' || section.heading.text === 'Agent recommendation'
    return needsText && section.text === ''
      ? [
          problem(
            section.heading.line,
            `the "${section.heading.text}" section doesn't have any text`,
          ),
        ]
      : []
  })
}

// Returns undefined when the page doesn't have the marker of a decision page. The tokens are the
// tokens of the page before the named blocks are rendered.
export function scanDecisionPage(
  tokens: readonly Token[],
  headings: readonly Heading[],
  lines: readonly string[],
): DecisionPage | undefined {
  const [marker, ...others] = tokens.filter(isMarker)
  if (marker === undefined) {
    return undefined
  }
  const markerLine = lineOf(marker)
  const written = marker.info.slice(decisionPageBlockName.length).trim()
  const id = isDecisionId(written) ? written : undefined
  const { title, problems: titleIssues } = titleProblems(headings, lines)
  const firstLine = title?.line ?? 1
  const { options, problems: optionIssues } = optionProblems(headings, lines, firstLine)
  return {
    id,
    markerLine,
    title: title?.text,
    titleLine: firstLine,
    options,
    problems: [
      ...(id === undefined
        ? [problem(markerLine, "the decision page doesn't have an id (write :::decision-page d-1)")]
        : []),
      ...others.map((token) =>
        problem(lineOf(token), 'the page has more than one :::decision-page marker'),
      ),
      ...titleIssues,
      ...sectionProblems(headings, firstLine),
      ...proseSectionProblems(headings, lines),
      ...optionIssues,
      ...placeholderProblems(lines),
    ],
  }
}

// The id of a decision page that has the marker and doesn't have any problem
export function finishedId(page: DecisionPage | undefined): string | undefined {
  return page?.problems.length === 0 ? page.id : undefined
}

// The heading of the option that a choice like option-2 stands for, like "Option 2: Double the wait"
export function optionHeadingOf(lines: readonly string[], choice: string): string | undefined {
  const number = /^option-(\d+)$/u.exec(choice)?.[1]
  if (number === undefined) {
    return undefined
  }
  return lines
    .find((line) => line.startsWith(`### Option ${number}: `))
    ?.slice('### '.length)
    .trim()
}

function choicesOf(options: readonly DecisionPageOption[]): DecisionChoice[] {
  return options.map((option) => ({
    choice: `option-${option.number}`,
    label: `Option ${option.number}: ${option.name}`,
  }))
}

// The decision of a finished decision page, in the same shape as the decision of an inline block
export function decisionOfPage(
  page: DecisionPage,
  id: string,
  lines: readonly string[],
): DecisionBlock {
  return {
    id,
    firstLine: page.titleLine,
    lastLine: lines.length,
    question: page.title ?? `Decision ${id}`,
    context: undefined,
    proposal: undefined,
    alternative: undefined,
    pick: undefined,
    options: choicesOf(page.options),
  }
}

export interface DecisionPageHtml {
  // The status and the table of contents, which are shown under the title
  readonly intro: string
  // The Decision section, which is shown after the text of the page
  readonly decision: string
  // The headings that the server adds
  readonly headings: readonly Heading[]
  // The entries of the table of contents
  readonly contents: readonly Heading[]
}

// A decision page is a draft until the agent runs `ready`. Nick can open a draft page, but the
// page doesn't have a Decision section or a table of contents, and the decision isn't listed.
export function draftPageHtml(id: string): DecisionPageHtml {
  return {
    intro: `<p class="decision-page-status" data-decision="${id}" data-state="draft"></p>\n`,
    decision: '',
    headings: [],
    contents: [],
  }
}

// The ids of the decision pages that the agent has made ready, from the events of the scratch pad
export function readyDecisionPageIds(
  events: readonly { readonly kind: string; readonly item: string | undefined }[],
): Set<string> {
  return new Set(
    events.flatMap((event) =>
      event.kind === 'decision-ready' && event.item !== undefined ? [event.item] : [],
    ),
  )
}

function escaped(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function listItem(entry: Heading, sub = ''): string {
  return `<li><a href="#${entry.id}">${escaped(entry.text)}</a>${sub}</li>`
}

// The options are listed under the Options section, so the list is made of sections that have a
// list of options inside.
function contentsHtml(entries: readonly Heading[]): string {
  const items = entries
    .filter((entry) => entry.level === 2)
    .map((entry) => {
      const index = entries.indexOf(entry)
      const next = entries.findIndex((other, at) => at > index && other.level === 2)
      const subs = entries.slice(index + 1, next === -1 ? entries.length : next)
      return listItem(
        entry,
        subs.length === 0 ? '' : `<ul>${subs.map((sub) => listItem(sub)).join('')}</ul>`,
      )
    })
  return `<nav class="decision-page-contents"><ul>${items.join('')}</ul></nav>\n`
}

// The agent never writes the status, the table of contents or the Decision section. The Decision
// section lists the options that the agent wrote. The browser shows a button for each option.
export function decisionPageHtml(
  page: DecisionPage,
  id: string,
  headings: readonly Heading[],
  lineCount: number,
): DecisionPageHtml {
  const heading: Heading = {
    level: 2,
    text: 'Decision',
    id: uniqueHeadingId('Decision', headings),
    line: lineCount + 1,
  }
  const contents = [
    ...headings.filter(
      (each) => each.level === 2 || (each.level === 3 && optionHeadingPattern.test(each.text)),
    ),
    heading,
  ]
  const options = choicesOf(page.options)
    .map(
      (option) =>
        `<p class="decision-option" data-choice="${option.choice}">${escaped(option.label)}</p>\n`,
    )
    .join('')
  return {
    intro: `<p class="decision-page-status" data-decision="${id}"></p>\n${contentsHtml(contents)}`,
    decision: [
      `<h2 id="${heading.id}">${heading.text}</h2>\n`,
      `<div class="decision decision-page-decision" data-decision="${id}">\n${options}</div>\n`,
    ].join(''),
    headings: [heading],
    contents,
  }
}
