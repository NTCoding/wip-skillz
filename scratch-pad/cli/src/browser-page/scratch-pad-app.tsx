import { useCallback, useEffect, useState } from 'react'
import {
  type DecisionLogEntry,
  type Improvements,
  type NickInbox,
  type Outbox as LoadedOutbox,
  type PadChange,
  type PageReadMark,
  type PageSummary,
  type ProgressTracker,
  type ReadMarks,
  type Thread,
  type ThreadOfPad,
  type ViewedPage,
} from './api-responses'
import { useBlinkingTabTitle } from './blinking-tab-title'
import { breadcrumbOf } from './breadcrumb'
import { scrollTargetOf, useBrowserNavigation, useScrollOnNavigation } from './browser-navigation'
import { fileOfPage, type BrowserRoute, type PadAddresses } from './browser-route'
import { useCurrentSection } from './current-section'
import {
  AppFrame,
  FullTree,
  Notice,
  PageList,
  ReadingColumn,
  TopBar,
  type InboxEntry,
  type Navigate,
  type PreviewContent,
} from './design-system/design-system'
import { type DesktopNotifications } from './desktop-notifications'
import { useInboxNotifications } from './inbox-notifications'
import { InboxOutboxView } from './inbox-outbox-view'
import { useLoadedValue, type LoadedValue } from './loaded-value'
import { MissingPageView } from './missing-page-view'
import { nickInboxEntries } from './nick-inbox-entries'
import { outboxEntries } from './outbox-entries'
import { usePageActions } from './page-actions'
import { PadSidebar, sectionsOf } from './pad-sidebar'
import { PageOutline } from './page-outline'
import { fullTreeNodes, pageListEntries, pageOfFileName } from './page-tree'
import { firstRevisions, pageRevisionOf, revisedAfterReconnect, revisedBy } from './pad-revisions'
import { pagePreview } from './page-preview'
import { type SavedSettings } from './saved-settings'
import { PageWithThreads, type PageActions } from './page-with-threads'
import { useOutboxEdits } from './queued-items'
import { readMarkOf } from './read-marks'
import { useResolvedThreads, type ResolvedThreads } from './resolved-threads'
import { type ScratchPadReading, type ScratchPadWriting } from './scratch-pad-connection'
import { useSidebarState, type NarrowWindow } from './sidebar-state'
import { taskChipsOn, taskFinder, type FindTask } from './task-references'
import { TopBarActions } from './top-bar-actions'
import { DecisionLogView, ImprovementsView, LoadingView, ProgressTrackerView } from './pad-views'

interface ScratchPadAppProps {
  readonly pad: string
  readonly addresses: PadAddresses
  readonly connection: ScratchPadReading
  readonly writing: ScratchPadWriting | undefined
  readonly settings: SavedSettings
  readonly narrowWindow: NarrowWindow
  // The export and a browser without the Notification API don't have any desktop notifications.
  readonly notifications?: DesktopNotifications | undefined
}

const emptyNickInbox: NickInbox = { threads: [], decisions: [] }
const emptyOutbox: LoadedOutbox = { items: [] }
const noReadMarks: ReadMarks = { pages: [] }
const noThreads = (): Promise<ThreadOfPad[]> => Promise.resolve([])

function loadedOr<T>(loaded: LoadedValue<T>, fallback: T): T {
  return loaded.status === 'loaded' ? loaded.value : fallback
}

interface PageContext {
  readonly addresses: PadAddresses
  readonly onNavigate: Navigate
  readonly loadPreview: (
    file: string,
    section: string | undefined,
  ) => Promise<PreviewContent | undefined>
  readonly findTask: FindTask
}

interface RouteViewProps {
  readonly route: BrowserRoute
  readonly tracker: LoadedValue<ProgressTracker>
  readonly log: LoadedValue<DecisionLogEntry[]>
  readonly improvements: LoadedValue<Improvements>
  readonly page: LoadedValue<ViewedPage>
  readonly pages: LoadedValue<PageSummary[]>
  readonly threads: readonly Thread[]
  readonly outbox: LoadedOutbox
  readonly inboxThreads: readonly Thread[]
  readonly inboxEntries: readonly InboxEntry[]
  readonly threadsOfPad: readonly ThreadOfPad[]
  readonly readMark: PageReadMark | undefined
  readonly pageContext: PageContext
  readonly actions: PageActions | undefined
  readonly navigations: number
  readonly resolvedThreads: ResolvedThreads
}

function isMissing(pages: LoadedValue<PageSummary[]>, file: string): boolean {
  return (
    pages.status === 'loaded' && !pages.value.some((summary) => summary.page === `pages/${file}`)
  )
}

// Returns the page whose cards a link can point to. It also returns whether every list of those
// cards is loaded. MissingPageView shows the cards of a deleted page, which include the threads from the Inbox.
// That's why a deleted page waits for the Inbox too.
function cardsShownOn(
  route: BrowserRoute,
  page: LoadedValue<ViewedPage>,
  pages: LoadedValue<PageSummary[]>,
  cardLists: {
    readonly onPage: readonly LoadedValue<unknown>[]
    readonly inbox: LoadedValue<NickInbox>
  },
): { readonly page: string | undefined; readonly cardsRead: boolean } {
  const deleted = route.kind === 'page' && page.status === 'failed' && isMissing(pages, route.file)
  const lists = deleted ? [...cardLists.onPage, cardLists.inbox] : cardLists.onPage
  return {
    page: deleted ? `pages/${route.file}` : loadedOr(page, undefined)?.page,
    cardsRead: lists.every((list) => list.status !== 'loading'),
  }
}

function InboxOutboxRoute(props: RouteViewProps) {
  const { pageContext } = props
  return props.actions === undefined ? (
    <ReadingColumn>
      <Notice tone="info">The export doesn’t include the Inbox and the Outbox.</Notice>
    </ReadingColumn>
  ) : (
    <InboxOutboxView
      addresses={pageContext.addresses}
      pages={loadedOr(props.pages, [])}
      inboxEntries={props.inboxEntries}
      threads={props.threadsOfPad}
      outbox={props.outbox.items}
      onNavigate={pageContext.onNavigate}
    />
  )
}

function RouteView(props: RouteViewProps) {
  const { route, tracker, log, page, threads, pageContext, actions } = props
  if (route.kind === 'progress-tracker') {
    return tracker.status === 'loaded' ? (
      <ProgressTrackerView
        tracker={tracker.value}
        context={pageContext}
        openSection={route.section}
        navigations={props.navigations}
      />
    ) : (
      <LoadingView loaded={tracker} />
    )
  }
  if (route.kind === 'decision-log') {
    return log.status === 'loaded' ? (
      <DecisionLogView entries={log.value} />
    ) : (
      <LoadingView loaded={log} />
    )
  }
  if (route.kind === 'improvements') {
    const { improvements } = props
    return improvements.status === 'loaded' ? (
      <ImprovementsView
        improvements={improvements.value}
        openEntry={route.section}
        context={pageContext}
        actions={actions}
      />
    ) : (
      <LoadingView loaded={improvements} />
    )
  }
  if (route.kind === 'inbox-outbox') {
    return <InboxOutboxRoute {...props} />
  }
  if (page.status === 'failed' && isMissing(props.pages, route.file)) {
    return (
      <MissingPageView
        file={route.file}
        threads={props.inboxThreads.filter((thread) => thread.page === `pages/${route.file}`)}
        pageThreads={threads}
        outbox={props.outbox.items}
        actions={actions}
      />
    )
  }
  return page.status === 'loaded' ? (
    <PageWithThreads
      key={page.value.page}
      page={page.value}
      threads={threads}
      outbox={props.outbox.items}
      context={pageContext}
      actions={actions}
      address={{ section: route.section, navigations: props.navigations }}
      readMark={props.readMark}
      resolvedThreads={props.resolvedThreads}
      taskChips={taskChipsOn(props.tracker, props.pages, page.value.page, pageContext)}
      end={
        route.file === 'index.md' ? (
          <>
            <PageList
              label="Pages"
              entries={pageListEntries(pageContext.addresses, loadedOr(props.pages, []))}
              onNavigate={pageContext.onNavigate}
            />
            <FullTree
              label="Full tree"
              nodes={fullTreeNodes(pageContext.addresses, loadedOr(props.pages, []))}
              onNavigate={pageContext.onNavigate}
            />
          </>
        ) : undefined
      }
    />
  ) : (
    <LoadingView loaded={page} />
  )
}

// The button after the name of the current page marks a new page as read and a read page as unread.
function pageActionOf(actions: PageActions | undefined, mark: PageReadMark | undefined) {
  if (actions === undefined || mark === undefined) {
    return undefined
  }
  const file = fileOfPage(mark.page)
  return mark.state === 'new'
    ? { label: 'Mark as read', onClick: () => actions.markPageRead(file, mark.sections) }
    : { label: 'Mark as unread', onClick: () => actions.markPageUnread(file) }
}

function tabTitleOf(pageTitle: string | undefined, padTitle: string): string {
  return pageTitle === undefined || pageTitle === padTitle ? padTitle : `${pageTitle} · ${padTitle}`
}

// The Inbox / Outbox view shows every thread of the scratch pad. The Outbox in the top bar needs
// the thread of each queued reply to show the place of the reply.
function useThreadsOfPad(
  connection: ScratchPadReading,
  route: BrowserRoute,
  outbox: LoadedOutbox,
  revision: number,
): readonly ThreadOfPad[] {
  const needed = route.kind === 'inbox-outbox' || outbox.items.some((item) => item.kind === 'reply')
  return loadedOr(
    useLoadedValue(
      needed ? 'threads of the pad' : 'no threads',
      revision,
      needed ? connection.threadsOfPad : noThreads,
    ),
    [],
  )
}

export function ScratchPadApp(props: ScratchPadAppProps) {
  const { pad, addresses, connection, writing, settings, narrowWindow } = props
  const { route, navigate, replace, navigations } = useBrowserNavigation(addresses.routeOf)
  const { collapsed, changeCollapsed } = useSidebarState(settings, narrowWindow, navigations)
  const [revisions, setRevisions] = useState(firstRevisions)
  const [serverStopped, setServerStopped] = useState(false)
  const changed = useCallback(
    (change: PadChange) => setRevisions((current) => revisedBy(current, change)),
    [],
  )
  useEffect(
    () =>
      connection.onChange({
        changed,
        connection: (connected) => {
          setServerStopped(!connected)
          if (connected) {
            setRevisions(revisedAfterReconnect)
          }
        },
      }),
    [connection, changed],
  )

  const file = route.kind === 'page' ? route.file : 'index.md'
  const pages = useLoadedValue(pad, revisions.pages, connection.pages)
  const tracker = useLoadedValue(pad, revisions.progressTracker, connection.progressTracker)
  const log = useLoadedValue(pad, revisions.decisionLog, connection.decisionLog)
  const improvements = useLoadedValue(pad, revisions.improvements, connection.improvements)
  const inbox = useLoadedValue(pad, revisions.nickInbox, connection.nickInbox)
  const loadedOutbox = useLoadedValue(pad, revisions.outbox, connection.outbox)
  const outbox = loadedOr(loadedOutbox, emptyOutbox)
  const page = useLoadedValue(file, pageRevisionOf(revisions, file), connection.page)
  const threads = useLoadedValue(file, revisions.threads, connection.threads)
  const readMarks = loadedOr(
    useLoadedValue(pad, revisions.readMarks, connection.readMarks),
    noReadMarks,
  )
  const threadsOfPad = useThreadsOfPad(connection, route, outbox, revisions.threads)
  const viewedPage = route.kind === 'page' ? loadedOr(page, undefined) : undefined
  const padTitle = loadedOr(tracker, undefined)?.title ?? pad
  useInboxNotifications(props.notifications, padTitle, inbox, tracker)
  const address = { section: route.kind === 'page' ? route.section : undefined, navigations }
  const resolvedThreads = useResolvedThreads(loadedOr(threads, []))
  const currentSection = useCurrentSection(
    sectionsOf(viewedPage).map((heading) => heading.id),
    address,
  )
  // A link can point to the card of a thread or of a comment in the outbox, so the page only
  // scrolls once both are loaded.
  const cards = cardsShownOn(route, page, pages, { onPage: [threads, loadedOutbox], inbox })
  useScrollOnNavigation(
    scrollTargetOf(
      route,
      cards.page,
      cards.cardsRead,
      (route.kind === 'progress-tracker' ? tracker : improvements).status !== 'loading',
    ),
    navigations,
  )
  const loadPreview = useCallback(
    async (target: string, section: string | undefined) =>
      pagePreview(await connection.page(target), padTitle, section),
    [connection, padTitle],
  )
  const [outboxEditing, editingQueuedItem] = useOutboxEdits()
  const actions = usePageActions(writing, changed, editingQueuedItem)
  const pageList = loadedOr(pages, [])
  const pageOfFile = route.kind === 'page' ? pageOfFileName(pageList, route.file) : undefined
  useEffect(() => {
    if (route.kind === 'page' && pageOfFile !== undefined) {
      replace(addresses.pageHref(fileOfPage(pageOfFile), route.section))
    }
  }, [route, pageOfFile, replace, addresses])
  const inboxEntries = nickInboxEntries(
    addresses,
    loadedOr(inbox, emptyNickInbox),
    pageList,
    readMarks,
    loadedOr(tracker, undefined),
  )
  useBlinkingTabTitle(tabTitleOf(viewedPage?.title, padTitle), padTitle, inboxEntries)
  const queuedEntries = outboxEntries(addresses, outbox.items, pageList, threadsOfPad)
  const breadcrumb = breadcrumbOf(route, viewedPage, pageList, addresses)
  const readMark = route.kind === 'page' ? readMarkOf(readMarks, `pages/${route.file}`) : undefined
  const findTask = taskFinder(loadedOr(tracker, undefined))

  return (
    <AppFrame
      sidebarCollapsed={collapsed}
      onSidebarCollapse={() => changeCollapsed(true)}
      topBar={
        <TopBar
          title={padTitle}
          titleHref={addresses.pageHref('index.md')}
          parents={breadcrumb.parents}
          current={breadcrumb.current}
          subtree={breadcrumb.subtree}
          pageAction={pageActionOf(actions, readMark)}
          onNavigate={navigate}
          actions={
            <TopBarActions
              serverStopped={serverStopped}
              actions={actions}
              notifications={props.notifications}
              inboxEntries={inboxEntries}
              outboxCount={outbox.items.length}
              outboxEntries={queuedEntries}
              outboxEditing={outboxEditing}
              onNavigate={navigate}
            />
          }
        />
      }
      sidebar={
        <PadSidebar
          addresses={addresses}
          title={padTitle}
          view={route.kind}
          pages={pageList}
          currentFile={route.kind === 'page' ? route.file : undefined}
          currentPage={viewedPage}
          currentSection={currentSection}
          collapsed={collapsed}
          onCollapsedChange={changeCollapsed}
          onNavigate={navigate}
          readMarks={readMarks}
          withInboxOutbox={actions !== undefined}
        />
      }
    >
      <RouteView
        route={route}
        tracker={tracker}
        log={log}
        improvements={improvements}
        page={page}
        pages={pages}
        threads={loadedOr(threads, [])}
        outbox={outbox}
        inboxThreads={loadedOr(inbox, emptyNickInbox).threads}
        inboxEntries={inboxEntries}
        threadsOfPad={threadsOfPad}
        readMark={readMark}
        pageContext={{ addresses, onNavigate: navigate, loadPreview, findTask }}
        actions={actions}
        navigations={navigations}
        resolvedThreads={resolvedThreads}
      />
      {viewedPage !== undefined && (
        <PageOutline
          addresses={addresses}
          page={viewedPage}
          onNavigate={navigate}
          address={address}
        />
      )}
    </AppFrame>
  )
}
