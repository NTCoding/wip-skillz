import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { type Answer, type Thread, type ViewedPage } from './api-responses'
import {
  MarginLane,
  MarginMarker,
  ReadingColumn,
  SelectionTools,
  ThreadCard,
  ThreadDraft,
  threadKindLabels,
  type MarginItem,
  type ThreadKindName,
  type ThreadState,
} from './design-system/design-system'
import { shownTime } from './message-time'
import { pageElements, parsedPageBody, type PageElementContext } from './page-elements'
import { type PageAddress } from './current-section'
import { type NewThread } from './scratch-pad-connection'
import {
  selectedBlockText,
  wholeBlockSelection,
  type BlockSelection,
  type SelectedBlockText,
} from './selected-block'
import { highlightedTexts, type TextHighlight } from './text-highlights'
import { placeThreads, type PlacedThread } from './thread-anchors'

export interface PageActions {
  readonly startThread: (thread: NewThread) => Promise<Thread>
  readonly replyToThread: (id: string, message: string) => Promise<Thread>
  readonly resolveThread: (id: string) => Promise<Thread>
  readonly answerDecision: (id: string, page: string, answer: Answer) => Promise<void>
}

type PageContext = Omit<
  PageElementContext,
  'page' | 'onAnswerDecision' | 'onCommentOnBlock' | 'answersOnThisPage'
>

// When Nick goes to the address of a thread, for example from his Inbox, that thread becomes active.
interface PageWithThreadsProps {
  readonly page: ViewedPage
  readonly threads: readonly Thread[]
  readonly context: PageContext
  readonly actions: PageActions | undefined
  readonly address: PageAddress
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

function useSelectionTools(
  pageText: RefObject<HTMLElement | null>,
  tools: RefObject<HTMLDivElement | null>,
): [SelectedBlockText | undefined, (selection: SelectedBlockText | undefined) => void] {
  const [selected, setSelected] = useState<SelectedBlockText | undefined>(undefined)
  useEffect(() => {
    const update = (event: MouseEvent | KeyboardEvent): void => {
      const insideTools = event.target instanceof Node && tools.current?.contains(event.target)
      const selecting = event instanceof MouseEvent || event.shiftKey || event.key === 'Shift'
      if (!insideTools && selecting) {
        setSelected(selectedBlockText(document.getSelection(), pageText.current))
      }
    }
    const hideOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setSelected(undefined)
      }
    }
    document.addEventListener('mouseup', update)
    document.addEventListener('keyup', update)
    document.addEventListener('keydown', hideOnEscape)
    return () => {
      document.removeEventListener('mouseup', update)
      document.removeEventListener('keyup', update)
      document.removeEventListener('keydown', hideOnEscape)
    }
  }, [pageText, tools])
  return [selected, setSelected]
}

function highlightsOf(
  placed: readonly PlacedThread[],
  active: string | undefined,
  draft: Draft | undefined,
): TextHighlight[] {
  const ofThreads = placed.flatMap(({ thread, highlight }) =>
    highlight === undefined || isResolved(thread)
      ? []
      : [{ thread: thread.id, kind: thread.type, active: thread.id === active, ...highlight }],
  )
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
  return [...ofThreads, ...ofDraft]
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
  const body = useMemo(() => parsedPageBody(page.html), [page.html])
  const shownThreads = useMemo(() => withPostedThreads(threads, posted), [threads, posted])
  const placed = useMemo(() => placeThreads(body, shownThreads), [body, shownThreads])
  const remember = (thread: Thread): void => {
    setPosted((current) => new Map([...current, [thread.id, thread]]))
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
  const items: MarginItem[] = placed.map(({ thread, blockLines, textChanged }) => ({
    key: thread.id,
    anchorLines: blockLines,
    content: (
      <ThreadCard
        id={thread.id}
        kind={thread.type}
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
      />
    ),
    marker: (
      <MarginMarker
        label={`${threadKindLabels[thread.type]} ${thread.id}`}
        kind={thread.type}
        messages={thread.messages.length}
        open={draft === undefined && thread.id === active}
        onClick={() => {
          if (draft === undefined) {
            setActive(thread.id === active ? undefined : thread.id)
          }
        }}
      />
    ),
    popup: draft === undefined && thread.id === active,
  }))
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
                onCancel={() => setDraft(undefined)}
              />
            ),
            marker: undefined,
            popup: true,
          },
        ]
  const elementContext: PageElementContext = {
    ...context,
    page,
    answersOnThisPage: choices,
    onCommentOnBlock:
      actions === undefined
        ? undefined
        : (lines) => {
            const selection = wholeBlockSelection(lines)
            if (selection !== undefined) {
              startDraft('comment', selection)
            }
          },
    onAnswerDecision:
      actions === undefined
        ? undefined
        : async (id, choice) => {
            await actions.answerDecision(id, page.page, choice)
            setChoices((current) => new Map([...current, [id, choice]]))
          },
  }
  const highlighted = highlightedTexts(body, highlightsOf(placed, active, draft))
  return (
    <>
      <ReadingColumn
        textRef={pageText}
        margin={
          <MarginLane
            label="Comments and notes"
            items={[...items, ...draftItems]}
            onClosePopup={draft === undefined ? () => setActive(undefined) : undefined}
          />
        }
      >
        {pageElements(elementContext, body, highlighted)}
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
