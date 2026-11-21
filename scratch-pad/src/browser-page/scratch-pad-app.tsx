import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  type Answer,
  type DecisionLogEntry,
  type NickInbox,
  type PadChange,
  type PageSummary,
  type ProgressTracker,
  type Thread,
  type ViewedPage,
} from './api-responses'
import { scrollTargetOf, useBrowserNavigation, useScrollOnNavigation } from './browser-navigation'
import { type BrowserRoute, type PadAddresses } from './browser-route'
import { useCurrentSection } from './current-section'
import {
  AppFrame,
  Inbox,
  StatusPill,
  TopBar,
  type Navigate,
  type PreviewContent,
} from './design-system/design-system'
import { useLoadedValue, type LoadedValue } from './loaded-value'
import { MissingPageView } from './missing-page-view'
import { nickInboxEntries } from './nick-inbox-entries'
import { PadSidebar, sectionsOf } from './pad-sidebar'
import { PageOutline } from './page-outline'
import { firstRevisions, pageRevisionOf, revisedAfterReconnect, revisedBy } from './pad-revisions'
import { pagePreview } from './page-preview'
import { savedSidebarCollapsed, saveSidebarCollapsed, type SavedSettings } from './saved-settings'
import { PageWithThreads, type PageActions } from './page-with-threads'
import {
  type NewThread,
  type ScratchPadReading,
  type ScratchPadWriting,
} from './scratch-pad-connection'
import { DecisionLogView, LoadingView, ProgressTrackerView } from './tab-views'

interface ScratchPadAppProps {
  readonly pad: string
  readonly addresses: PadAddresses
  readonly connection: ScratchPadReading
  readonly writing: ScratchPadWriting | undefined
  readonly settings: SavedSettings
  readonly narrowWindow: boolean
}

const emptyNickInbox: NickInbox = { threads: [], decisions: [] }

function loadedOr<T>(loaded: LoadedValue<T>, fallback: T): T {
  return loaded.status === 'loaded' ? loaded.value : fallback
}

function currentViewOf(
  route: BrowserRoute,
  viewedPage: ViewedPage | undefined,
): string | undefined {
  if (route.kind === 'progress-tracker') {
    return 'Progress tracker'
  }
  if (route.kind === 'decision-log') {
    return 'Decisions'
  }
  if (route.file === 'index.md') {
    return undefined
  }
  return viewedPage?.title ?? route.file
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
  readonly page: LoadedValue<ViewedPage>
  readonly pages: LoadedValue<PageSummary[]>
  readonly threads: readonly Thread[]
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
  if (page.status === 'failed' && isMissing(props.pages, route.file)) {
    return (
      <MissingPageView
        file={route.file}
        threads={props.inboxThreads.filter((thread) => thread.page === `pages/${route.file}`)}
        actions={actions}
      />
    )
  }
  return page.status === 'loaded' ? (
    <PageWithThreads
      key={page.value.page}
      page={page.value}
      threads={threads}
      context={pageContext}
      actions={actions}
      address={{ section: route.section, navigations: props.navigations }}
    />
  ) : (
    <LoadingView loaded={page} />
  )
}

function usePageActions(
  writing: ScratchPadWriting | undefined,
  changed: (change: PadChange) => void,
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
    }
  }, [writing, changed])
}

function tabTitleOf(pageTitle: string | undefined, padTitle: string): string {
  return pageTitle === undefined || pageTitle === padTitle ? padTitle : `${pageTitle} · ${padTitle}`
}

export function ScratchPadApp(props: ScratchPadAppProps) {
  const { pad, addresses, connection, writing, settings, narrowWindow } = props
  const { route, navigate, navigations } = useBrowserNavigation(addresses.routeOf)
  const [revisions, setRevisions] = useState(firstRevisions)
  const [collapsed, setCollapsed] = useState(() => narrowWindow || savedSidebarCollapsed(settings))
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
  const inbox = useLoadedValue(pad, revisions.nickInbox, connection.nickInbox)
  const page = useLoadedValue(file, pageRevisionOf(revisions, file), connection.page)
  const threads = useLoadedValue(file, revisions.threads, connection.threads)
  const viewedPage = route.kind === 'page' ? loadedOr(page, undefined) : undefined
  const padTitle = loadedOr(tracker, undefined)?.title ?? pad
  const currentSection = useCurrentSection(sectionsOf(viewedPage).map((heading) => heading.id))
  useScrollOnNavigation(
    scrollTargetOf(route, viewedPage, threads.status !== 'loading'),
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
  const actions = usePageActions(writing, changed)
  const changeCollapsed = (next: boolean): void => {
    setCollapsed(next)
    saveSidebarCollapsed(settings, next)
  }
  const pageList = loadedOr(pages, [])
  const inboxEntries = nickInboxEntries(addresses, loadedOr(inbox, emptyNickInbox), pageList)

  return (
    <AppFrame
      sidebarCollapsed={collapsed}
      onSidebarCollapse={() => changeCollapsed(true)}
      topBar={
        <TopBar
          title={padTitle}
          titleHref={addresses.pageHref('index.md')}
          current={currentViewOf(route, viewedPage)}
          onNavigate={navigate}
          actions={
            <>
              {serverStopped && (
                <StatusPill>
                  The server has stopped. The page will update when it’s back.
                </StatusPill>
              )}
              {actions !== undefined && <Inbox entries={inboxEntries} onNavigate={navigate} />}
            </>
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
        page={page}
        pages={pages}
        threads={loadedOr(threads, [])}
        inboxThreads={loadedOr(inbox, emptyNickInbox).threads}
        pageContext={{ addresses, onNavigate: navigate, loadPreview }}
        actions={actions}
        navigations={navigations}
      />
      {viewedPage !== undefined && (
        <PageOutline addresses={addresses} page={viewedPage} onNavigate={navigate} />
      )}
    </AppFrame>
  )
}
