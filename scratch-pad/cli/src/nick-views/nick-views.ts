import { type Answer } from '../decisions/decision-answer'
import { type DecisionLogEntry } from '../decisions/decision-log'
import { nickInbox } from '../nick-inbox/nick-inbox'
import { type QueuedComment, type QueuedReply } from '../outbox/outbox'
import { isUnderNumber, pageFileOf, parentNumberOf, type PageFile } from '../pages/page-files'
import { existingPage, findPage, pageTitle } from '../pages/page-markdown'
import { searchResultsOf, type SearchResult } from '../pages/page-search'
import { type PageSummary, type WaitingForNick } from '../pages/page-text'
import { type ProgressTracker, type Subtask, type Task } from '../progress-tracker/progress-tracker'
import {
  pageReadState,
  sectionTexts,
  type SectionHash,
  type SectionText,
} from '../read-marks/read-marks'
import { type DecisionBlock } from '../rendered-page/decision-block'
import { contextSummary, type ContextSummary } from '../rendered-page/decision-context'
import { shownHeadings } from '../rendered-page/index-page'
import { pageDescription } from '../rendered-page/page-description'
import { type Heading } from '../rendered-page/page-headings'
import { type PageLink } from '../rendered-page/page-links'
import {
  pageHeadings,
  renderDetails,
  renderPage,
  type RenderedPage,
} from '../rendered-page/rendered-page'
import { type PadDb } from '../scratch-pad-folder/pad-db'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { type Thread } from '../threads/thread'
import {
  currentPosition,
  positionedThread,
  type PositionedThread,
  type ThreadPosition,
} from '../threads/thread-position'

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
  // The time of the decision's decision-asked event
  readonly time: string
  readonly context: ContextSummary | undefined
}

type OpenDecision = Omit<UnansweredDecision, 'time' | 'context'> & {
  readonly context: string | undefined
}

interface ImprovementOnTab {
  readonly number: number
  readonly time: string
  readonly title: string
  readonly details: string | undefined
  readonly html: string | undefined
  readonly links: readonly PageLink[]
}

// The browser only shows the HTML of a task's description, so the Markdown is left out.
interface DescriptionHtml {
  readonly html: string | undefined
  readonly links: readonly PageLink[]
}

type SubtaskOnTracker = Omit<Subtask, 'description'> & DescriptionHtml

interface TaskOnTracker extends Omit<Task, 'description' | 'subtasks'>, DescriptionHtml {
  readonly subtasks: readonly SubtaskOnTracker[]
}

interface TrackerOnTab extends Omit<ProgressTracker, 'tasks'> {
  readonly tasks: readonly TaskOnTracker[]
}

interface NoteOnTab {
  readonly id: string
  readonly type: 'grammar' | 'improvement'
  readonly page: string
  readonly text: string
  readonly time: string
  readonly outcome: string | undefined
}

interface ImprovementsTab {
  readonly improvements: readonly ImprovementOnTab[]
  readonly notes: readonly NoteOnTab[]
}

interface NickInboxItems {
  readonly threads: readonly PositionedThread[]
  readonly decisions: readonly UnansweredDecision[]
}

type QueuedItemOnPage = (QueuedComment & { readonly position: ThreadPosition }) | QueuedReply

interface Outbox {
  readonly items: readonly QueuedItemOnPage[]
}

interface PageReadMark {
  readonly page: string
  readonly state: 'new' | 'read'
  // The time that the page's file was last written
  readonly changedTime: string
  // The hash of each section's text, which the browser posts back when Nick marks the page as read
  readonly sections: readonly SectionHash[]
  readonly changedSections: readonly SectionText[]
}

interface ThreadOfPad extends PositionedThread {
  readonly resolvedTime: string | undefined
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
      headings: shownHeadings(file.page, pageHeadings(lines.join('\n'))),
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

// The agent can delete a page that still has threads. The threads of a deleted page are returned
// too, because Nick can still reply to them in the browser and edit the replies in his outbox.
export function threadsOfPage(folder: ScratchPadFolder, requested: string): PositionedThread[] {
  const page = existingPage(folder.pages(), requested) ?? pageFileOf(`pages/${requested}`).page
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
  const decisions = folder.pages().flatMap((page) =>
    viewPage(folder, page).decisions.flatMap((decision): OpenDecision[] =>
      decision.answer === undefined && decision.question !== undefined
        ? [
            {
              page,
              id: decision.id,
              line: decision.firstLine,
              question: decision.question,
              context: decision.context,
            },
          ]
        : [],
    ),
  )
  return {
    threads: withPositions(folder, nickInbox(folder.read((pad) => pad.readThreads()))),
    decisions: askedDecisions(folder, decisions).map((decision) => ({
      ...decision,
      context:
        decision.context === undefined
          ? undefined
          : contextSummary(decision.context, decision.page),
    })),
  }
}

function askedDecisionIds(pad: PadDb): Set<string | undefined> {
  return new Set([
    ...pad
      .readEvents()
      .filter((event) => event.kind === 'decision-asked')
      .map((event) => event.item),
    ...pad.readDecisionAnswers().map((answer) => answer.id),
  ])
}

// The time of a decision is the time of its decision-asked event. The server records that event the
// first time that it finds the decision on a saved page. The time of the event is the time that
// the page's file was last written, because the server might not read the page before the browser
// asks for the Inbox. That can be long after the agent wrote the page. A decision on an older
// scratch pad is recorded in the same way the first time that this version of the server finds the
// decision.
function askedDecisions(
  folder: ScratchPadFolder,
  decisions: readonly OpenDecision[],
): (OpenDecision & { readonly time: string })[] {
  const asked = new Map(
    folder
      .read((pad) => pad.readEvents())
      .filter((event) => event.kind === 'decision-asked')
      .map((event) => [event.item, event.time]),
  )
  const timed = decisions.map((decision) => ({
    ...decision,
    time: asked.get(decision.id) ?? folder.pageChangedTime(decision.page),
  }))
  const missing = timed.filter((decision) => !asked.has(decision.id))
  if (missing.length > 0) {
    // Another process can record the decision or Nick can answer it in the meantime. That's why
    // the ids are read again in the same transaction as the new events.
    folder.change((pad) => {
      const known = askedDecisionIds(pad)
      missing
        .filter((decision) => !known.has(decision.id))
        .forEach((decision) =>
          pad.appendEvent({
            time: decision.time,
            kind: 'decision-asked',
            by: 'agent',
            item: decision.id,
          }),
        )
    })
  }
  return timed
}

export function outboxOf(folder: ScratchPadFolder): Outbox {
  return {
    items: folder
      .read((pad) => pad.readOutbox())
      .map((item) =>
        item.kind === 'reply'
          ? item
          : {
              ...item,
              position: currentPosition(item.anchor, folder.readPageLines(item.page).join('\n')),
            },
      ),
  }
}

// Every page is listed, including a sub page that the sidebar doesn't show. The hash of each
// section is the hash of the text that the browser shows, which the browser posts back when Nick
// marks the page or the section as read.
export function readMarksOf(folder: ScratchPadFolder): { readonly pages: PageReadMark[] } {
  const marks = folder.read((pad) => pad.readReadMarks())
  return {
    pages: folder.pages().map((page) => {
      const sections = sectionTexts(folder.readPageLines(page).join('\n'), page)
      const state = pageReadState(page, sections, marks)
      return {
        page,
        state: state.kind,
        changedTime: folder.pageChangedTime(page),
        sections: sections.map((section) => ({ id: section.id, hash: section.hash })),
        changedSections: state.kind === 'new' ? [] : state.changedSections,
      }
    }),
  }
}

// Every thread of the scratch pad, with the time that Nick last resolved it
export function threadsOfPad(folder: ScratchPadFolder): ThreadOfPad[] {
  const { threads, events } = folder.read((pad) => ({
    threads: pad.readThreads(),
    events: pad.readEvents(),
  }))
  return withPositions(folder, threads).map((thread) => ({
    ...thread,
    resolvedTime: events.findLast(
      (event) => event.kind === 'thread-resolved' && event.item === thread.id,
    )?.time,
  }))
}

export function progressTrackerOf(folder: ScratchPadFolder): TrackerOnTab {
  const tracker = folder.read((pad) => pad.readProgressTracker())
  return {
    ...tracker,
    tasks: tracker.tasks.map(({ description, subtasks, ...task }) => ({
      ...task,
      ...descriptionHtml(folder, description),
      subtasks: subtasks.map(({ description: subtaskDescription, ...subtask }) => ({
        ...subtask,
        ...descriptionHtml(folder, subtaskDescription),
      })),
    })),
  }
}

function descriptionHtml(
  folder: ScratchPadFolder,
  description: string | undefined,
): DescriptionHtml {
  const rendered = renderedDetails(folder, description)
  return { html: rendered?.html, links: rendered?.links ?? [] }
}

export function decisionLogOf(folder: ScratchPadFolder): DecisionLogEntry[] {
  return folder.read((pad) => pad.readDecisionLog())
}

export function improvementsOf(folder: ScratchPadFolder): ImprovementsTab {
  const { improvements, threads } = folder.read((pad) => ({
    improvements: pad.readImprovements(),
    threads: pad.readThreads(),
  }))
  return {
    improvements: improvements.map((improvement) => {
      const details = renderedDetails(folder, improvement.details)
      return {
        number: improvement.number,
        time: improvement.time,
        title: improvement.title,
        details: improvement.details,
        html: details?.html,
        links: details?.links ?? [],
      }
    }),
    notes: threads.flatMap((thread) =>
      thread.type === 'comment'
        ? []
        : [
            {
              id: thread.id,
              type: thread.type,
              page: thread.page,
              text: thread.messages[0].text,
              time: thread.messages[0].time,
              outcome: thread.outcome,
            },
          ],
    ),
  }
}

// The results are in the order of the pages in the sidebar, and in the order of the lines in each
// page.
export function searchPages(folder: ScratchPadFolder, query: string): SearchResult[] {
  return searchResultsOf(
    folder.pages().map((page) => {
      const lines = folder.readPageLines(page)
      return {
        page,
        title: pageTitle(lines),
        markdown: lines.join('\n'),
        headings: renderedPage(folder, page).headings,
      }
    }),
    query,
  )
}

// Renders Markdown that isn't on a page, like the details of an improvement or the description of a
// task. Its links are resolved as if it were on the index page so that `retry-limit.md` is a link
// to that page.
function renderedDetails(
  folder: ScratchPadFolder,
  markdown: string | undefined,
): RenderedPage | undefined {
  return markdown === undefined
    ? undefined
    : renderDetails({
        page: 'pages/index.md',
        markdown,
        readCustomFile: (file) => folder.readCustomFile(file),
      })
}

function renderedPage(folder: ScratchPadFolder, page: string): RenderedPage {
  return renderPage({
    page,
    markdown: folder.readPageLines(page).join('\n'),
    readCustomFile: (file) => folder.readCustomFile(file),
  })
}
