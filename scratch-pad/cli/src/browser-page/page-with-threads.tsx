import { useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  type Answer,
  type PageReadMark,
  type QueuedComment,
  type QueuedItem,
  type Thread,
  type ViewedPage,
} from './api-responses'
import {
  MarginCard,
  MarginLane,
  MarginMarker,
  ReadingColumn,
  SelectedTextQuote,
  SelectionTools,
  ThreadCard,
  ThreadDraft,
  threadKindLabels,
  type ImprovementEdit,
  type MarginItem,
  type ThreadKindName,
  type ThreadState,
} from './design-system/design-system'
import { shownTime } from './message-time'
import {
  queuedItemMessage,
  queuedKey,
  queuedRepliesTo,
  type QueuedItemActions,
} from './queued-items'
import { anchorLinesOf, decisionMarginItems } from './answered-decision-items'
import { elementContextOf, type PageContext } from './page-element-context'
import { fileOfPage } from './browser-route'
import { changedSectionItems, usePageMarks, type ReadMarkActions } from './changed-section-items'
import { answeredDecisions, pageElements, parsedPageBody } from './page-elements'
import { type PageAddress } from './current-section'
import { type NewThread } from './scratch-pad-connection'
import { type BlockSelection } from './selected-block'
import { useSelectionTools } from './selection-tools-state'
import { highlightedTexts, type SearchMatchOnPage, type TextHighlight } from './text-highlights'
import { type ResolvedThreads } from './resolved-threads'
import { withTaskChips } from './task-references'
import { placeThreads, type PlacedThread } from './thread-anchors'

export interface PageActions extends QueuedItemActions, ReadMarkActions {
  readonly startThread: (thread: NewThread) => Promise<Thread>
  readonly replyToThread: (id: string, message: string) => Promise<Thread>
  readonly resolveThread: (id: string) => Promise<Thread>
  readonly answerDecision: (id: string, page: string, answer: Answer) => Promise<void>
  readonly editImprovement: (number: number, edit: ImprovementEdit) => Promise<void>
  readonly deleteImprovement: (number: number) => Promise<void>
  readonly queueComment: (thread: NewThread) => Promise<void>
  readonly queueReply: (id: string, message: string) => Promise<void>
  readonly sendOutbox: () => Promise<void>
}

// When Nick goes to the address of a thread, for example from his Inbox, that thread becomes active.
interface PageWithThreadsProps {
  readonly page: ViewedPage
  readonly threads: readonly Thread[]
  // Every item in the outbox. The page shows the queued comments on this page and the queued
  // replies to the threads of this page.
  readonly outbox: readonly QueuedItem[]
  readonly context: PageContext
  readonly actions: PageActions | undefined
  readonly address: PageAddress
  // What the page shows under the last block of the agent's text, like the list of pages on the index page
  readonly end?: ReactNode
  // Whether Nick has read the page and which sections have changed since he read it. The export
  // doesn't have any read marks.
  readonly readMark?: PageReadMark | undefined
  readonly resolvedThreads: ResolvedThreads
  // The chips under the title for the tasks that the page is part of
  readonly taskChips?: ReactNode
  // The match that Nick has opened from the search, which is highlighted on the page
  readonly searchMatch?: SearchMatchOnPage | undefined
}

interface Draft {
  readonly kind: ThreadKindName
  readonly selection: BlockSelection
}

export const threadStates: Readonly<Record<Thread['waitsFor'], ThreadState>> = {
  agent: 'waits-for-agent',
  nick: 'waits-for-nick',
  nobody: 'resolved',
}

function isResolved(thread: Thread): boolean {
  return threadStates[thread.waitsFor] === 'resolved'
}

function isBehind(loaded: Thread, posted: Thread): boolean {
  const resolvedByNick = isResolved(posted) && !isResolved(loaded)
  return (
    loaded.messages.length < posted.messages.length ||
    (loaded.messages.length === posted.messages.length && resolvedByNick)
  )
}

export function withPostedThreads(
  loaded: readonly Thread[],
  posted: ReadonlyMap<string, Thread>,
): Thread[] {
  const shown = loaded.map((thread) => {
    const mine = posted.get(thread.id)
    return mine !== undefined && isBehind(thread, mine) ? mine : thread
  })
  const added = [...posted.values()].filter(
    (thread) => !loaded.some((each) => each.id === thread.id),
  )
  return [...shown, ...added]
}

function highlightsOf(
  placed: readonly PlacedThread[],
  queued: readonly PlacedThread<QueuedComment>[],
  active: string | undefined,
  draft: Draft | undefined,
): TextHighlight[] {
  const ofThreads = placed.flatMap(({ thread, highlight }) =>
    highlight === undefined || isResolved(thread)
      ? []
      : [{ thread: thread.id, kind: thread.type, active: thread.id === active, ...highlight }],
  )
  const ofQueued = queued.flatMap(({ thread, highlight }) => {
    const key = queuedKey(thread)
    return highlight === undefined
      ? []
      : [{ thread: key, kind: 'comment' as const, active: key === active, ...highlight }]
  })
  const ofDraft =
    draft === undefined
      ? []
      : [
          {
            thread: 'draft',
            kind: draft.kind,
            active: true,
            blockLines: draft.selection.lines,
            selectedText: draft.selection.selectedText,
            occurrence: draft.selection.occurrence,
          },
        ]
  return [...ofThreads, ...ofQueued, ...ofDraft]
}

interface ThreadCardActions {
  readonly onReply: (text: string) => Promise<void>
  readonly onResolve: () => Promise<void>
}

export function threadCardActions(
  actions: PageActions,
  id: string,
  remember: (thread: Thread) => void,
): ThreadCardActions {
  return {
    onReply: async (message) => remember(await actions.replyToThread(id, message)),
    onResolve: async () => remember(await actions.resolveThread(id)),
  }
}

function newThreadOf(draft: Draft, page: string, message: string): NewThread {
  const { firstLine, lastLine, selectedText, prefix, suffix } = draft.selection
  return { type: draft.kind, page, firstLine, lastLine, selectedText, prefix, suffix, message }
}

function useActiveThread(
  address: PageAddress,
): [string | undefined, (thread: string | undefined) => void] {
  const [active, setActive] = useState(address.section)
  const [followed, setFollowed] = useState(address)
  if (followed.navigations !== address.navigations) {
    setFollowed(address)
    setActive(address.section)
  }
  return [active, setActive]
}

export function PageWithThreads(props: PageWithThreadsProps) {
  const { page, threads, context, actions } = props
  const pageText = useRef<HTMLElement>(null)
  const toolsHolder = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useSelectionTools(pageText, toolsHolder)
  const [draft, setDraft] = useState<Draft | undefined>(undefined)
  const [active, setActive] = useActiveThread(props.address)
  const [posted, setPosted] = useState<ReadonlyMap<string, Thread>>(new Map())
  const [choices, setChoices] = useState<ReadonlyMap<string, Answer>>(new Map())
  const file = fileOfPage(page.page)
  const readMarks = usePageMarks(props.readMark, actions, file, setActive)
  const body = useMemo(() => parsedPageBody(page.html), [page.html])
  const shownThreads = useMemo(() => withPostedThreads(threads, posted), [threads, posted])
  const placed = useMemo(() => placeThreads(body, shownThreads), [body, shownThreads])
  const placedQueued = useMemo(
    () =>
      placeThreads(
        body,
        props.outbox.filter(
          (item): item is QueuedComment => item.kind === 'comment' && item.page === page.page,
        ),
      ),
    [body, props.outbox, page.page],
  )
  // Only Nick's own resolve returns a resolved thread. In a wide reading column, the card of that
  // thread is hidden behind its marker afterwards.
  const remember = (thread: Thread): void => {
    setPosted((current) => new Map([...current, [thread.id, thread]]))
    if (thread.waitsFor === 'nobody') {
      props.resolvedThreads.resolvedByNick(thread)
    }
  }
  const startDraft = (kind: ThreadKindName, selection: BlockSelection): void => {
    setDraft({ kind, selection })
    setSelected(undefined)
    document.getSelection()?.removeAllRanges()
  }
  const sendDraft = async (
    writing: PageActions,
    current: Draft,
    message: string,
  ): Promise<void> => {
    const thread = await writing.startThread(newThreadOf(current, page.page, message))
    remember(thread)
    setDraft(undefined)
    setActive(thread.id)
  }
  const queueDraft = async (writing: PageActions, current: Draft, message: string) => {
    await writing.queueComment(newThreadOf(current, page.page, message))
    setDraft(undefined)
  }
  const elementContext = elementContextOf(context, page, choices, actions?.answerDecision, {
    startDraft,
    answered: (id, choice) => {
      setChoices((current) => new Map([...current, [id, choice]]))
      setActive(id)
    },
  })
  const decisions = answeredDecisions(elementContext, body)
  const toggle = (key: string): void => {
    if (draft === undefined) {
      setActive(key === active ? undefined : key)
    }
  }
  const decisionItems = decisionMarginItems(
    decisions,
    draft === undefined ? active : undefined,
    toggle,
  )
  const items: MarginItem[] = placed.map(({ thread, blockLines, textChanged }) => ({
    key: thread.id,
    anchorLines: anchorLinesOf(blockLines, decisions),
    content: (
      <ThreadCard
        id={thread.id}
        kind={thread.type}
        quote={thread.anchor}
        messages={thread.messages.map((message) => ({
          ...message,
          shownTime: shownTime(message.time),
        }))}
        state={threadStates[thread.waitsFor]}
        outcome={thread.outcome}
        textChanged={textChanged}
        active={thread.id === active}
        onActivate={() => setActive(thread.id)}
        {...(actions === undefined ? {} : threadCardActions(actions, thread.id, remember))}
        onAddToOutbox={
          actions === undefined || thread.type !== 'comment'
            ? undefined
            : (text) => actions.queueReply(thread.id, text)
        }
        outbox={
          actions === undefined
            ? undefined
            : queuedRepliesTo(props.outbox, thread.id).map((item) =>
                queuedItemMessage(actions, item, 'Reply'),
              )
        }
      />
    ),
    marker: (
      <MarginMarker
        label={`${threadKindLabels[thread.type]} ${thread.id}`}
        kind={thread.type}
        messages={thread.messages.length}
        open={draft === undefined && thread.id === active}
        onClick={() => toggle(thread.id)}
      />
    ),
    popup: draft === undefined && thread.id === active,
    behindMarker: props.resolvedThreads.behindMarker(thread),
  }))
  const queuedItems: MarginItem[] =
    actions === undefined
      ? []
      : placedQueued.map(({ thread: item, blockLines }) => {
          const key = queuedKey(item)
          return {
            key,
            anchorLines: anchorLinesOf(blockLines, decisions),
            content: (
              <MarginCard
                id={key}
                label="Comment in the outbox"
                name="the comment in the outbox"
                kind="comment"
                active={key === active}
                onFocus={() => setActive(key)}
              >
                {(fullSize) => (
                  <>
                    {fullSize && <SelectedTextQuote quote={item.anchor} kind="comment" />}
                    {queuedItemMessage(actions, item, 'Comment')}
                  </>
                )}
              </MarginCard>
            ),
            marker: (
              <MarginMarker
                label="Comment in the outbox"
                kind="comment"
                messages={1}
                open={draft === undefined && key === active}
                onClick={() => toggle(key)}
              />
            ),
            popup: draft === undefined && key === active,
          }
        })
  const draftItems: MarginItem[] =
    draft === undefined || actions === undefined
      ? []
      : [
          {
            key: 'draft',
            anchorLines: draft.selection.lines,
            content: (
              <ThreadDraft
                key={`${draft.kind} ${draft.selection.lines} ${draft.selection.selectedText}`}
                kind={draft.kind}
                selectedText={draft.selection.selectedText}
                onSend={(message) => sendDraft(actions, draft, message)}
                onAddToOutbox={
                  draft.kind === 'comment'
                    ? (message) => queueDraft(actions, draft, message)
                    : undefined
                }
                onCancel={() => setDraft(undefined)}
              />
            ),
            marker: undefined,
            popup: true,
          },
        ]
  const changedItems = changedSectionItems(props.readMark, actions, {
    body,
    active: draft === undefined ? active : undefined,
    toggle,
    problems: readMarks.problems,
  })
  const highlights = highlightsOf(placed, placedQueued, active, draft)
  const highlighted = highlightedTexts(body, highlights, props.searchMatch)
  return (
    <>
      <ReadingColumn
        textRef={pageText}
        end={props.end}
        margin={
          <MarginLane
            label="Comments and notes"
            items={[...items, ...decisionItems, ...queuedItems, ...changedItems, ...draftItems]}
            onClosePopup={draft === undefined ? () => setActive(undefined) : undefined}
          />
        }
      >
        {pageElements(
          elementContext,
          body,
          highlighted,
          withTaskChips(readMarks.marks, props.taskChips),
          new Set(decisions.map((decision) => decision.id)),
        )}
      </ReadingColumn>
      {selected !== undefined &&
        actions !== undefined &&
        createPortal(
          <div ref={toolsHolder}>
            <SelectionTools
              top={selected.top}
              centre={selected.centre}
              onPick={(kind) => startDraft(kind, selected)}
              onLeave={() => setSelected(undefined)}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
