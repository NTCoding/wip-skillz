import { describe, expect, it } from 'vitest'
import { nothingPrinted } from '../agent-inbox/agent-inbox'
import { exportJobPadName, inMemoryPadDb } from './scratch-pad-folder-fixtures'
import { StoredAgentInbox } from './stored-agent-inbox'

describe('StoredAgentInbox', () => {
  it('reads nothing printed when the agent inbox has not printed anything yet', () => {
    expect(
      new StoredAgentInbox(inMemoryPadDb(), exportJobPadName).readLastPrintedEvents(),
    ).toStrictEqual(nothingPrinted)
  })

  it('reads nothing printed for the other types when only one type was saved', () => {
    const db = inMemoryPadDb()
    db.exec("INSERT INTO agent_inbox (item_type, last_printed_event) VALUES ('grammar', 4)")

    expect(new StoredAgentInbox(db, exportJobPadName).readLastPrintedEvents()).toStrictEqual({
      ...nothingPrinted,
      grammar: 4,
    })
  })

  it('reads back the last printed events when they were written before', () => {
    const stored = new StoredAgentInbox(inMemoryPadDb(), exportJobPadName)
    const lastPrinted = { comment: 7, decision: 6, grammar: 3, improvement: 0 }
    stored.writeLastPrintedEvents(nothingPrinted)
    stored.writeLastPrintedEvents(lastPrinted)

    expect(stored.readLastPrintedEvents()).toStrictEqual(lastPrinted)
  })
})
