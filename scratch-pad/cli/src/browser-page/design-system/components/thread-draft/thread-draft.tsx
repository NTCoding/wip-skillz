import { MarginCard } from '../margin-card/margin-card'
import { MessageBox } from '../message-box/message-box'
import { ThreadKind, threadKindLabels, type ThreadKindName } from '../thread-kind/thread-kind'
import './thread-draft.css'

interface ThreadDraftProps {
  readonly kind: ThreadKindName
  readonly selectedText: string
  readonly onSend: (text: string) => Promise<void>
  readonly onAddToOutbox?: ((text: string) => Promise<void>) | undefined
  readonly onCancel: () => void
}

const placeholders: Readonly<Record<ThreadKindName, string>> = {
  comment: 'Write a comment…',
  grammar: 'What is wrong with the grammar or the tone?',
  improvement: 'What would make this better?',
}

export function ThreadDraft(props: ThreadDraftProps) {
  const { kind, selectedText, onSend, onAddToOutbox, onCancel } = props
  return (
    <MarginCard label={`New ${threadKindLabels[kind].toLowerCase()}`} kind={kind} active>
      <ThreadKind kind={kind} />
      {selectedText !== '' && (
        <blockquote className="thread-draft__quote" data-kind={kind}>
          {selectedText}
        </blockquote>
      )}
      <MessageBox
        label={placeholders[kind]}
        submitLabel="Send"
        onSubmit={onSend}
        secondSubmit={
          onAddToOutbox === undefined
            ? undefined
            : { label: 'Add to outbox', onSubmit: onAddToOutbox }
        }
        onCancel={onCancel}
        focusOnMount
      />
    </MarginCard>
  )
}
