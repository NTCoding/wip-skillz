import { type LastPrintedEvents } from '../agent-inbox/agent-inbox'
import { type Answer, type DecisionAnswer } from '../decisions/decision-answer'
import { decisionSources, type DecisionLogEntry } from '../decisions/decision-log'
import { eventKinds, type ScratchPadEvent } from '../events/scratch-pad-event'
import { taskStates, type ProgressTracker } from '../progress-tracker/progress-tracker'
import {
  authors,
  threadTypes,
  waitingParties,
  type Anchor,
  type Message,
  type Thread,
} from '../threads/thread'
import { JsonFields } from './json-fields'

export function threadFromFile(text: string, file: string): Thread {
  const fields = JsonFields.parse(text, file)
  return {
    id: fields.text('id'),
    type: fields.oneOf('type', threadTypes),
    page: fields.text('page'),
    anchor: fields.optionalObject('anchor', anchorFrom),
    waitsFor: fields.oneOf('waitsFor', waitingParties),
    outcome: fields.optionalText('outcome'),
    messages: fields.nonEmptyObjects('messages', messageFrom),
  }
}

export function decisionAnswerFromFile(text: string, file: string): DecisionAnswer {
  const fields = JsonFields.parse(text, file)
  return {
    id: fields.text('id'),
    page: fields.text('page'),
    line: fields.wholeNumber('line'),
    question: fields.text('question'),
    answer: answerFrom(fields.object('answer')),
    seenByAgent: fields.flag('seenByAgent'),
    time: fields.text('time'),
  }
}

export function progressTrackerFromFile(text: string, file: string): ProgressTracker {
  const fields = JsonFields.parse(text, file)
  return {
    title: fields.text('title'),
    goal: fields.optionalText('goal'),
    tasks: fields.objects('tasks', (task) => ({
      number: task.wholeNumber('number'),
      title: task.text('title'),
      state: task.oneOf('state', taskStates),
    })),
  }
}

export function eventFromLine(text: string, file: string): ScratchPadEvent {
  const fields = JsonFields.parse(text, file)
  return {
    number: fields.wholeNumber('number'),
    time: fields.text('time'),
    kind: fields.oneOf('kind', eventKinds),
    by: fields.oneOf('by', authors),
    item: fields.optionalText('item'),
  }
}

export function decisionLogEntryFromLine(text: string, file: string): DecisionLogEntry {
  const fields = JsonFields.parse(text, file)
  return {
    number: fields.wholeNumber('number'),
    time: fields.text('time'),
    source: fields.oneOf('source', decisionSources),
    text: fields.text('text'),
    decision: fields.optionalText('decision'),
  }
}

export function lastPrintedEventsFromFile(text: string, file: string): LastPrintedEvents {
  const lastPrinted = JsonFields.parse(text, file).object('lastPrintedEvent')
  return {
    comment: lastPrinted.wholeNumber('comment'),
    decision: lastPrinted.wholeNumber('decision'),
    grammar: lastPrinted.wholeNumber('grammar'),
    improvement: lastPrinted.wholeNumber('improvement'),
  }
}

function anchorFrom(fields: JsonFields): Anchor {
  return {
    firstLine: fields.wholeNumber('firstLine'),
    lastLine: fields.wholeNumber('lastLine'),
    selectedText: fields.text('selectedText'),
  }
}

function messageFrom(fields: JsonFields): Message {
  return {
    author: fields.oneOf('author', authors),
    text: fields.text('text'),
    time: fields.text('time'),
  }
}

function answerFrom(fields: JsonFields): Answer {
  return fields.has('choice')
    ? { choice: fields.text('choice') }
    : { written: fields.text('written') }
}
