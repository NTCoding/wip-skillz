import { afterEach, describe, expect, it } from 'vitest'
import { checkPages } from '../agent-commands/check-commands'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  runSqlOnPadDb,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { nickInboxItems, pageSummaries, threadsOfPage } from './nick-views'

const time = '2026-03-14T09:30:00.000Z'

afterEach(() => {
  removeTemporaryHomes()
})

describe('a scratch pad of the build before the numbers', () => {
  // That build stored each page under its file name. So a file name with digits and a dash at its
  // start, like 2026-plan.md, is stored with the digits although its id is now pages/plan.md.
  function olderPadWithPlanThread(): ScratchPadFolder {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'pages/2026-plan.md', '# Plan\n\nThe export job will ship in March.\n')
    runSqlOnPadDb(
      folder,
      `INSERT INTO threads (id, type, page, first_line, last_line, selected_text, waits_for)
       VALUES ('c-1', 'comment', 'pages/2026-plan.md', 3, 3, 'in March', 'nick');
       INSERT INTO messages (thread_id, position, author, text, time)
       VALUES ('c-1', 1, 'nick', 'Why March?', '${time}'),
              ('c-1', 2, 'agent', 'The shops asked for March.', '${time}');
       INSERT INTO decisions (id, page, line, question, choice, time)
       VALUES ('d-1', 'pages/2026-plan.md', 5, 'Ship in March?', 'proposal', '${time}');
       INSERT INTO outbox (time, text, page, first_line, last_line, selected_text)
       VALUES ('${time}', 'Is March too late?', 'pages/2026-plan.md', 3, 3, 'in March');
       INSERT INTO outbox (time, text, thread_id) VALUES ('${time}', 'And April?', 'c-1');`,
    )
    return folder
  }

  it('shows the thread on its page in the list of pages, in the threads of the page and in the counts', () => {
    const folder = olderPadWithPlanThread()
    const plan = pageSummaries(folder).find((summary) => summary.file === 'pages/2026-plan.md')

    expect(plan).toMatchObject({
      page: 'pages/plan.md',
      openThreads: 1,
      waitingForNick: { decisions: 0, replies: 1 },
    })
    expect(
      threadsOfPage(folder, '2026-plan.md').map((thread) => [thread.id, thread.position?.kind]),
    ).toStrictEqual([['c-1', 'attached']])
    expect(nickInboxItems(folder).threads.map((thread) => thread.page)).toStrictEqual([
      'pages/plan.md',
    ])
  })

  it("doesn't report the thread as a thread on a missing page in check", () => {
    expect(checkPages(olderPadWithPlanThread(), [], undefined).text).toBe(
      "there aren't any problems in 2 pages",
    )
  })

  it('stores the id of the page for the thread, the decision and the queued comment once the scratch pad is opened', () => {
    const folder = olderPadWithPlanThread()

    expect(
      folder.read((pad) => [
        pad.readThread('c-1').page,
        pad.readDecisionAnswer('d-1').page,
        ...pad.readOutbox().map((item) => (item.kind === 'reply' ? item.thread : item.page)),
      ]),
    ).toStrictEqual(['pages/plan.md', 'pages/plan.md', 'pages/plan.md', 'c-1'])
  })
})
