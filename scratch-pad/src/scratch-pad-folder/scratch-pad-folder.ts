import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { nothingPrinted, type LastPrintedEvents } from '../agent-inbox/agent-inbox'
import { type DecisionAnswer } from '../decisions/decision-answer'
import { type DecisionLogEntry } from '../decisions/decision-log'
import { type ScratchPadEvent } from '../events/scratch-pad-event'
import { itemTypeOf, type ItemType } from '../items/item-id'
import { isPagePath } from '../pages/page-markdown'
import { type ProgressTracker } from '../progress-tracker/progress-tracker'
import { ScratchPadError } from '../scratch-pad-error'
import { type Thread } from '../threads/thread'
import {
  decisionAnswerFromFile,
  decisionLogEntryFromLine,
  eventFromLine,
  lastPrintedEventsFromFile,
  progressTrackerFromFile,
  threadFromFile,
} from './file-contents'

const progressTrackerFile = 'progress-tracker.json'
const threadsFolder = 'threads'
const decisionAnswersFolder = 'decision-answers'
const pagesFolder = 'pages'
const eventsFile = 'events.jsonl'
const decisionLogFile = 'decision-log.jsonl'
const agentInboxFile = 'agent-inbox.json'

export class UnknownThreadError extends ScratchPadError {
  constructor(id: string, type: ItemType, padName: string) {
    super(
      `There isn't any thread called ${id} in ${padName}. Run "scratch-pad inbox --all --type ${type}" to list the threads that wait for the agent.`,
    )
  }
}

export class UnknownDecisionError extends ScratchPadError {
  constructor(id: string, padName: string) {
    super(`There isn't any answered decision called ${id} in ${padName}.`)
  }
}

export class ScratchPadFolder {
  constructor(readonly path: string) {}

  static isScratchPad(path: string): boolean {
    return existsSync(join(path, progressTrackerFile))
  }

  static create(path: string, tracker: ProgressTracker, indexPage: string): ScratchPadFolder {
    const folder = new ScratchPadFolder(path)
    mkdirSync(join(path, pagesFolder), { recursive: true })
    mkdirSync(join(path, threadsFolder))
    mkdirSync(join(path, decisionAnswersFolder))
    writeFileSync(join(path, pagesFolder, 'index.md'), indexPage)
    folder.writeLastPrintedEvents(nothingPrinted)
    folder.writeProgressTracker(tracker)
    return folder
  }

  get name(): string {
    return basename(this.path)
  }

  readProgressTracker(): ProgressTracker {
    return progressTrackerFromFile(this.readText(progressTrackerFile), progressTrackerFile)
  }

  writeProgressTracker(tracker: ProgressTracker): void {
    this.writeJson(progressTrackerFile, tracker)
  }

  readThreads(): Thread[] {
    return this.jsonFilesIn(threadsFolder).map((file) => threadFromFile(this.readText(file), file))
  }

  readThread(id: string): Thread {
    const type = itemTypeOf(id)
    const file = `${threadsFolder}/${id}.json`
    if (!existsSync(join(this.path, file))) {
      throw new UnknownThreadError(id, type, this.name)
    }
    return threadFromFile(this.readText(file), file)
  }

  writeThread(thread: Thread): void {
    this.writeJson(`${threadsFolder}/${thread.id}.json`, thread)
  }

  readDecisionAnswers(): DecisionAnswer[] {
    return this.jsonFilesIn(decisionAnswersFolder).map((file) =>
      decisionAnswerFromFile(this.readText(file), file),
    )
  }

  readDecisionAnswer(id: string): DecisionAnswer {
    itemTypeOf(id)
    const file = `${decisionAnswersFolder}/${id}.json`
    if (!existsSync(join(this.path, file))) {
      throw new UnknownDecisionError(id, this.name)
    }
    return decisionAnswerFromFile(this.readText(file), file)
  }

  writeDecisionAnswer(decision: DecisionAnswer): void {
    this.writeJson(`${decisionAnswersFolder}/${decision.id}.json`, decision)
  }

  readEvents(): ScratchPadEvent[] {
    return this.jsonLines(eventsFile).map(({ text, file }) => eventFromLine(text, file))
  }

  appendEvent(event: ScratchPadEvent): void {
    const path = join(this.path, eventsFile)
    const missingNewline = existsSync(path) && /[^\n]$/.test(readFileSync(path, 'utf8'))
    appendFileSync(path, `${missingNewline ? '\n' : ''}${JSON.stringify(event)}\n`)
  }

  readDecisionLog(): DecisionLogEntry[] {
    return this.jsonLines(decisionLogFile).map(({ text, file }) =>
      decisionLogEntryFromLine(text, file),
    )
  }

  writeDecisionLog(entries: readonly DecisionLogEntry[]): void {
    this.writeText(decisionLogFile, entries.map((entry) => `${JSON.stringify(entry)}\n`).join(''))
  }

  readLastPrintedEvents(): LastPrintedEvents {
    return existsSync(join(this.path, agentInboxFile))
      ? lastPrintedEventsFromFile(this.readText(agentInboxFile), agentInboxFile)
      : nothingPrinted
  }

  writeLastPrintedEvents(lastPrinted: LastPrintedEvents): void {
    this.writeJson(agentInboxFile, { lastPrintedEvent: lastPrinted })
  }

  pages(): string[] {
    return this.filesIn(pagesFolder, '.md')
  }

  readPageLines(page: string): readonly string[] {
    const path = join(this.path, page)
    return isPagePath(page) && existsSync(path) ? readFileSync(path, 'utf8').split('\n') : []
  }

  private readText(file: string): string {
    return readFileSync(join(this.path, file), 'utf8')
  }

  private writeJson(file: string, value: unknown): void {
    this.writeText(file, `${JSON.stringify(value, null, 2)}\n`)
  }

  private writeText(file: string, text: string): void {
    const target = join(this.path, file)
    const temporary = `${target}.${process.pid}.tmp`
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(temporary, text)
    renameSync(temporary, target)
  }

  private filesIn(folder: string, extension: string): string[] {
    const path = join(this.path, folder)
    return existsSync(path)
      ? readdirSync(path)
          .filter((name) => name.endsWith(extension))
          .map((name) => `${folder}/${name}`)
      : []
  }

  private jsonFilesIn(folder: string): string[] {
    return this.filesIn(folder, '.json').toSorted(byItemNumber)
  }

  private jsonLines(file: string): Array<{ text: string; file: string }> {
    const path = join(this.path, file)
    if (!existsSync(path)) {
      return []
    }
    return readFileSync(path, 'utf8')
      .split('\n')
      .map((text, index) => ({ text, file: `${file} line ${index + 1}` }))
      .filter((line) => line.text.trim() !== '')
  }
}

function byItemNumber(first: string, second: string): number {
  return first.localeCompare(second, 'en', { numeric: true })
}
