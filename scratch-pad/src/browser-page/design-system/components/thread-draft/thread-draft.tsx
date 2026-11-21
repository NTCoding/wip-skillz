import { MarginCard } from '../margin-card/margin-card'
import { MessageBox } from '../message-box/message-box'
import { ThreadKind, threadKindLabels, type ThreadKindName } from '../thread-kind/thread-kind'
import './thread-draft.css'

interface ThreadDraftProps {
  readonly kind: ThreadKindName
  readonly selectedText: string
  readonly onSend: (text: string) => Promise<void>
  readonly onCancel: () => void
}

const placeholders: Readonly<Record<ThreadKindName, string>> = {
  comment: 'Write a comment…',
  grammar: 'What is wrong with the grammar or the tone?',
  improvement: 'What would make this better?',
}

export function ThreadDraft({ kind, selectedText, onSend, onCancel }: ThreadDraftProps) {
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
        onCancel={onCancel}
        focusOnMount
      />
    </MarginCard>
  )
}
