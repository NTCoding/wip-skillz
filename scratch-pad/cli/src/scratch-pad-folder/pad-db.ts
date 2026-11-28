import { type DatabaseSync } from 'node:sqlite'
import { type LastPrintedEvents } from '../agent-inbox/agent-inbox'
import { type DecisionAnswer } from '../decisions/decision-answer'
import { type DecisionLogEntry } from '../decisions/decision-log'
import { type DecisionReview } from '../decisions/decision-review'
import { type NewEvent, type ScratchPadEvent } from '../events/scratch-pad-event'
import { type Improvement, type NewImprovement } from '../improvements/improvements'
import {
  type NewQueuedItem,
  type QueuedComment,
  type QueuedItem,
  type QueuedReply,
} from '../outbox/outbox'
import { type ProgressTracker } from '../progress-tracker/progress-tracker'
import { type ReadMarks, type SectionHash } from '../read-marks/read-marks'
import { type Thread } from '../threads/thread'
import { StoredAgentInbox } from './stored-agent-inbox'
import { StoredDecisionAnswers } from './stored-decision-answers'
import { StoredDecisionLog } from './stored-decision-log'
import { StoredDecisionReviews } from './stored-decision-reviews'
import { StoredEvents } from './stored-events'
import { StoredImprovements } from './stored-improvements'
import { StoredOutbox } from './stored-outbox'
import { StoredProgressTracker } from './stored-progress-tracker'
import { StoredReadMarks } from './stored-read-marks'
import { StoredThreads } from './stored-threads'

export class PadDb {
  private readonly progressTracker: StoredProgressTracker
  private readonly threads: StoredThreads
  private readonly decisionAnswers: StoredDecisionAnswers
  private readonly decisionLog: StoredDecisionLog
  private readonly decisionReviews: StoredDecisionReviews
  private readonly improvements: StoredImprovements
  private readonly outbox: StoredOutbox
  private readonly events: StoredEvents
  private readonly agentInbox: StoredAgentInbox
  private readonly readMarks: StoredReadMarks

  constructor(db: DatabaseSync, padName: string) {
    this.progressTracker = new StoredProgressTracker(db, padName)
    this.threads = new StoredThreads(db, padName)
    this.decisionAnswers = new StoredDecisionAnswers(db, padName)
    this.decisionLog = new StoredDecisionLog(db, padName)
    this.decisionReviews = new StoredDecisionReviews(db, padName)
    this.improvements = new StoredImprovements(db, padName)
    this.outbox = new StoredOutbox(db, padName)
    this.events = new StoredEvents(db, padName)
    this.agentInbox = new StoredAgentInbox(db, padName)
    this.readMarks = new StoredReadMarks(db, padName)
  }

  readProgressTracker(): ProgressTracker {
    return this.progressTracker.read()
  }

  writeProgressTracker(tracker: ProgressTracker): void {
    this.progressTracker.write(tracker)
  }

  readThreads(): Thread[] {
    return this.threads.readAll()
  }

  readThread(id: string): Thread {
    return this.threads.read(id)
  }

  writeThread(thread: Thread): void {
    this.threads.write(thread)
  }

  readDecisionAnswers(): DecisionAnswer[] {
    return this.decisionAnswers.readAll()
  }

  readDecisionAnswer(id: string): DecisionAnswer {
    return this.decisionAnswers.read(id)
  }

  writeDecisionAnswer(decision: DecisionAnswer): void {
    this.decisionAnswers.write(decision)
  }

  readDecisionReviews(): DecisionReview[] {
    return this.decisionReviews.readAll()
  }

  readDecisionRounds(id: string): DecisionReview[] {
    return this.decisionReviews.readRounds(id)
  }

  writeDecisionReview(review: DecisionReview): void {
    this.decisionReviews.write(review)
  }

  readEvents(): ScratchPadEvent[] {
    return this.events.read()
  }

  appendEvent(event: NewEvent): ScratchPadEvent {
    return this.events.append(event)
  }

  readDecisionLog(): DecisionLogEntry[] {
    return this.decisionLog.read()
  }

  saveDecisionLogEntry(entry: DecisionLogEntry): void {
    this.decisionLog.save(entry)
  }

  readImprovements(): Improvement[] {
    return this.improvements.read()
  }

  saveImprovement(improvement: NewImprovement): Improvement {
    return this.improvements.save(improvement)
  }

  updateImprovement(improvement: Improvement): void {
    this.improvements.update(improvement)
  }

  deleteImprovement(number: number): void {
    this.improvements.delete(number)
  }

  readOutbox(): QueuedItem[] {
    return this.outbox.read()
  }

  saveQueuedItem(item: NewQueuedItem): QueuedItem {
    return this.outbox.save(item)
  }

  updateQueuedItem(item: QueuedComment | QueuedReply): void {
    this.outbox.updateText(item)
  }

  deleteQueuedItem(number: number): void {
    this.outbox.delete(number)
  }

  readLastPrintedEvents(): LastPrintedEvents {
    return this.agentInbox.readLastPrintedEvents()
  }

  writeLastPrintedEvents(lastPrinted: LastPrintedEvents): void {
    this.agentInbox.writeLastPrintedEvents(lastPrinted)
  }

  readReadMarks(): ReadMarks {
    return this.readMarks.read()
  }

  markPageRead(page: string, sections: readonly SectionHash[]): void {
    this.readMarks.markPageRead(page, sections)
  }

  markPageUnread(page: string): void {
    this.readMarks.markPageUnread(page)
  }

  markSectionRead(page: string, section: SectionHash): void {
    this.readMarks.markSectionRead(page, section)
  }
}
