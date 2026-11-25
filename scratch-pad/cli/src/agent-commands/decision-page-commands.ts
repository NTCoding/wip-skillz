import { join } from 'node:path'
import { decisionPageTemplate } from '../decision-pages/decision-page'
import { readyDecisionPages } from '../decision-pages/ready-decision-pages'
import { renderPage, type RenderedPage } from '../rendered-page/rendered-page'
import { InvalidDecisionIdError, isDecisionId, nextItemId } from '../items/item-id'
import { pageLink, textWithLink, type ItemLinks } from '../item-links/item-links'
import { findPage } from '../pages/page-markdown'
import { nextSubPageNumber, pageFileOf } from '../pages/page-files'
import { isSentBack } from '../decisions/decision-review'
import { ScratchPadError } from '../scratch-pad-error'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

const namePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u
const indexPage = 'pages/index.md'
const decisionIdsInText = /^:::decision(?:-page)?[ \t]+(d-[1-9]\d*)[ \t]*$/gmu

// The types of page that the command `page` creates. A type has a template that the agent fills in.
const pageTypes = ['decision'] as const
const typeList = new Intl.ListFormat('en-GB', { type: 'conjunction' })

export class UnknownPageTypeError extends ScratchPadError {
  constructor(type: string) {
    super(`"${type}" isn't a type of page. The types are ${typeList.format(pageTypes)}.`)
  }
}

export class UnknownDecisionPageError extends ScratchPadError {
  constructor(id: string) {
    super(
      `There isn't any decision page with the id ${id}. Create one with page <parent> <file-name> --type=decision.`,
    )
  }
}

export class DecisionPageReadyError extends ScratchPadError {
  constructor(id: string) {
    super(`Decision ${id} is already ready.`)
  }
}

export class DecisionPageProblemsError extends ScratchPadError {
  constructor(id: string, problems: readonly string[]) {
    super(
      [
        `Decision ${id} isn't ready. Fix these problems and run ready ${id} again:`,
        ...problems,
      ].join('\n'),
    )
  }
}

export class PageContentError extends ScratchPadError {
  constructor(usage: string) {
    super(
      `The command doesn't take any content. Usage: scratch-pad ${usage}. Write the title, the context and the options in the file.`,
    )
  }
}

export class InvalidPageNameError extends ScratchPadError {
  constructor(name: string) {
    super(
      `"${name}" isn't a file name for a page. Use letters, digits, dots and dashes, like retry-wait.md.`,
    )
  }
}

export class UnnumberedParentError extends ScratchPadError {
  constructor(file: string) {
    super(
      `${file} doesn't have a number, so it can't have sub pages. Rename the file to <number>-<name> first.`,
    )
  }
}

export class PageNameTakenError extends ScratchPadError {
  constructor(name: string, file: string) {
    super(`${file} already has the name ${name}. Give the page another name.`)
  }
}

function fileNameOf(name: string): string {
  const file = name.endsWith('.md') ? name : `${name}.md`
  if (!namePattern.test(file) || file === '.md') {
    throw new InvalidPageNameError(name)
  }
  return file
}

// The next free id of a decision. An inline block, a decision page, an answer, a review and an
// entry of the log or of the events all use the ids of the same list. An id that an event used
// stays used when the page is deleted.
export function nextDecisionId(folder: ScratchPadFolder): string {
  const written = folder
    .pages()
    .flatMap((page) =>
      [...folder.readPageLines(page).join('\n').matchAll(decisionIdsInText)].map((match) =>
        String(match[1]),
      ),
    )
  const stored = folder.read((pad) => [
    ...pad.readDecisionAnswers().map((answer) => answer.id),
    ...pad.readDecisionReviews().map((review) => review.id),
    ...pad
      .readDecisionLog()
      .flatMap((entry) => (entry.decision === undefined ? [] : [entry.decision])),
    ...pad.readEvents().flatMap((event) => (event.item === undefined ? [] : [event.item])),
  ])
  return nextItemId('decision', [...written, ...stored])
}

interface ParentPage {
  readonly page: string
  readonly file: string
  // The number of the parent page, or undefined for the index page
  readonly number: string | undefined
}

function parentPageOf(folder: ScratchPadFolder, requested: string): ParentPage {
  const page = findPage(folder.pages(), requested, folder.name)
  const parent = folder.pageFiles().find((file) => file.page === page)
  if (page === indexPage) {
    return { page, file: page, number: undefined }
  }
  if (parent?.number === undefined) {
    throw new UnnumberedParentError(page)
  }
  return { page, file: parent.file, number: parent.number }
}

// The file of the new page is pages/<number>-<name>. The page can't have the name of another page,
// because the id of a page is its name without the number.
function newPageFileOf(folder: ScratchPadFolder, parent: ParentPage, name: string): string {
  const fileName = fileNameOf(name)
  const files = folder.pageFiles()
  const taken = files.find((file) => file.page === `pages/${fileName}`)
  if (taken !== undefined) {
    throw new PageNameTakenError(fileName, taken.file)
  }
  return `pages/${nextSubPageNumber(files, parent.number)}-${fileName}`
}

// The command doesn't take any content for the page. The agent writes the content in the file. A
// page without a type is blank. A page of the type decision is written from the template of a
// decision page.
export function createPage(
  folder: ScratchPadFolder,
  request: {
    readonly words: readonly string[]
    readonly type: string | undefined
    readonly usage: string
  },
  links: ItemLinks,
): string {
  const [requested, name, ...extra] = request.words
  if (request.type !== undefined && !pageTypes.some((type) => type === request.type)) {
    throw new UnknownPageTypeError(request.type)
  }
  if (requested === undefined || name === undefined || extra.length > 0) {
    throw new PageContentError(request.usage)
  }
  const parent = parentPageOf(folder, requested)
  const file = newPageFileOf(folder, parent, name)
  if (request.type === undefined) {
    folder.writeNewPage(file, '')
    return textWithLink(
      links,
      [
        `created ${join(folder.path, file)} (a sub page of ${parent.file})`,
        'Write the content of the page.',
      ].join('\n'),
      pageLink(links, pageFileOf(file).page),
    )
  }
  const id = nextDecisionId(folder)
  folder.writeNewPage(file, decisionPageTemplate(id))
  return textWithLink(
    links,
    [
      `created ${join(folder.path, file)} (decision ${id}, a draft sub page of ${parent.file})`,
      `Write the content of the page. Run ready ${id} to make the page ready for Nick.`,
    ].join('\n'),
    pageLink(links, pageFileOf(file).page, id),
  )
}

// The problems of the template, each with the file, the line and the heading that the line is under
function readyProblemLines(
  file: string,
  rendered: RenderedPage,
  problems: readonly { readonly line: number; readonly text: string }[],
): string[] {
  return problems.map((problem) => {
    const heading = rendered.headings.findLast((each) => each.line <= problem.line)
    const place = heading === undefined ? '' : ` under "${heading.text}"`
    return `  ${file}:${problem.line}${place}: ${problem.text}`
  })
}

// A decision page is a draft until the agent runs `ready`. The command runs the checks of the
// template. Only a page without any problem becomes ready, so Nick can decide it.
export function makeDecisionPageReady(
  folder: ScratchPadFolder,
  id: string,
  links: ItemLinks,
): string {
  if (!isDecisionId(id)) {
    throw new InvalidDecisionIdError(id)
  }
  const found = folder.pages().flatMap((page) => {
    const { file, lines } = folder.readPage(page)
    const rendered = renderPage({
      page,
      markdown: lines.join('\n'),
      readCustomFile: folder.readCustomFile.bind(folder),
    })
    const decisionPage = rendered.decisionPage
    return decisionPage?.id === id
      ? [{ page, file, rendered, problems: decisionPage.problems }]
      : []
  })
  const [decisionPage] = found
  if (decisionPage === undefined) {
    throw new UnknownDecisionPageError(id)
  }
  if (readyDecisionPages(folder).has(id)) {
    throw new DecisionPageReadyError(id)
  }
  const problems = readyProblemLines(
    decisionPage.file,
    decisionPage.rendered,
    decisionPage.problems,
  )
  if (problems.length > 0) {
    throw new DecisionPageProblemsError(id, problems)
  }
  folder.change((pad) =>
    pad.appendEvent({
      time: new Date().toISOString(),
      kind: 'decision-ready',
      by: 'agent',
      item: id,
    }),
  )
  return textWithLink(
    links,
    `${id} is ready. Nick can decide the decision page.`,
    pageLink(links, decisionPage.page, id),
  )
}

type DecisionState = 'open' | 'changes-requested' | 'decided'

function stateOf(folder: ScratchPadFolder, id: string): DecisionState {
  const { answered, rounds } = folder.read((pad) => ({
    answered: pad.readDecisionAnswers().some((answer) => answer.id === id),
    rounds: pad.readDecisionRounds(id),
  }))
  if (answered) {
    return 'decided'
  }
  return isSentBack(rounds) ? 'changes-requested' : 'open'
}

// Each text is true for the state of the decision. A ready page stays on Nick's Inbox and on the
// Decisions page when the template breaks later.
function brokenHeading(file: string, id: string, state: DecisionState): string {
  const broken = `${file} is a broken decision page.`
  if (state === 'decided') {
    return `${broken} Nick has decided ${id} and his decision is kept, but the page doesn't match the template. Fix these problems:`
  }
  if (state === 'changes-requested') {
    return `${broken} Nick asked for changes to ${id} and the page doesn't match the template. Fix these problems together with the changes:`
  }
  return `${broken} Nick can still decide ${id}, but the page doesn't match the template. Fix these problems:`
}

// The lines about a page that was ready and has a problem now. A draft page has the problems of an
// unfinished template, so the lines leave out a draft. The problems are the same problems that
// `check` prints.
function brokenPageLines(
  folder: ScratchPadFolder,
  page: string,
  ready: ReadonlySet<string>,
): string[] {
  const { file, lines } = folder.readPage(page)
  const { decisionPage, draft } = renderPage({
    page,
    markdown: lines.join('\n'),
    readCustomFile: folder.readCustomFile.bind(folder),
    readyDecisionPages: ready,
  })
  if (decisionPage?.id === undefined || draft || decisionPage.problems.length === 0) {
    return []
  }
  return [
    brokenHeading(file, decisionPage.id, stateOf(folder, decisionPage.id)),
    ...decisionPage.problems.map((problem) => `  ${file}:${problem.line} ${problem.text}`),
  ]
}

// The lines for `inbox` and `wait` about every page that was ready and has a problem now
export function brokenDecisionPageLines(folder: ScratchPadFolder): string[] {
  const ready = readyDecisionPages(folder)
  if (ready.size === 0) {
    return []
  }
  const broken = folder.pages().flatMap((page) => brokenPageLines(folder, page, ready))
  return broken.length === 0 ? [] : ['', ...broken]
}

// The lines about the page of a decision, for the command `reopen`
export function brokenPageLinesOf(folder: ScratchPadFolder, page: string): string[] {
  return brokenPageLines(folder, page, readyDecisionPages(folder))
}
