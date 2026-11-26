import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { navigationClick, type Navigate } from '../../navigation-click'
import { usePendingAction } from '../../pending-action'
import { Button } from '../button/button'
import { Icon } from '../icon/icon'
import { TaskStateLabel, type TaskState } from '../task-state-label/task-state-label'
import './panel-menu.css'

// A link to a section that Nick should read before he decides. The text is the text of the link in
// the context of the decision.
export interface ContextLink {
  readonly href: string
  readonly text: string
}

// The context of a decision, which the Inbox shows under the question. The lead is the first
// paragraph of the context. The links are in the order that Nick should read their sections.
export interface DecisionContext {
  readonly lead: string | undefined
  readonly links: readonly ContextLink[]
}

// A piece of a line of text. A piece with an href is a link. A link to another site opens in a new
// tab.
export interface TextPart {
  readonly text: string
  readonly href?: string | undefined
  readonly external?: boolean | undefined
}

// A task or a subtask that is assigned to Nick. Its heading is its title.
export interface AssignedTask {
  // The id of the task, like t-4
  readonly id: string
  // The number of the task. A subtask has a number like 2.1.
  readonly number: string
  readonly state: TaskState
  // The first line of what Nick has to do, which can contain links
  readonly summary: readonly TextPart[]
  // A task with subtasks takes its state from its subtasks. That's why Nick can't mark it as done.
  readonly canBeDone: boolean
}

// One item in the menu of the Inbox or of the Outbox. A task item is a task or a subtask that is
// assigned to Nick. A page item is a new page. A section item is a page whose sections have changed
// since Nick last read them. A queued item is a comment or a reply in the outbox. Only a decision
// has a context and only a task item has a task.
export interface PanelMenuItem {
  readonly key: string
  readonly href: string
  readonly kind: 'reply' | 'decision' | 'task' | 'page' | 'section' | 'queued'
  readonly heading: string
  readonly where: string
  readonly quote: string | undefined
  readonly last: string | undefined
  readonly time: string | undefined
  readonly shownTime: string | undefined
  readonly context: DecisionContext | undefined
  readonly task?: AssignedTask | undefined
  readonly linkLabel: string | undefined
}

interface PanelMenuProps {
  readonly id: string | undefined
  readonly labelledBy: string
  readonly items: readonly PanelMenuItem[]
  readonly onNavigate: Navigate
  // The menu calls onChoose before it goes to the item that Nick chose.
  readonly onChoose: () => void
  // If Nick presses Tab in the menu, the menu will call onTab. If onTab is undefined, Tab will
  // move the focus to the next control as usual.
  readonly onTab: (() => void) | undefined
  // A menu that opens from a menu button focuses its first item. A menu that a disclosure button
  // shows leaves the focus on that button.
  readonly focusFirstItem: boolean
  // Marks a task item as done. If this is undefined, the menu won't show a button that marks a task
  // item as done.
  readonly onMarkDone?: ((id: string) => Promise<void>) | undefined
  // Moves the focus to the panel that the menu is in. The menu will call it once Nick has marked
  // the only item of the menu as done, because the menu will be removed together with that item.
  readonly focusPanel?: (() => void) | undefined
}

function LinkLabel({ label }: { readonly label: string | undefined }) {
  return (
    label !== undefined && (
      <span className="panel-menu__link">
        {label}
        <Icon name="chevron" />
      </span>
    )
  )
}

function ItemContent({ item }: { readonly item: PanelMenuItem }) {
  return (
    <>
      <span className="panel-menu__dot" data-kind={item.kind} aria-hidden="true" />
      <span className="panel-menu__main">
        <span className="panel-menu__head">
          <span className="panel-menu__what" data-kind={item.kind}>
            {item.heading}
          </span>
          {item.time !== undefined && (
            <time className="panel-menu__time" dateTime={item.time}>
              {item.shownTime}
            </time>
          )}
        </span>
        <span className="panel-menu__where">{item.where}</span>
        {item.quote !== undefined && (
          <span className="panel-menu__quote" data-kind={item.kind}>
            {item.quote}
          </span>
        )}
        {item.context?.lead !== undefined && (
          <span className="panel-menu__lead">{item.context.lead}</span>
        )}
        {item.last !== undefined && <span className="panel-menu__last">{item.last}</span>}
        <LinkLabel label={item.linkLabel} />
      </span>
    </>
  )
}

function contextLinksOf(item: PanelMenuItem): readonly ContextLink[] {
  return item.context?.links ?? []
}

function summaryLinkCount(item: PanelMenuItem): number {
  return (item.task?.summary ?? []).filter((part) => part.href !== undefined).length
}

interface LinkProps {
  readonly ref: (control: HTMLElement | null) => void
  readonly tabIndex: number
  readonly role: string
  readonly href: string
  readonly onClick: (event: MouseEvent<HTMLAnchorElement>) => void
}

interface TaskItemProps {
  readonly item: PanelMenuItem
  readonly task: AssignedTask
  // The position of the task's own link among the links of the menu
  readonly first: number
  readonly linkProps: (index: number, part: TextPart) => LinkProps
}

// The title of a task item is the link to the task. That link is stretched over the whole item so a
// click anywhere on the item opens the task. Each link in the first line of what Nick has to do is
// placed above the link of the task and opens its own page. The arrow keys move the focus to those
// links straight after the link of the task.
function TaskItem({ item, task, first, linkProps }: TaskItemProps) {
  const id = useId()
  const stateId = `${id}-state`
  const summaryId = `${id}-summary`
  const linkIndex = (position: number): number =>
    first + 1 + task.summary.slice(0, position).filter((part) => part.href !== undefined).length
  return (
    <div className="panel-menu__item panel-menu__item--task">
      <span className="panel-menu__dot" data-kind={item.kind} aria-hidden="true" />
      <span className="panel-menu__main">
        <span className="panel-menu__head">
          <a
            className="panel-menu__what panel-menu__task-link"
            {...linkProps(first, { text: item.heading, href: item.href })}
            aria-describedby={`${stateId} ${summaryId}`}
          >
            <span className="panel-menu__number">{task.number}</span> {item.heading}
          </a>
          <span className="panel-menu__state" id={stateId}>
            <TaskStateLabel state={task.state} />
          </span>
        </span>
        <span className="panel-menu__summary" id={summaryId}>
          {task.summary.map((part, position) =>
            part.href === undefined ? (
              <Fragment key={`${String(position)} ${part.text}`}>{part.text}</Fragment>
            ) : (
              <a
                key={`${String(position)} ${part.text}`}
                className="panel-menu__summary-link"
                {...linkProps(linkIndex(position), part)}
              >
                {part.text}
              </a>
            ),
          )}
        </span>
        <LinkLabel label={item.linkLabel} />
      </span>
    </div>
  )
}

// The task of an item that Nick can mark as done in this menu
function taskToMarkDone(
  item: PanelMenuItem,
  onMarkDone: PanelMenuProps['onMarkDone'],
): AssignedTask | undefined {
  return onMarkDone !== undefined && item.task?.canBeDone === true ? item.task : undefined
}

// The links of an item and its button to mark the task as done
function controlCount(item: PanelMenuItem, onMarkDone: PanelMenuProps['onMarkDone']): number {
  return (
    1 +
    contextLinksOf(item).length +
    summaryLinkCount(item) +
    Number(taskToMarkDone(item, onMarkDone) !== undefined)
  )
}

function linkCount(
  items: readonly PanelMenuItem[],
  onMarkDone: PanelMenuProps['onMarkDone'],
): number {
  return items.reduce((count, item) => count + controlCount(item, onMarkDone), 0)
}

// The arrow keys move the focus through every link and every button of the menu. That's the link
// of each item, the links in the context of a decision, the links in the summary of a task and the
// button that marks a task as done. Those links and the button come straight after the link of
// their item. first is the
// position of the item's own link among them.
function withFirstLinks(items: readonly PanelMenuItem[], onMarkDone: PanelMenuProps['onMarkDone']) {
  return items.map((item, index) => ({
    item,
    first: linkCount(items.slice(0, index), onMarkDone),
  }))
}

interface DoneButtonProps {
  readonly item: PanelMenuItem
  readonly task: AssignedTask
  readonly onMarkDone: (id: string) => Promise<void>
  // The focus will be moved away from the button once the task is done, because the item of the
  // task will be removed from the menu then.
  readonly onDone: () => void
  readonly menuItem: {
    readonly ref: (control: HTMLElement | null) => void
    readonly tabIndex: number
  }
  // The element outside the menu that announces a problem, because a menu can only contain its
  // items
  readonly announcer: HTMLElement | null
}

// The button ignores a press until the server has marked the task as done. Then the item will be
// removed from the Inbox. If the server can't mark the task as done, the problem will be shown
// under the button and the focus will stay on the button. The problem that is shown is hidden from
// a screen reader, which reads the problem out from the announcer instead.
function DoneButton({ item, task, onMarkDone, onDone, menuItem, announcer }: DoneButtonProps) {
  const problemId = useId()
  const action = usePendingAction(async () => {
    await onMarkDone(task.id)
    onDone()
  })
  return (
    <div className="panel-menu__actions">
      <Button
        size="small"
        pending={action.pending}
        label={`Mark as done: ${task.number} ${item.heading}`}
        describedBy={action.problem === undefined ? undefined : problemId}
        menuItem={menuItem}
        onClick={action.run}
      >
        <Icon name="check" />
        Mark as done
      </Button>
      {action.problem !== undefined && (
        <>
          <p className="panel-menu__problem" id={problemId} aria-hidden="true">
            {action.problem}
          </p>
          {announcer !== null && createPortal(<p role="alert">{action.problem}</p>, announcer)}
        </>
      )}
    </div>
  )
}

// The menu is only mounted while its panel is open. That's why the first item is focused each
// time the panel opens when focusFirstItem is true. The arrow keys move the focus to the next or
// the previous link. Home moves the focus to the first link and End moves the focus to the last
// link.
export function PanelMenu({
  id,
  labelledBy,
  items,
  onNavigate,
  onChoose,
  onTab,
  focusFirstItem,
  onMarkDone,
  focusPanel,
}: PanelMenuProps) {
  const [chosen, setChosen] = useState(0)
  const [announcer, setAnnouncer] = useState<HTMLElement | null>(null)
  const links = useRef<(HTMLElement | null)[]>([])
  const lastIndex = linkCount(items, onMarkDone) - 1
  // An item can be removed while the menu is open so the current link is never past the last one.
  const current = Math.min(chosen, lastIndex)
  useEffect(() => {
    if (focusFirstItem) {
      links.current[0]?.focus()
    }
  }, [focusFirstItem])
  const focusLink = (index: number): void => {
    setChosen(index)
    links.current[index]?.focus()
  }
  const move = (event: KeyboardEvent<HTMLUListElement>): void => {
    if (event.key === 'Tab') {
      onTab?.()
      return
    }
    const targets: Readonly<Record<string, number>> = {
      ArrowDown: current === lastIndex ? 0 : current + 1,
      ArrowUp: current === 0 ? lastIndex : current - 1,
      Home: 0,
      End: lastIndex,
    }
    const target = targets[event.key]
    if (target === undefined) {
      return
    }
    event.preventDefault()
    focusLink(target)
  }
  const positioned = withFirstLinks(items, onMarkDone)
  // Once a task is done, the focus will move to the link of the next item. That link will take the
  // place of the task's link when the task's item is removed, which is why its index will be first.
  // If the task's item is the last item, the focus will move to the link of the item before. If
  // it's the only item, the focus will move to the panel.
  const focusAfterDone = (position: number, first: number) => (): void => {
    const next = positioned[position + 1]
    const before = positioned[position - 1]
    if (next !== undefined) {
      setChosen(first)
      links.current[next.first]?.focus()
    } else if (before === undefined) {
      focusPanel?.()
    } else {
      focusLink(before.first)
    }
  }
  const menuItemProps = (index: number) => ({
    ref: (control: HTMLElement | null) => {
      links.current[index] = control
    },
    tabIndex: index === current ? 0 : -1,
  })
  const linkProps = (index: number, href: string): LinkProps => ({
    ...menuItemProps(index),
    role: 'menuitem',
    href,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      onChoose()
      navigationClick(href, onNavigate)(event)
    },
  })
  // A link to another site opens in a new tab rather than in the scratch pad.
  const partLinkProps = (index: number, part: TextPart) =>
    part.external === true
      ? {
          ...menuItemProps(index),
          role: 'menuitem',
          href: String(part.href),
          target: '_blank',
          rel: 'noreferrer',
          onClick: onChoose,
        }
      : linkProps(index, String(part.href))
  return (
    <>
      <ul className="panel-menu" id={id} role="menu" aria-labelledby={labelledBy} onKeyDown={move}>
        {positioned.map(({ item, first }, position) => {
          const contextLinks = contextLinksOf(item)
          const task = taskToMarkDone(item, onMarkDone)
          return (
            <li key={item.key} role="none">
              {item.task === undefined ? (
                <a className="panel-menu__item" {...linkProps(first, item.href)}>
                  <ItemContent item={item} />
                </a>
              ) : (
                <TaskItem item={item} task={item.task} first={first} linkProps={partLinkProps} />
              )}
              {contextLinks.length > 0 && (
                <ol className="panel-menu__context" role="group" aria-label="Context">
                  {contextLinks.map((link, linkIndex) => (
                    <li key={`${String(linkIndex)} ${link.href}`} role="none">
                      <a
                        className="panel-menu__context-link"
                        {...linkProps(first + 1 + linkIndex, link.href)}
                      >
                        {link.text}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
              {task !== undefined && onMarkDone !== undefined && (
                <DoneButton
                  item={item}
                  task={task}
                  onMarkDone={onMarkDone}
                  onDone={focusAfterDone(position, first)}
                  menuItem={menuItemProps(first + 1 + contextLinks.length + summaryLinkCount(item))}
                  announcer={announcer}
                />
              )}
            </li>
          )
        })}
      </ul>
      <div ref={setAnnouncer} className="panel-menu__announcer" />
    </>
  )
}
