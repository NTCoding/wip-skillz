import { z } from 'zod'

const optionalText = z
  .string()
  .nullable()
  .transform((text) => text ?? undefined)

const waitingForNick = z.object({ decisions: z.number(), replies: z.number() })

const heading = z.object({ level: z.number(), text: z.string(), id: z.string(), line: z.number() })

const pageSummary = z.object({
  page: z.string(),
  file: z.string(),
  number: optionalText,
  parent: optionalText,
  title: optionalText,
  description: optionalText,
  headings: z.array(heading),
  openThreads: z.number(),
  waitingForNickWithSubPages: waitingForNick,
})

export const pagesResponse = z.object({ pages: z.array(pageSummary) })

const pageLink = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('page'),
    href: z.string(),
    page: z.string(),
    headingId: optionalText,
  }),
  z.object({ kind: z.literal('task'), href: z.string(), id: z.string() }),
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

// The assignment of a task or a subtask has what Nick has to do and why the agent can't do the
// task. The only assignee is user, who is Nick.
const assignment = z.object({ assignee: z.enum(['user']), do: z.string(), why: z.string() })

const subtask = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  state: z.enum(['to-do', 'in-progress', 'done']),
  html: optionalText,
  links: z.array(pageLink),
  assignment: assignment.nullable().transform((value) => value ?? undefined),
})

const task = subtask.extend({ number: z.number(), subtasks: z.array(subtask) })

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

const improvement = z.object({
  number: z.number(),
  time: z.string(),
  title: z.string(),
  details: optionalText,
  html: optionalText,
  links: z.array(pageLink),
})

const improvementNote = z.object({
  id: z.string(),
  type: z.enum(['grammar', 'improvement']),
  page: z.string(),
  text: z.string(),
  time: z.string(),
  outcome: optionalText,
})

export const improvementsResponse = z.object({
  improvements: z.array(improvement),
  notes: z.array(improvementNote),
})

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

const threadOfPad = thread.extend({ resolvedTime: optionalText })

export const threadsOfPadResponse = z.object({ threads: z.array(threadOfPad) })

// The hash of a section's text, which the browser posts back when Nick marks the section as read
const sectionHash = z.object({ id: z.string(), hash: z.string() })

const pageReadMark = z.object({
  page: z.string(),
  state: z.enum(['new', 'read']),
  changedTime: z.string(),
  sections: z.array(sectionHash),
  changedSections: z.array(sectionHash.extend({ title: z.string() })),
})

export const readMarksResponse = z.object({ pages: z.array(pageReadMark) })

export const markedPageResponse = z.object({ page: z.string() })

const queuedItem = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('comment'),
    number: z.number(),
    page: z.string(),
    anchor,
    text: z.string(),
    time: z.string(),
    position,
  }),
  z.object({
    kind: z.literal('reply'),
    number: z.number(),
    thread: z.string(),
    text: z.string(),
    time: z.string(),
  }),
])

export const outboxResponse = z.object({ items: z.array(queuedItem) })

const contextLink = z.object({ text: z.string(), page: z.string(), headingId: optionalText })

// The first paragraph of a decision's context and its links to the pages of the scratch pad
const contextSummary = z.object({ lead: optionalText, links: z.array(contextLink) })

const openDecision = z.object({
  page: z.string(),
  id: z.string(),
  line: z.number(),
  question: z.string(),
  // The time that the decision's page file was last written when the server first found the
  // decision
  time: z.string(),
  context: contextSummary.nullable().transform((value) => value ?? undefined),
})

export const nickInboxResponse = z.object({
  threads: z.array(thread),
  decisions: z.array(openDecision),
})

export const decisionAnswerResponse = z.object({ decision: z.object({ id: z.string() }) })

export const taskDoneResponse = z.object({ task: z.object({ id: z.string() }) })

export const improvementEditResponse = z.object({
  improvement: z.object({ number: z.number() }),
})

export const improvementDeleteResponse = z.object({ deleted: z.number() })

// One line of a page that contains the query. The matches are the places of the query in the
// snippet, which is the part of the line around the first match.
const searchResult = z.object({
  page: z.string(),
  heading: optionalText,
  headingId: optionalText,
  snippet: z.string(),
  matches: z.array(z.object({ start: z.number(), end: z.number() })),
})

export const searchResponse = z.object({ results: z.array(searchResult) })

export const errorResponse = z.object({ error: z.string() })

export const exportedPadData = z.object({
  pages: z.array(pageSummary),
  viewedPages: z.array(viewedPageResponse),
  threads: z.array(thread),
  progressTracker: progressTrackerResponse,
  decisionLog: z.array(decisionLogEntry),
  improvements: improvementsResponse,
})

export const padChange = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('page'), page: z.string() }),
  z.object({ kind: z.literal('thread'), id: z.string() }),
  z.object({ kind: z.literal('decision'), id: z.string() }),
  z.object({ kind: z.literal('decision-log') }),
  z.object({ kind: z.literal('improvements') }),
  z.object({ kind: z.literal('outbox') }),
  z.object({ kind: z.literal('read-marks') }),
  z.object({ kind: z.literal('progress-tracker') }),
])

export type PageSummary = z.infer<typeof pageSummary>
export type ViewedPage = z.infer<typeof viewedPageResponse>
export type ProgressTracker = z.infer<typeof progressTrackerResponse>
export type DecisionLogEntry = z.infer<typeof decisionLogEntry>
export type Improvements = z.infer<typeof improvementsResponse>
export type PadChange = z.infer<typeof padChange>
export type Answer = z.infer<typeof answer>
export type ThreadType = z.infer<typeof threadType>
export type Thread = z.infer<typeof thread>
export type ThreadOfPad = z.infer<typeof threadOfPad>
export type ReadMarks = z.infer<typeof readMarksResponse>
export type PageReadMark = z.infer<typeof pageReadMark>
export type SectionHash = z.infer<typeof sectionHash>
export type NickInbox = z.infer<typeof nickInboxResponse>
export type Outbox = z.infer<typeof outboxResponse>
export type QueuedItem = z.infer<typeof queuedItem>
export type SearchResult = z.infer<typeof searchResult>
export type QueuedComment = Extract<QueuedItem, { kind: 'comment' }>
