import { type DatabaseSync } from 'node:sqlite'
import { type LastPrintedEvents } from '../agent-inbox/agent-inbox'
import { type DecisionAnswer } from '../decisions/decision-answer'
import { type DecisionLogEntry } from '../decisions/decision-log'
import { type NewEvent, type ScratchPadEvent } from '../events/scratch-pad-event'
import { type ProgressTracker } from '../progress-tracker/progress-tracker'
import { type Thread } from '../threads/thread'
import { StoredAgentInbox } from './stored-agent-inbox'
import { StoredDecisionAnswers } from './stored-decision-answers'
import { StoredDecisionLog } from './stored-decision-log'
import { StoredEvents } from './stored-events'
import { StoredProgressTracker } from './stored-progress-tracker'
import { StoredThreads } from './stored-threads'

export class PadDb {
  private readonly progressTracker: StoredProgressTracker
  private readonly threads: StoredThreads
  private readonly decisionAnswers: StoredDecisionAnswers
  private readonly decisionLog: StoredDecisionLog
  private readonly events: StoredEvents
  private readonly agentInbox: StoredAgentInbox

  constructor(db: DatabaseSync, padName: string) {
    this.progressTracker = new StoredProgressTracker(db, padName)
    this.threads = new StoredThreads(db, padName)
    this.decisionAnswers = new StoredDecisionAnswers(db, padName)
    this.decisionLog = new StoredDecisionLog(db, padName)
    this.events = new StoredEvents(db, padName)
    this.agentInbox = new StoredAgentInbox(db, padName)
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

  readLastPrintedEvents(): LastPrintedEvents {
    return this.agentInbox.readLastPrintedEvents()
  }

  writeLastPrintedEvents(lastPrinted: LastPrintedEvents): void {
    this.agentInbox.writeLastPrintedEvents(lastPrinted)
  }
}
