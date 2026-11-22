import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  type Answer,
  type DecisionLogEntry,
  type Improvements,
  type NickInbox,
  type Outbox as LoadedOutbox,
  type PadChange,
  type PageSummary,
  type ProgressTracker,
  type Thread,
  type ViewedPage,
} from './api-responses'
import { scrollTargetOf, useBrowserNavigation, useScrollOnNavigation } from './browser-navigation'
import { fileOfPage, type BrowserRoute, type PadAddresses } from './browser-route'
import { useCurrentSection } from './current-section'
import {
  AppFrame,
  FullTree,
  PageList,
  TopBar,
  type ImprovementEdit,
  type Navigate,
  type PreviewContent,
} from './design-system/design-system'
import { useLoadedValue, type LoadedValue } from './loaded-value'
import { MissingPageView } from './missing-page-view'
import { nickInboxEntries } from './nick-inbox-entries'
import { PadSidebar, sectionsOf } from './pad-sidebar'
import { PageOutline } from './page-outline'
import { fullTreeNodes, pageListEntries, pageOfFileName, parentsOf } from './page-tree'
import { firstRevisions, pageRevisionOf, revisedAfterReconnect, revisedBy } from './pad-revisions'
import { pagePreview } from './page-preview'
import { type SavedSettings } from './saved-settings'
import { PageWithThreads, type PageActions } from './page-with-threads'
import { useOutboxEdits, type QueuedItemActions } from './queued-items'
import {
  type NewThread,
  type ScratchPadReading,
  type ScratchPadWriting,
} from './scratch-pad-connection'
import { useSidebarState, type NarrowWindow } from './sidebar-state'
import { TopBarActions } from './top-bar-actions'
import { DecisionLogView, ImprovementsView, LoadingView, ProgressTrackerView } from './pad-views'

interface ScratchPadAppProps {
  readonly pad: string
  readonly addresses: PadAddresses
  readonly connection: ScratchPadReading
  readonly writing: ScratchPadWriting | undefined
  readonly settings: SavedSettings
  readonly narrowWindow: NarrowWindow
}

const emptyNickInbox: NickInbox = { threads: [], decisions: [] }
const emptyOutbox: LoadedOutbox = { items: [] }

function loadedOr<T>(loaded: LoadedValue<T>, fallback: T): T {
  return loaded.status === 'loaded' ? loaded.value : fallback
}

interface Breadcrumb {
  readonly parents: readonly { readonly title: string; readonly href: string }[]
  readonly current: string | undefined
}

function breadcrumbOf(
  route: BrowserRoute,
  viewedPage: ViewedPage | undefined,
  pageList: readonly PageSummary[],
  addresses: PadAddresses,
): Breadcrumb {
  if (route.kind === 'progress-tracker') {
    return { parents: [], current: 'Progress tracker' }
  }
  if (route.kind === 'decision-log') {
    return { parents: [], current: 'Decisions' }
  }
  if (route.kind === 'improvements') {
    return { parents: [], current: 'Improvements' }
  }
  if (route.file === 'index.md') {
    return { parents: [], current: undefined }
  }
  const page = `pages/${route.file}`
  const summary = pageList.find((each) => each.page === page)
  return {
    parents: parentsOf(pageList, page).map((parent) => {
      const file = fileOfPage(parent.page)
      return { title: parent.title ?? file, href: addresses.pageHref(file) }
    }),
    current: viewedPage?.title ?? summary?.title ?? route.file,
  }
}

interface PageContext {
  readonly addresses: PadAddresses
  readonly onNavigate: Navigate
  readonly loadPreview: (
    file: string,
    section: string | undefined,
  ) => Promise<PreviewContent | undefined>
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
  readonly pageContext: PageContext
  readonly actions: PageActions | undefined
  readonly navigations: number
}

function isMissing(pages: LoadedValue<PageSummary[]>, file: string): boolean {
  return (
    pages.status === 'loaded' && !pages.value.some((summary) => summary.page === `pages/${file}`)
  )
}

function RouteView(props: RouteViewProps) {
  const { route, tracker, log, page, threads, pageContext, actions } = props
  if (route.kind === 'progress-tracker') {
    return tracker.status === 'loaded' ? (
      <ProgressTrackerView tracker={tracker.value} />
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

function usePageActions(
  writing: ScratchPadWriting | undefined,
  changed: (change: PadChange) => void,
  editingQueuedItem: QueuedItemActions['editingQueuedItem'],
): PageActions | undefined {
  return useMemo(() => {
    if (writing === undefined) {
      return undefined
    }
    return {
      startThread: async (thread: NewThread) => {
        const started = await writing.startThread(thread)
        changed({ kind: 'thread', id: started.id })
        return started
      },
      replyToThread: async (id: string, message: string) => {
        const thread = await writing.replyToThread(id, message)
        changed({ kind: 'thread', id })
        return thread
      },
      resolveThread: async (id: string) => {
        const thread = await writing.resolveThread(id)
        changed({ kind: 'thread', id })
        return thread
      },
      answerDecision: async (id: string, page: string, answer: Answer) => {
        await writing.answerDecision(id, page, answer)
        changed({ kind: 'decision', id })
      },
      editImprovement: async (number: number, edit: ImprovementEdit) => {
        await writing.editImprovement(number, edit)
        changed({ kind: 'improvements' })
      },
      deleteImprovement: async (number: number) => {
        await writing.deleteImprovement(number)
        changed({ kind: 'improvements' })
      },
      queueComment: async (thread: NewThread) => {
        await writing.queueComment(thread)
        changed({ kind: 'outbox' })
      },
      queueReply: async (id: string, message: string) => {
        await writing.queueReply(id, message)
        changed({ kind: 'outbox' })
      },
      editQueuedItem: async (number: number, message: string) => {
        await writing.editQueuedItem(number, message)
        changed({ kind: 'outbox' })
      },
      removeQueuedItem: async (number: number) => {
        await writing.removeQueuedItem(number)
        changed({ kind: 'outbox' })
      },
      sendOutbox: async () => {
        const sent = await writing.sendOutbox()
        sent.forEach((thread) => changed({ kind: 'thread', id: thread.id }))
        changed({ kind: 'outbox' })
      },
      editingQueuedItem,
    }
  }, [writing, changed, editingQueuedItem])
}

function tabTitleOf(pageTitle: string | undefined, padTitle: string): string {
  return pageTitle === undefined || pageTitle === padTitle ? padTitle : `${pageTitle} · ${padTitle}`
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
  const outbox = loadedOr(useLoadedValue(pad, revisions.outbox, connection.outbox), emptyOutbox)
  const page = useLoadedValue(file, pageRevisionOf(revisions, file), connection.page)
  const threads = useLoadedValue(file, revisions.threads, connection.threads)
  const viewedPage = route.kind === 'page' ? loadedOr(page, undefined) : undefined
  const padTitle = loadedOr(tracker, undefined)?.title ?? pad
  const address = { section: route.kind === 'page' ? route.section : undefined, navigations }
  const currentSection = useCurrentSection(
    sectionsOf(viewedPage).map((heading) => heading.id),
    address,
  )
  useScrollOnNavigation(
    scrollTargetOf(
      route,
      viewedPage,
      threads.status !== 'loading',
      improvements.status !== 'loading',
    ),
    navigations,
  )
  useEffect(() => {
    document.title = tabTitleOf(viewedPage?.title, padTitle)
  }, [viewedPage?.title, padTitle])

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
  const inboxEntries = nickInboxEntries(addresses, loadedOr(inbox, emptyNickInbox), pageList)
  const breadcrumb = breadcrumbOf(route, viewedPage, pageList, addresses)

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
          onNavigate={navigate}
          actions={
            <TopBarActions
              serverStopped={serverStopped}
              actions={actions}
              inboxEntries={inboxEntries}
              outboxCount={outbox.items.length}
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
        pageContext={{ addresses, onNavigate: navigate, loadPreview }}
        actions={actions}
        navigations={navigations}
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
