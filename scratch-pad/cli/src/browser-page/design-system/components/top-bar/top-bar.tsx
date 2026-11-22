import { Fragment, useEffect, useId, useState, type ReactNode } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import { usePendingAction } from '../../pending-action'
import { Subtree, type FullTreeNode } from '../full-tree/full-tree'
import './top-bar.css'

interface Crumb {
  readonly title: string
  readonly href: string
}

// The subtree of the current page starts at the top level page above the current page.
export interface CurrentSubtree {
  readonly root: FullTreeNode
  readonly currentHref: string
}

interface TopBarProps {
  readonly title: string
  readonly titleHref: string
  readonly parents: readonly Crumb[]
  readonly current: string | undefined
  readonly onNavigate: Navigate
  readonly actions: ReactNode
  readonly subtree?: CurrentSubtree | undefined
  // A small button after the name of the current page, like "Mark as unread"
  readonly pageAction?: PageAction | undefined
}

interface PageAction {
  readonly label: string
  readonly onClick: () => Promise<void>
}

// The problem is shown after the button when the server doesn't accept the page action.
function PageActionButton({ action }: { readonly action: PageAction }) {
  const { pending, problem, run } = usePendingAction(action.onClick)
  return (
    <>
      <button type="button" className="top-bar__page-action" onClick={run} disabled={pending}>
        {action.label}
      </button>
      {problem !== undefined && (
        <span className="top-bar__problem" role="alert" title={problem}>
          {problem}
        </span>
      )}
    </>
  )
}

const subtreeTitle = 'Where you are'

// The subtree is shown while the pointer is on the current page's name or on the subtree, and while the name has the
// focus. Escape hides the subtree until the pointer or the focus comes back. The name is a button so that a keyboard
// and a touch screen can show the subtree too. A click on the name only shows the subtree, because the current page is
// already open.
function CurrentCrumb({
  title,
  subtree,
}: {
  readonly title: string
  readonly subtree: CurrentSubtree
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) {
      return undefined
    }
    // The listener runs in the capture phase, before the listener of MarginLane, and prevents the
    // default so that the same Escape doesn't close an open card in the margin too.
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', closeOnEscape, true)
    return () => document.removeEventListener('keydown', closeOnEscape, true)
  }, [open])
  return (
    <div
      className="top-bar__current"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="top-bar__crumb"
        aria-current="page"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {title}
      </button>
      {open && (
        <div className="top-bar__subtree" id={id}>
          <div className="top-bar__subtree-panel">
            <p className="top-bar__subtree-title">{subtreeTitle}</p>
            <Subtree label={subtreeTitle} root={subtree.root} currentHref={subtree.currentHref} />
          </div>
        </div>
      )}
    </div>
  )
}

export function TopBar({
  title,
  titleHref,
  parents,
  current,
  onNavigate,
  actions,
  subtree,
  pageAction,
}: TopBarProps) {
  const links = [{ title, href: titleHref }, ...parents]
  return (
    <div className="top-bar">
      <nav className="top-bar__crumbs" aria-label="Breadcrumb">
        {current === undefined ? (
          <span className="top-bar__crumb" aria-current="page">
            {title}
          </span>
        ) : (
          <>
            {links.map((link) => (
              <Fragment key={link.href}>
                <a
                  className="top-bar__crumb"
                  href={link.href}
                  onClick={navigationClick(link.href, onNavigate)}
                >
                  {link.title}
                </a>
                <span className="top-bar__separator" aria-hidden="true">
                  /
                </span>
              </Fragment>
            ))}
            {subtree === undefined ? (
              <span className="top-bar__crumb" aria-current="page">
                {current}
              </span>
            ) : (
              <CurrentCrumb title={current} subtree={subtree} />
            )}
          </>
        )}
        {pageAction !== undefined && <PageActionButton key={current} action={pageAction} />}
      </nav>
      <div className="top-bar__actions">{actions}</div>
    </div>
  )
}
