import { useMemo } from 'react'
import { type Answer, type PadChange, type SectionHash } from './api-responses'
import { type ImprovementEdit } from './design-system/design-system'
import { type PageActions } from './page-with-threads'
import { type QueuedItemActions } from './queued-items'
import { type NewThread, type ScratchPadWriting } from './scratch-pad-connection'

export function usePageActions(
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
      markTaskDone: async (id: string) => {
        await writing.markTaskDone(id)
        changed({ kind: 'progress-tracker' })
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
      markPageRead: async (file: string, sections: readonly SectionHash[]) => {
        await writing.markPageRead(file, sections)
        changed({ kind: 'read-marks' })
      },
      markPageUnread: async (file: string) => {
        await writing.markPageUnread(file)
        changed({ kind: 'read-marks' })
      },
      markSectionRead: async (file: string, section: SectionHash) => {
        await writing.markSectionRead(file, section)
        changed({ kind: 'read-marks' })
      },
      editingQueuedItem,
    }
  }, [writing, changed, editingQueuedItem])
}
