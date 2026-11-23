import { useId, useState } from 'react'
import { type Navigate } from '../../navigation-click'
import { Button } from '../button/button'
import { problemOf } from '../message-box/message-box'
import { PanelMenu } from '../panel-menu/panel-menu'
import { TopBarPanel, type TopBarPanelControls } from '../top-bar-panel/top-bar-panel'
import './outbox.css'

// One comment or reply in the outbox. The href is the address of the item's card on its page,
// where Nick edits or removes the item. The quote is the text that the comment or the thread is
// about.
export interface OutboxEntry {
  readonly key: string
  readonly href: string
  readonly kind: 'comment' | 'reply'
  readonly where: string
  readonly quote: string
  readonly text: string
  readonly time: string
  readonly shownTime: string
}

interface OutboxProps {
  // The count is the number of items that are sent by Send all. If the page can't find the place
  // of an item, the item won't have an entry but it's still in the count.
  readonly count: number
  readonly entries: readonly OutboxEntry[]
  // True while Nick edits an item in the outbox. Send all would send the text that was saved
  // before the edit. That's why Send all is disabled until Nick saves or cancels the edit.
  readonly editing: boolean
  readonly onSendAll: () => Promise<void>
  readonly onNavigate: Navigate
}

const headings = { comment: 'Comment', reply: 'Reply' } as const

function countText(count: number): string {
  if (count === 0) {
    return 'The outbox is empty.'
  }
  return count === 1 ? '1 item is in the outbox.' : `${count} items are in the outbox.`
}

interface OutboxPanelProps extends OutboxProps {
  readonly controls: TopBarPanelControls
}

function OutboxPanel({
  count,
  entries,
  editing,
  onSendAll,
  onNavigate,
  controls,
}: OutboxPanelProps) {
  const id = useId()
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const sendAll = (): void => {
    setPending(true)
    setProblem(undefined)
    onSendAll()
      .then(() => controls.closeAndFocusButton())
      .catch((error: unknown) => setProblem(problemOf(error)))
      .finally(() => setPending(false))
  }
  return (
    <div className="outbox">
      <p className="outbox__text" id={`${id}-title`}>
        {countText(count)}
      </p>
      {entries.length > 0 && (
        <div className="outbox__list">
          <PanelMenu
            id={undefined}
            labelledBy={`${id}-title`}
            items={entries.map((entry) => ({
              key: entry.key,
              href: entry.href,
              kind: 'queued',
              heading: headings[entry.kind],
              where: entry.where,
              quote: entry.quote,
              last: entry.text,
              time: entry.time,
              shownTime: entry.shownTime,
              context: undefined,
              linkLabel: 'Show on the page',
            }))}
            onNavigate={onNavigate}
            onChoose={controls.close}
            onTab={undefined}
            focusFirstItem={true}
          />
        </div>
      )}
      <div className="outbox__foot">
        <Button variant="primary" onClick={sendAll} disabled={count === 0 || editing || pending}>
          Send all
        </Button>
        {editing && <p className="outbox__note">Save or cancel your edit to send the outbox.</p>}
        {problem !== undefined && (
          <p className="outbox__problem" role="alert">
            {problem}
          </p>
        )}
      </div>
    </div>
  )
}

export function Outbox(props: OutboxProps) {
  return (
    <TopBarPanel
      icon="outbox"
      label="Outbox"
      countText={countText(props.count)}
      count={props.count}
      tone="outbox"
    >
      {(controls) => <OutboxPanel {...props} controls={controls} />}
    </TopBarPanel>
  )
}
