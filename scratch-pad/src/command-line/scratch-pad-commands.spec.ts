import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { commentAndGrammarNoteAndDecision } from '../agent-commands/agent-commands-fixtures'
import { requestLocalServer } from '../local-server/local-request'
import { missingLinksText } from '../item-links/item-links-fixtures'
import {
  exportJobPadName,
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type Environment } from '../scratch-pads-home/scratch-pads-home'
import { builtTool, homeForServer, stopServers } from '../server-process/server-process-fixtures'
import { runCommandLine } from './command-line'
import { environmentWithScratchPad, runScratchPad } from './command-line-fixtures'

afterEach(() => {
  removeTemporaryHomes()
})

function environmentWithItems() {
  return environmentWithScratchPad(commentAndGrammarNoteAndDecision)
}

function environmentWithBrokenLink() {
  return environmentWithScratchPad((folder) => {
    writeFileInPad(folder, 'pages/1-retry.md', '# Retry\n\nSee [the queue](queue.md).\n')
  })
}

async function output(
  argv: readonly string[],
  environment: Environment = environmentWithItems(),
): Promise<string> {
  const result = await runScratchPad(argv, environment)
  return `${result.stdout}${result.stderr}`
}

describe('the scratch-pad commands', () => {
  freezeClockAt('2026-03-14T09:30:00.000Z')

  it('new creates a scratch pad and prints how to select it', async () => {
    const home = temporaryHome()

    expect(await output(['new', 'invoice', 'template'], { SCRATCH_PADS_HOME: home })).toBe(
      [
        `created ${home}/2026-03-14-invoice-template`,
        'select it with --pad 2026-03-14-invoice-template or SCRATCH_PAD=2026-03-14-invoice-template',
        "there aren't any links because the server isn't running (scratch-pad start --pad 2026-03-14-invoice-template)",
        '',
      ].join('\n'),
    )
  })

  it('new prints the usage when the topic is missing', async () => {
    expect(await output(['new'], {})).toBe('The topic is missing. Usage: scratch-pad new <topic>\n')
  })

  it('status prints the counts of both inboxes', async () => {
    const environment = environmentWithItems()

    expect(await output(['status'], environment)).toBe(
      [
        `2026-03-14-export-job · ${environment.SCRATCH_PADS_HOME}/2026-03-14-export-job`,
        missingLinksText,
        'no tasks yet',
        'waiting for the agent: 1 comment, 1 decision, 1 grammar note',
        'waiting for Nick: nothing',
        '',
      ].join('\n'),
    )
  })

  it('inbox prints the comments and the decisions', async () => {
    expect((await output(['inbox'])).split('\n')[0]).toBe('2 new items in 2026-03-14-export-job')
  })

  it('inbox --type prints the requested types', async () => {
    expect((await output(['inbox', '--type', 'grammar'])).split('\n').slice(0, 3)).toStrictEqual([
      '1 new item in 2026-03-14-export-job',
      '',
      '[g-1] grammar note · pages/index.md:5-6 · section "Retry policy"',
    ])
  })

  it('inbox --all prints the items that were printed before', async () => {
    const environment = environmentWithItems()
    await output(['inbox'], environment)

    expect((await output(['inbox', '--all'], environment)).split('\n')[0]).toBe(
      '2 items wait for the agent in 2026-03-14-export-job',
    )
  })

  it('show prints one thread', async () => {
    expect((await output(['show', 'g-1'])).split('\n')[0]).toBe(
      '[g-1] grammar note · pages/index.md:5-6 · section "Retry policy" · waits for the agent',
    )
  })

  it('reply prints that the thread waits for Nick', async () => {
    expect(await output(['reply', 'c-1', 'I raised the limit to 8.'])).toBe(
      `c-1 now waits for Nick\n${missingLinksText}\n`,
    )
  })

  it('done prints that the decision is done', async () => {
    expect(await output(['done', 'd-1', 'Rewrote the section for 8 retries.'])).toBe(
      `d-1 is done\n${missingLinksText}\n`,
    )
  })

  it('done prints that the note is done', async () => {
    expect(await output(['done', 'g-1', 'Changed the verb.'])).toBe(
      `g-1 is done\n${missingLinksText}\n`,
    )
  })

  it('pages lists the pages', async () => {
    expect(await output(['pages'])).toBe(
      `pages/index.md  Export job  2 open threads\n${missingLinksText}\n`,
    )
  })

  it('outline prints the headings of a page', async () => {
    expect(await output(['outline', 'pages/index.md'])).toBe(
      `1  # Export job\n3  ## Retry policy\n${missingLinksText}\n`,
    )
  })

  it('goal prints the goal', async () => {
    expect(await output(['goal', 'Ship', 'the export job.'])).toBe(
      `goal: Ship the export job.\n${missingLinksText}\n`,
    )
  })

  it('task start prints the started task', async () => {
    const environment = environmentWithItems()
    await output(['task', 'add', 'Write the retry policy'], environment)

    expect(await output(['task', 'start', '1'], environment)).toBe(
      `task 1 has started: Write the retry policy\n${missingLinksText}\n`,
    )
  })

  it('task done prints the finished task', async () => {
    const environment = environmentWithItems()
    await output(['task', 'add', 'Write the retry policy'], environment)

    expect(await output(['task', 'done', '1'], environment)).toBe(
      `task 1 is done: Write the retry policy\nno task is left to do\n${missingLinksText}\n`,
    )
  })

  it('task done prints an error when the task is already done', async () => {
    const environment = environmentWithItems()
    await output(['task', 'add', 'Write the retry policy'], environment)
    await output(['task', 'done', '1'], environment)

    expect(await output(['task', 'done', '1'], environment)).toBe(
      'Task 1 is already done. Start it again with the task start command to work on it again.\n',
    )
  })

  it('task done prints the usage when the number is not a number', async () => {
    expect(await output(['task', 'done', 'first'])).toBe(
      '"first" isn\'t a task number. Usage: scratch-pad task done <number>\n',
    )
  })

  it('decide prints the number of the logged decision', async () => {
    expect(await output(['decide', 'Keep 5 retries.'])).toBe(
      `decision 2 is logged\n${missingLinksText}\n`,
    )
  })

  it('decide logs a decision that starts with a dash', async () => {
    expect(await output(['decide', '-5 is too low so keep 8.'])).toBe(
      `decision 2 is logged\n${missingLinksText}\n`,
    )
  })

  it('inbox prints one line for the decision when only comments are requested and a decision waits', async () => {
    expect((await output(['inbox', '--type', 'comment'])).split('\n').at(-4)).toBe(
      '1 decision waits for the agent (scratch-pad inbox --pad 2026-03-14-export-job --type decision) · 1 grammar note waits for a subagent',
    )
  })

  it('tasks lists every task with its state when 2 tasks were added', async () => {
    const environment = environmentWithItems()
    await output(['task', 'add', 'Write the retry policy'], environment)
    await output(['task', 'add', 'Write the invoice template'], environment)

    expect(await output(['tasks'], environment)).toBe(
      `1  to do  Write the retry policy\n2  to do  Write the invoice template\n${missingLinksText}\n`,
    )
  })

  it('check prints the problems and returns 1 when a page has a broken link', async () => {
    expect(await runScratchPad(['check'], environmentWithBrokenLink())).toStrictEqual({
      exitCode: 1,
      stdout:
        "pages/1-retry.md:3  the link points to pages/queue.md, which doesn't exist\n1 problem in 2 pages\n",
      stderr: '',
    })
  })

  it("check returns 0 when the checked page doesn't have any problems", async () => {
    expect(await runScratchPad(['check', 'index.md'], environmentWithBrokenLink())).toStrictEqual({
      exitCode: 0,
      stdout: "there aren't any problems in 1 page\n",
      stderr: '',
    })
  })

  it('check prints the problems of the second page when 2 pages are given', async () => {
    expect(
      await runScratchPad(['check', 'index.md', 'retry.md'], environmentWithBrokenLink()),
    ).toStrictEqual({
      exitCode: 1,
      stdout:
        "pages/1-retry.md:3  the link points to pages/queue.md, which doesn't exist\n1 problem in 2 pages\n",
      stderr: '',
    })
  })

  it("check prints an error when SCRATCH_PAD_PROSE_CHECK points at a file that doesn't exist", async () => {
    const environment = environmentWithItems()
    const executable = join(environment.SCRATCH_PADS_HOME, 'missing.sh')

    expect(
      (await runScratchPad(['check'], { ...environment, SCRATCH_PAD_PROSE_CHECK: executable }))
        .stderr,
    ).toBe(
      `SCRATCH_PAD_PROSE_CHECK is ${executable}, which can't be run (spawnSync ${executable} ENOENT). Point it at an executable or unset it.\n`,
    )
  })

  it('export prints the file that --out names when the scratch pad is exported', async () => {
    const environment = environmentWithItems()
    const file = join(environment.SCRATCH_PADS_HOME, 'export-job.html')

    expect(await output(['export', '--out', file], environment)).toBe(
      `exported 1 page and 2 threads to ${file}\n`,
    )
  })

  it('export writes export.html in the scratch pad when --out isn’t given', async () => {
    const environment = environmentWithItems()

    expect(await output(['export'], environment)).toBe(
      `exported 1 page and 2 threads to ${join(environment.SCRATCH_PADS_HOME, environment.SCRATCH_PAD, 'export.html')}\n`,
    )
  })
})

describe('the server commands and wait', () => {
  const toolCommand = builtTool()

  afterEach(async () => {
    await stopServers()
  })

  async function startServer(environment: Environment): Promise<string> {
    const result = await runScratchPad(['start', '--port', '0'], environment, {
      toolCommand: toolCommand(),
    })
    return result.stdout
  }

  function exportJobHome(): string {
    const home = homeForServer()
    exportJobScratchPad(home)
    return home
  }

  it('start prints the address of the selected scratch pad when the server starts', async () => {
    const home = exportJobHome()

    await expect(
      startServer({ SCRATCH_PADS_HOME: home, SCRATCH_PAD: exportJobPadName }),
    ).resolves.toMatch(/^started the server: http:\/\/127\.0\.0\.1:\d+\/2026-03-14-export-job\/\n$/)
  })

  it.each([{ SCRATCH_PAD: '' }, {}])(
    'start prints the home address of the running server when the selection is %j',
    async (selection) => {
      const home = exportJobHome()
      const address = (await startServer({ SCRATCH_PADS_HOME: home })).split(': ')[1]

      await expect(startServer({ SCRATCH_PADS_HOME: home, ...selection })).resolves.toBe(
        `the server is already running: ${address}`,
      )
    },
  )

  it('stop prints the address of the stopped server when the server runs', async () => {
    const home = exportJobHome()
    const address = (await startServer({ SCRATCH_PADS_HOME: home })).split(': ')[1]

    await expect(runScratchPad(['stop'], { SCRATCH_PADS_HOME: home })).resolves.toMatchObject({
      stdout: `stopped the server on ${address}`,
    })
  })

  it('status prints the address of the scratch pad in the browser when the server runs', async () => {
    const home = exportJobHome()
    const address = (await startServer({ SCRATCH_PADS_HOME: home })).split(': ')[1]

    await expect(
      runScratchPad(['status'], { SCRATCH_PADS_HOME: home, SCRATCH_PAD: exportJobPadName }),
    ).resolves.toMatchObject({
      stdout: expect.stringContaining(`\nin the browser: ${address?.trim()}${exportJobPadName}/\n`),
    })
  })

  it('prints the link of each item when the server runs', async () => {
    const home = exportJobHome()
    const address = (await startServer({ SCRATCH_PADS_HOME: home })).split(': ')[1]?.trim()
    const pad = `${address}${exportJobPadName}/`
    const environment = { SCRATCH_PADS_HOME: home, SCRATCH_PAD: exportJobPadName }
    const linkOf = async (argv: readonly string[]) =>
      (await runScratchPad(argv, environment)).stdout.split('\n').at(-2)

    await expect(linkOf(['pages'])).resolves.toBe(
      `pages/index.md  Export job  no open threads  ${pad}`,
    )
    await expect(linkOf(['tasks'])).resolves.toBe(`link: ${pad}progress-tracker`)
    await expect(linkOf(['decide', 'Keep 5 retries.'])).resolves.toBe(`link: ${pad}decisions`)
    await expect(linkOf(['new', 'invoice template'])).resolves.toMatch(
      /^link: http:\/\/127\.0\.0\.1:\d+\/\d{4}-\d{2}-\d{2}-invoice-template\/$/,
    )
  })

  it("stop prints that the server isn't running when no server runs", async () => {
    await expect(
      runScratchPad(['stop'], { SCRATCH_PADS_HOME: temporaryHome() }),
    ).resolves.toMatchObject({ stdout: "the server isn't running\n" })
  })

  it('serve prints the address and writes a failure of the server to the error stream', async () => {
    const home = temporaryHome()
    mkdirSync(join(exportJobScratchPad(home).path, 'pages', 'queue.md'))
    const stopping = new AbortController()
    const output = { stdout: '', stderr: '' }
    await runCommandLine({
      argv: ['serve', '--port', '0'],
      environment: { SCRATCH_PADS_HOME: home },
      stdout: { write: (text: string) => (output.stdout += text) },
      stderr: { write: (text: string) => (output.stderr += text) },
      toolCommand: toolCommand(),
      stopSignal: stopping.signal,
    })
    const port = Number(/127\.0\.0\.1:(\d+)/.exec(output.stdout)?.[1])

    await requestLocalServer(port, {
      method: 'GET',
      path: `/api/scratch-pads/${exportJobPadName}/pages/queue.md`,
      headers: {},
      body: '',
      timeoutMilliseconds: 2000,
    })
    stopping.abort()

    expect(output.stdout).toBe(`serving the scratch pads in ${home} on http://127.0.0.1:${port}/\n`)
    expect(output.stderr).toMatch(/^The server failed: Error: EISDIR/)
  })

  it('wait prints the new items once Nick has been quiet for the quiet time', async () => {
    await expect(
      runScratchPad(['wait', '--quiet', '0'], environmentWithItems()),
    ).resolves.toMatchObject({
      stdout: expect.stringMatching(/^2 new items in 2026-03-14-export-job\n/),
    })
  })

  it('wait prints that the wait ended when the timeout is up before a new item arrives', async () => {
    await expect(
      runScratchPad(['wait', '--timeout', '0.05'], environmentWithScratchPad()),
    ).resolves.toMatchObject({
      stdout: 'the wait ended before a new item arrived in 2026-03-14-export-job\n',
    })
  })
})
