import { type Answer } from '../decisions/decision-answer'
import { type DecisionLogEntry } from '../decisions/decision-log'
import { nickInbox } from '../nick-inbox/nick-inbox'
import { findPage, pagesInOrder, pageTitle } from '../pages/page-markdown'
import { type ProgressTracker } from '../progress-tracker/progress-tracker'
import { type DecisionBlock } from '../rendered-page/decision-block'
import { type Heading } from '../rendered-page/page-headings'
import { type PageLink } from '../rendered-page/page-links'
import { renderPage, type RenderedPage } from '../rendered-page/rendered-page'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { type Thread } from '../threads/thread'

export interface DecisionOnPage extends DecisionBlock {
  readonly answer: Answer | undefined
}

export interface ViewedPage {
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
  readonly question: string | undefined
}

interface NickInboxItems {
  readonly threads: readonly Thread[]
  readonly decisions: readonly UnansweredDecision[]
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
      answer: answers.find(
        (answer) => answer.page === page && answer.question === decision.question,
      )?.answer,
    })),
  }
}

export function threadsOfPage(folder: ScratchPadFolder, requested: string): Thread[] {
  const page = findPage(folder.pages(), requested, folder.name)
  return folder.read((pad) => pad.readThreads()).filter((thread) => thread.page === page)
}

export function nickInboxItems(folder: ScratchPadFolder): NickInboxItems {
  return {
    threads: nickInbox(folder.read((pad) => pad.readThreads())),
    decisions: pagesInOrder(folder.pages()).flatMap((page) =>
      viewPage(folder, page)
        .decisions.filter((decision) => decision.answer === undefined)
        .map((decision) => ({
          page,
          id: decision.id,
          line: decision.firstLine,
          question: decision.question,
        })),
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
