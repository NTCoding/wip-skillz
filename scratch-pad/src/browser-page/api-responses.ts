import { z } from 'zod'

const optionalText = z
  .string()
  .nullable()
  .transform((text) => text ?? undefined)

const waitingForNick = z.object({ decisions: z.number(), replies: z.number() })

const pageSummary = z.object({
  page: z.string(),
  file: z.string(),
  number: optionalText,
  parent: optionalText,
  title: optionalText,
  description: optionalText,
  openThreads: z.number(),
  waitingForNick,
  waitingForNickWithSubPages: waitingForNick,
})

export const pagesResponse = z.object({ pages: z.array(pageSummary) })

const heading = z.object({ level: z.number(), text: z.string(), id: z.string() })

const pageLink = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('page'),
    href: z.string(),
    page: z.string(),
    headingId: optionalText,
  }),
  z.object({ kind: z.literal('other'), href: z.string() }),
])

const answer = z.union([z.object({ choice: z.string() }), z.object({ written: z.string() })])

const decisionOnPage = z.object({
  id: z.string(),
  question: optionalText,
  answer: answer.nullable().transform((value) => value ?? undefined),
})

export const viewedPageResponse = z.object({
  page: z.string(),
  title: optionalText,
  html: z.string(),
  headings: z.array(heading),
  links: z.array(pageLink),
  decisions: z.array(decisionOnPage),
})

const task = z.object({
  number: z.number(),
  title: z.string(),
  state: z.enum(['to-do', 'in-progress', 'done']),
})

export const progressTrackerResponse = z.object({
  title: z.string(),
  goal: optionalText,
  tasks: z.array(task),
})

const decisionLogEntry = z.object({
  number: z.number(),
  time: z.string(),
  source: z.enum(['chat', 'page']),
  text: z.string(),
  decision: optionalText,
})

export const decisionLogResponse = z.object({ decisions: z.array(decisionLogEntry) })

const threadType = z.enum(['comment', 'grammar', 'improvement'])

const anchor = z.object({
  firstLine: z.number(),
  lastLine: z.number(),
  selectedText: z.string(),
  prefix: optionalText,
  suffix: optionalText,
})

const position = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('attached'),
    firstLine: z.number(),
    lastLine: z.number(),
    text: z.string(),
    occurrence: z.number(),
    match: z.enum(['exact', 'fuzzy']),
    score: z.number(),
  }),
  z.object({ kind: z.literal('detached') }),
])

const message = z.object({ author: z.enum(['nick', 'agent']), text: z.string(), time: z.string() })

const thread = z.object({
  id: z.string(),
  type: threadType,
  page: z.string(),
  anchor: anchor.nullable().transform((value) => value ?? undefined),
  waitsFor: z.enum(['nick', 'agent', 'nobody']),
  outcome: optionalText,
  messages: z.array(message),
  position: position.nullable().transform((value) => value ?? undefined),
})

export const threadsResponse = z.object({ threads: z.array(thread) })

export const threadResponse = z.object({ thread })

const openDecision = z.object({
  page: z.string(),
  id: z.string(),
  line: z.number(),
  question: z.string(),
})

export const nickInboxResponse = z.object({
  threads: z.array(thread),
  decisions: z.array(openDecision),
})

export const decisionAnswerResponse = z.object({ decision: z.object({ id: z.string() }) })

export const errorResponse = z.object({ error: z.string() })

export const exportedPadData = z.object({
  pages: z.array(pageSummary),
  viewedPages: z.array(viewedPageResponse),
  threads: z.array(thread),
  progressTracker: progressTrackerResponse,
  decisionLog: z.array(decisionLogEntry),
})

export const padChange = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('page'), page: z.string() }),
  z.object({ kind: z.literal('thread'), id: z.string() }),
  z.object({ kind: z.literal('decision'), id: z.string() }),
  z.object({ kind: z.literal('decision-log') }),
  z.object({ kind: z.literal('progress-tracker') }),
])

export type PageSummary = z.infer<typeof pageSummary>
export type ViewedPage = z.infer<typeof viewedPageResponse>
export type ProgressTracker = z.infer<typeof progressTrackerResponse>
export type DecisionLogEntry = z.infer<typeof decisionLogEntry>
export type PadChange = z.infer<typeof padChange>
export type Answer = z.infer<typeof answer>
export type ThreadType = z.infer<typeof threadType>
export type Thread = z.infer<typeof thread>
export type NickInbox = z.infer<typeof nickInboxResponse>
