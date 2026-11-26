import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nickAnswersDecision, nickComments, nickResolves } from '../nick-actions/nick-actions'
import { UnknownPageError } from '../pages/page-markdown'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { threadOnAssignedSubtask } from './agent-commands-fixtures'
import { checkPages } from './check-commands'
import {
  addSubtaskToTracker,
  addTaskToTracker,
  assignTaskInTracker,
  describeSubtaskInTracker,
  describeTaskInTracker,
} from './progress-tracker-commands'
import { unservedLinks } from '../item-links/item-links-fixtures'

afterEach(() => {
  removeTemporaryHomes()
})

function scratchPadWithRetryPage() {
  const folder = exportJobScratchPad(temporaryHome())
  mkdirSync(join(folder.path, 'custom'))
  writeFileInPad(folder, 'custom/retry-steps.html', '<ol><li>retry</li></ol>')
  writeFileInPad(
    folder,
    'pages/1-retry.md',
    [
      '# Retry',
      '',
      'See [the policy](index.md#retry-policy) and [the queue](queue.md).',
      '',
      ':::html file=custom/retry-steps.html',
      ':::',
    ].join('\n'),
  )
  return folder
}

describe('checkPages', () => {
  it('prints the problems of every page and counts them when no page is requested', () => {
    expect(checkPages(scratchPadWithRetryPage(), [], undefined)).toStrictEqual({
      text: [
        "pages/1-retry.md:3  the link points to pages/queue.md, which doesn't exist",
        '1 problem in 2 pages',
      ].join('\n'),
      problemCount: 1,
    })
  })

  it('reports a task reference whose id is not the id of a task on the progress tracker', () => {
    const folder = exportJobScratchPad(temporaryHome())
    addTaskToTracker(folder, 'Build the export job')
    writeFileInPad(folder, 'pages/1-retry.md', '# Retry\n\nPart of <task:t-1>, not <task:t-2>.')

    expect(checkPages(folder, ['retry'], undefined).text.split('\n')).toStrictEqual([
      "pages/1-retry.md:3  the task reference <task:t-2> points to t-2, which isn't a task or a subtask on the progress tracker. Run tasks to list the ids",
      '1 problem in 1 page',
    ])
  })

  it('reports a task reference in the description of a subtask whose id is not on the progress tracker', () => {
    const folder = exportJobScratchPad(temporaryHome())
    addTaskToTracker(folder, 'Build the export job')
    addSubtaskToTracker(folder, 1, 'Retry a failed export', unservedLinks)
    describeSubtaskInTracker(
      folder,
      { task: 1, subtask: 1 },
      '- The [first retry](index.md).\n- The log is <task:t-9>.\n\n:::html file=custom/steps.html\n:::',
      unservedLinks,
    )

    expect(checkPages(folder, [], undefined).text.split('\n')[0]).toBe(
      "the description of subtask 1.1 [t-2]:2  the task reference <task:t-9> points to t-9, which isn't a task or a subtask on the progress tracker. Run tasks to list the ids",
    )
  })

  it("doesn't check the descriptions when a page is requested", () => {
    const folder = exportJobScratchPad(temporaryHome())
    addTaskToTracker(folder, 'Build the export job')
    describeTaskInTracker(folder, 1, '- The log is <task:t-9>.', unservedLinks)
    writeFileInPad(folder, 'pages/1-retry.md', '# Retry\n')

    expect(checkPages(folder, ['retry'], undefined).problemCount).toBe(0)
  })

  it('reports an assigned task with subtasks only when no page is requested', () => {
    const folder = exportJobScratchPad(temporaryHome())
    addTaskToTracker(folder, 'Migrate the orders')
    assignTaskInTracker(folder, 1, { do: 'Run it', why: 'It needs SQL' }, unservedLinks)
    addSubtaskToTracker(folder, 1, 'Run the migration', unservedLinks)
    writeFileInPad(folder, 'pages/1-retry.md', '# Retry\n')

    expect([
      checkPages(folder, [], undefined).text.split('\n')[0],
      checkPages(folder, ['retry'], undefined).problemCount,
    ]).toStrictEqual([
      'the progress tracker  task 1 [t-1] is assigned to Nick but has subtasks. Run subtask assign for each subtask that Nick has to do',
      0,
    ])
  })

  it('accepts a link to a heading that the server adds to the index page', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(
      folder,
      'pages/1-retry.md',
      '# Retry\n\nSee [the pages](index.md#table-of-contents) and [the policy](index.md#retry-policy).',
    )
    expect(checkPages(folder, ['retry'], undefined).problemCount).toBe(0)
  })

  it('reports an open thread whose page the agent has deleted when no page is requested', () => {
    const folder = scratchPadWithRetryPage()
    const anchor = { firstLine: 1, lastLine: 1, selectedText: 'Retry', prefix: '', suffix: '' }
    nickComments(folder, { type: 'comment', page: 'retry', anchor, text: 'Is this page needed?' })
    nickComments(folder, { type: 'comment', page: 'retry', anchor, text: 'Fine.' })
    nickResolves(folder, 'c-2')
    rmSync(join(folder.path, 'pages/1-retry.md'))

    expect(checkPages(folder, [], undefined).text).toBe(
      [
        "pages/retry.md  c-1 is still open on a page that doesn't exist any more. Restore the page or reply to c-1 so that Nick can resolve it in his Inbox",
        '1 problem in 1 page',
      ].join('\n'),
    )
    expect(checkPages(folder, ['index'], undefined).problemCount).toBe(0)
  })

  it("doesn't report an open thread on a task, because the thread isn't on a page", () => {
    const folder = exportJobScratchPad(temporaryHome())
    threadOnAssignedSubtask(folder)

    expect(checkPages(folder, [], undefined).problemCount).toBe(0)
  })

  it("reports the decision when there aren't any headings above the decision", () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(
      folder,
      'pages/1-schedule.md',
      ':::decision d-7\ncontext: The shops close at night.\nproposal: Export at night.\nalternative: Export every hour.\npick: proposal\n:::\n',
    )

    expect(checkPages(folder, ['schedule'], undefined)).toStrictEqual({
      text: [
        "pages/1-schedule.md:1  decision d-7 doesn't have a heading above it (write the question as a heading)",
        '1 problem in 1 page',
      ].join('\n'),
      problemCount: 1,
    })
  })

  it("reports a decision without a context only while Nick hasn't answered the decision", () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(
      folder,
      'pages/1-schedule.md',
      '## When does the job export?\n\n:::decision d-7\nproposal: Export at night.\nalternative: Export every hour.\npick: proposal\n:::\n',
    )
    expect(checkPages(folder, ['schedule'], undefined).text).toBe(
      [
        "pages/1-schedule.md:3  decision d-7 doesn't have a context (write one on the context: line)",
        '1 problem in 1 page',
      ].join('\n'),
    )

    nickAnswersDecision(folder, {
      id: 'd-7',
      page: 'schedule',
      line: 3,
      question: 'When does the job export?',
      answer: { choice: 'proposal' },
    })

    expect(checkPages(folder, ['schedule'], undefined).problemCount).toBe(0)
  })

  it('checks only the requested page when a page is requested', () => {
    expect(checkPages(scratchPadWithRetryPage(), ['index'], undefined)).toStrictEqual({
      text: "there aren't any problems in 1 page",
      problemCount: 0,
    })
  })

  it('passes the full path of each checked page to the prose check when a prose check is set', () => {
    const folder = scratchPadWithRetryPage()
    const result = checkPages(folder, ['index'], (path) => [`${path} has a long sentence`])

    expect(result.text.split('\n')[0]).toBe(
      `pages/index.md  ${join(folder.path, 'pages/index.md')} has a long sentence`,
    )
  })

  it('passes the Markdown of each checked page to the prose check when a prose check is set', () => {
    const result = checkPages(scratchPadWithRetryPage(), ['retry'], (_path, text) => [
      `the page starts with ${text.split('\n')[0]}`,
    ])

    expect(result.text.split('\n')[1]).toBe('pages/1-retry.md  the page starts with # Retry')
  })

  it('checks every requested page once when several pages are requested', () => {
    expect(
      checkPages(scratchPadWithRetryPage(), ['index', 'retry.md', 'retry'], undefined),
    ).toStrictEqual({
      text: [
        "pages/1-retry.md:3  the link points to pages/queue.md, which doesn't exist",
        '1 problem in 2 pages',
      ].join('\n'),
      problemCount: 1,
    })
  })

  it('checks the requested page when another page reads a custom HTML file that is a folder', () => {
    const folder = scratchPadWithRetryPage()
    rmSync(join(folder.path, 'custom/retry-steps.html'))
    mkdirSync(join(folder.path, 'custom/retry-steps.html'))

    expect(checkPages(folder, ['index'], undefined)).toStrictEqual({
      text: "there aren't any problems in 1 page",
      problemCount: 0,
    })
  })

  it('reports the html block when the custom HTML file that the block reads is a folder', () => {
    const folder = scratchPadWithRetryPage()
    rmSync(join(folder.path, 'custom/retry-steps.html'))
    mkdirSync(join(folder.path, 'custom/retry-steps.html'))

    expect(checkPages(folder, ['retry'], undefined).text.split('\n')[1]).toBe(
      "pages/1-retry.md:5  the :::html block reads custom/retry-steps.html, which doesn't exist",
    )
  })

  it("doesn't read the custom HTML files of a page when that page isn't checked", () => {
    const folder = scratchPadWithRetryPage()
    const readCustomFile = vi.spyOn(folder, 'readCustomFile')
    checkPages(folder, ['index'], undefined)

    expect(readCustomFile).not.toHaveBeenCalled()
  })

  it('prints the problems of the numbers in the file names when no page is requested', () => {
    const folder = scratchPadWithRetryPage()
    writeFileInPad(folder, 'pages/notes.md', '# Notes\n')
    writeFileInPad(folder, 'pages/2-retry.md', '# Retry again\n')

    expect(checkPages(folder, [], undefined).text).toBe(
      [
        'pages/2-retry.md  the page has the same name as pages/1-retry.md after its number. Give one of the 2 pages another name',
        "pages/1-retry.md:3  the link points to pages/queue.md, which doesn't exist",
        "pages/notes.md  the page doesn't have a number. Rename the file to <number>-notes.md, where the number is the place of the page in the order",
        '3 problems in 3 pages',
      ].join('\n'),
    )
  })

  it("throws UnknownPageError when the requested page doesn't exist", () => {
    const check = () => checkPages(scratchPadWithRetryPage(), ['index', 'invoice'], undefined)

    expect(check).toThrow(UnknownPageError)
    expect(check).toThrow(
      "There isn't any page called invoice in 2026-03-14-export-job. The pages are: pages/index.md, pages/retry.md",
    )
  })
})
