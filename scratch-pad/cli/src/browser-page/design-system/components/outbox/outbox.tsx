import { useState } from 'react'
import { Button } from '../button/button'
import { problemOf } from '../message-box/message-box'
import { TopBarPanel, type TopBarPanelControls } from '../top-bar-panel/top-bar-panel'
import './outbox.css'

interface OutboxProps {
  readonly count: number
  // True while Nick edits an item in the outbox. Send all would send the text that was saved
  // before the edit, so Send all is disabled until Nick saves or cancels the edit.
  readonly editing: boolean
  readonly onSendAll: () => Promise<void>
}

function countText(count: number): string {
  if (count === 0) {
    return 'The outbox is empty.'
  }
  return count === 1 ? '1 item is in the outbox.' : `${count} items are in the outbox.`
}

interface OutboxPanelProps extends OutboxProps {
  readonly controls: TopBarPanelControls
}

function OutboxPanel({ count, editing, onSendAll, controls }: OutboxPanelProps) {
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
      <p className="outbox__text">{countText(count)}</p>
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
