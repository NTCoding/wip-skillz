import { type DatabaseSync } from 'node:sqlite'
import { nothingPrinted, type LastPrintedEvents } from '../agent-inbox/agent-inbox'
import { itemTypes } from '../items/item-id'
import { readSavedValues } from './saved-values'

export class StoredAgentInbox {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  readLastPrintedEvents(): LastPrintedEvents {
    return readSavedValues(
      this.db,
      this.padName,
      'agent_inbox',
      'SELECT item_type, last_printed_event FROM agent_inbox',
    ).reduce<LastPrintedEvents>(
      (lastPrinted, saved) => ({
        ...lastPrinted,
        [saved.oneOf('item_type', itemTypes)]: saved.wholeNumber('last_printed_event'),
      }),
      nothingPrinted,
    )
  }

  writeLastPrintedEvents(lastPrinted: LastPrintedEvents): void {
    const upsert = this.db.prepare(
      `INSERT INTO agent_inbox (item_type, last_printed_event) VALUES (?, ?)
       ON CONFLICT (item_type) DO UPDATE SET last_printed_event = excluded.last_printed_event`,
    )
    itemTypes.forEach((type) => upsert.run(type, lastPrinted[type]))
  }
}
