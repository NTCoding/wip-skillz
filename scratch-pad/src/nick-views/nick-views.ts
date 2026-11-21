import { type Answer } from '../decisions/decision-answer'
import { type DecisionLogEntry } from '../decisions/decision-log'
import { nickInbox } from '../nick-inbox/nick-inbox'
import { isUnderNumber, parentNumberOf, type PageFile } from '../pages/page-files'
import { findPage, pageTitle } from '../pages/page-markdown'
import { type PageSummary, type WaitingForNick } from '../pages/page-text'
import { type ProgressTracker } from '../progress-tracker/progress-tracker'
import { type DecisionBlock } from '../rendered-page/decision-block'
import { pageDescription } from '../rendered-page/page-description'
import { type Heading } from '../rendered-page/page-headings'
import { type PageLink } from '../rendered-page/page-links'
import { renderPage, type RenderedPage } from '../rendered-page/rendered-page'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { type Thread } from '../threads/thread'
import { positionedThread, type PositionedThread } from '../threads/thread-position'

interface DecisionOnPage extends DecisionBlock {
  readonly answer: Answer | undefined
}

interface ViewedPage {
  readonly page: string
  readonly title: string | undefined
  readonly html: string
  readonly headings: readonly Heading[]
  readonly links: readonly PageLink[]
  readonly decisions: readonly DecisionOnPage[]
}

interface UnansweredDecision {
  readonly page: string
  readonly id: string
  readonly line: number
  readonly question: string
}

interface NickInboxItems {
  readonly threads: readonly PositionedThread[]
  readonly decisions: readonly UnansweredDecision[]
}

export function pageSummaries(folder: ScratchPadFolder): PageSummary[] {
  const openThreads = folder
    .read((pad) => pad.readThreads())
    .filter((thread) => thread.waitsFor !== 'nobody')
  const inbox = nickInboxItems(folder)
  const files = pageFilesOnce(folder.pageFiles())
  const waitingOn = (pages: readonly string[]): WaitingForNick => ({
    decisions: inbox.decisions.filter((decision) => pages.includes(decision.page)).length,
    replies: inbox.threads.filter((thread) => pages.includes(thread.page)).length,
  })
  return files.map((file) => {
    const lines = folder.readPageLines(file.page)
    const pagesUnder = files.filter((other) => isUnderNumber(other.number, file.number))
    return {
      page: file.page,
      file: file.file,
      number: file.number,
      parent: parentOf(file, files),
      title: pageTitle(lines),
      description: pageDescription(lines.join('\n')),
      openThreads: openThreads.filter((thread) => thread.page === file.page).length,
      waitingForNick: waitingOn([file.page]),
      waitingForNickWithSubPages: waitingOn([file, ...pagesUnder].map((each) => each.page)),
    }
  })
}

function pageFilesOnce(files: readonly PageFile[]): PageFile[] {
  return files.filter(
    (file, index) => files.findIndex((other) => other.page === file.page) === index,
  )
}

function parentOf(file: PageFile, files: readonly PageFile[]): string | undefined {
  const parentNumber = parentNumberOf(file.number)
  return parentNumber === undefined
    ? undefined
    : files.find((other) => other.number === parentNumber)?.page
}

export function viewPage(folder: ScratchPadFolder, requested: string): ViewedPage {
  const page = findPage(folder.pages(), requested, folder.name)
  const rendered = renderedPage(folder, page)
  const answers = folder.read((pad) => pad.readDecisionAnswers())
  return {
    page,
    title: pageTitle(folder.readPageLines(page)),
    html: rendered.html,
    headings: rendered.headings,
    links: rendered.links,
    decisions: rendered.decisions.map((decision) => ({
      ...decision,
      answer: answers.find((answer) => answer.id === decision.id)?.answer,
    })),
  }
}

export function threadsOfPage(folder: ScratchPadFolder, requested: string): PositionedThread[] {
  const page = findPage(folder.pages(), requested, folder.name)
  return withPositions(
    folder,
    folder.read((pad) => pad.readThreads()).filter((thread) => thread.page === page),
  )
}

export function withPositions(
  folder: ScratchPadFolder,
  threads: readonly Thread[],
): PositionedThread[] {
  const markdowns = new Map(
    threads.map((thread) => [thread.page, folder.readPageLines(thread.page).join('\n')]),
  )
  return threads.map((thread) => positionedThread(thread, String(markdowns.get(thread.page))))
}

export function nickInboxItems(folder: ScratchPadFolder): NickInboxItems {
  return {
    threads: withPositions(folder, nickInbox(folder.read((pad) => pad.readThreads()))),
    decisions: folder
      .pages()
      .flatMap((page) =>
        viewPage(folder, page).decisions.flatMap((decision) =>
          decision.answer === undefined && decision.question !== undefined
            ? [{ page, id: decision.id, line: decision.firstLine, question: decision.question }]
            : [],
        ),
      ),
  }
}

export function progressTrackerOf(folder: ScratchPadFolder): ProgressTracker {
  return folder.read((pad) => pad.readProgressTracker())
}

export function decisionLogOf(folder: ScratchPadFolder): DecisionLogEntry[] {
  return folder.read((pad) => pad.readDecisionLog())
}

function renderedPage(folder: ScratchPadFolder, page: string): RenderedPage {
  return renderPage({
    page,
    markdown: folder.readPageLines(page).join('\n'),
    readCustomFile: (file) => folder.readCustomFile(file),
  })
}
