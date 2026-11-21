import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { logImprovementFromChat } from '../agent-commands/improvement-commands'
import { finishItem } from '../agent-commands/thread-commands'
import { unservedLinks } from '../item-links/item-links-fixtures'
import { nickComments } from '../nick-actions/nick-actions'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { retryAnchor } from '../threads/thread-fixtures'
import { improvementsOf } from './nick-views'

const time = '2026-03-14T09:30:00.000Z'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

describe('improvementsOf', () => {
  it('returns the improvements of the agent with their details rendered as HTML', () => {
    const folder = exportJobScratchPad(temporaryHome())
    logImprovementFromChat(folder, 'The export skips the custom files.', '', unservedLinks)
    logImprovementFromChat(
      folder,
      'The inbox prints a note twice.',
      'Run `inbox`. See [retry](retry.md).',
      unservedLinks,
    )

    expect(improvementsOf(folder).improvements).toStrictEqual([
      {
        number: 1,
        time,
        title: 'The export skips the custom files.',
        details: undefined,
        html: undefined,
        links: [],
      },
      {
        number: 2,
        time,
        title: 'The inbox prints a note twice.',
        details: 'Run `inbox`. See [retry](retry.md).',
        html: '<p data-lines="1-1">Run <code>inbox</code>. See <a href="retry.md">retry</a>.</p>\n',
        links: [
          { kind: 'page', href: 'retry.md', page: 'pages/retry.md', headingId: undefined, line: 1 },
        ],
      },
    ])
  })

  it('returns the HTML of the custom file when the details have an html block that reads a file', () => {
    const folder = exportJobScratchPad(temporaryHome())
    mkdirSync(join(folder.path, 'custom'))
    writeFileInPad(folder, 'custom/retry-steps.html', '<ol><li>Retry the export.</li></ol>')
    logImprovementFromChat(
      folder,
      'The export skips the custom files.',
      ':::html file=custom/retry-steps.html\n:::\n',
      unservedLinks,
    )

    expect(improvementsOf(folder).improvements[0]?.html).toContain(
      '<ol><li>Retry the export.</li></ol>',
    )
  })

  it('renders the headings of the details without ids when 2 improvements have the same heading', () => {
    const folder = exportJobScratchPad(temporaryHome())
    logImprovementFromChat(
      folder,
      'The export skips the custom files.',
      '## Steps\n',
      unservedLinks,
    )
    logImprovementFromChat(folder, 'The inbox prints a note twice.', '## Steps\n', unservedLinks)

    expect(
      improvementsOf(folder).improvements.map((improvement) => improvement.html),
    ).toStrictEqual(['<h2 data-lines="1-1">Steps</h2>\n', '<h2 data-lines="1-1">Steps</h2>\n'])
  })

  it('returns the grammar notes and the improvement notes of Nick without his comments', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickComments(folder, {
      type: 'comment',
      page: 'pages/index.md',
      anchor: retryAnchor,
      text: 'Is 5 enough?',
    })
    nickComments(folder, {
      type: 'grammar',
      page: 'pages/index.md',
      anchor: retryAnchor,
      text: 'Write "retries" in full.',
    })
    nickComments(folder, {
      type: 'improvement',
      page: 'pages/index.md',
      anchor: undefined,
      text: 'Show the tasks on the index page.',
    })

    expect(improvementsOf(folder).notes).toStrictEqual([
      {
        id: 'g-1',
        type: 'grammar',
        page: 'pages/index.md',
        text: 'Write "retries" in full.',
        time,
        outcome: undefined,
      },
      {
        id: 'i-1',
        type: 'improvement',
        page: 'pages/index.md',
        text: 'Show the tasks on the index page.',
        time,
        outcome: undefined,
      },
    ])
  })

  it('returns the outcome of a note when the agent has closed the note with done', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickComments(folder, {
      type: 'improvement',
      page: 'pages/index.md',
      anchor: undefined,
      text: 'Show the tasks on the index page.',
    })
    finishItem(folder, 'i-1', 'Added the tasks to the index page.', unservedLinks)

    expect(improvementsOf(folder).notes.map((note) => note.outcome)).toStrictEqual([
      'Added the tasks to the index page.',
    ])
  })
})
