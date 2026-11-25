import { afterEach, describe, expect, it } from 'vitest'
import { decisionPageTemplate } from '../decision-pages/decision-page'
import { finishedDecisionPage } from '../decision-pages/decision-page-fixtures'
import { missingLinksText } from '../item-links/item-links-fixtures'
import {
  freezeClockAt,
  removeTemporaryHomes,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type Environment } from '../scratch-pads-home/scratch-pads-home'
import { environmentWithScratchPad, runScratchPad, waitReminderText } from './command-line-fixtures'

afterEach(() => {
  removeTemporaryHomes()
})

async function output(argv: readonly string[], environment: Environment): Promise<string> {
  const result = await runScratchPad(argv, environment)
  return `${result.stdout}${result.stderr}`
}

describe('the page command', () => {
  freezeClockAt('2026-03-14T09:30:00.000Z')

  it('writes the template as a sub page and prints the path and the reminder', async () => {
    const environment = environmentWithScratchPad()
    const home = environment['SCRATCH_PADS_HOME']

    expect(await output(['page', 'index', 'retry-wait', '--type=decision'], environment)).toBe(
      [
        `created ${home}/2026-03-14-export-job/pages/1-retry-wait.md (decision d-1, a draft sub page of pages/index.md)`,
        'Write the content of the page. Run ready d-1 to make the page ready for Nick.',
        missingLinksText,
        waitReminderText,
        '',
      ].join('\n'),
    )
  })

  it('writes a blank sub page when the type is missing', async () => {
    const environment = environmentWithScratchPad()
    const home = environment['SCRATCH_PADS_HOME']

    expect(await output(['page', 'index', 'notes'], environment)).toBe(
      [
        `created ${home}/2026-03-14-export-job/pages/1-notes.md (a sub page of pages/index.md)`,
        'Write the content of the page.',
        missingLinksText,
        waitReminderText,
        '',
      ].join('\n'),
    )
  })

  it.each([['--title'], ['--description'], ['--option']])(
    'doesn’t take the option %s because the page is content that the agent writes',
    async (option) => {
      const environment = environmentWithScratchPad()

      expect(
        await output(['page', 'index', 'retry-wait', '--type=decision', option, 'x'], environment),
      ).toContain(option.slice(2))
    },
  )

  it('prints the usage when the file name is missing', async () => {
    expect(
      await output(['page', 'index', '--type', 'decision'], environmentWithScratchPad()),
    ).toContain(
      "The command doesn't take any content. Usage: scratch-pad page <parent> <file-name> [--type=decision].",
    )
  })

  it('accepts the type as --type decision too', async () => {
    const environment = environmentWithScratchPad()

    expect(
      await output(['page', 'index', 'retry-wait', '--type', 'decision'], environment),
    ).toContain('(decision d-1, a draft sub page of pages/index.md)')
  })

  it('lists the valid types when the type is unknown', async () => {
    expect(
      await output(['page', 'index', 'retry-wait', '--type=survey'], environmentWithScratchPad()),
    ).toBe('"survey" isn\'t a type of page. The types are decision.\n')
  })

  it('makes a finished draft ready when the agent runs ready', async () => {
    const environment = environmentWithScratchPad((folder) => {
      writeFileInPad(folder, 'pages/1-idea.md', finishedDecisionPage('d-1'))
    })

    expect(await output(['ready', 'd-1'], environment)).toBe(
      `d-1 is ready. Nick can decide the decision page.\n${missingLinksText}\n${waitReminderText}\n`,
    )
  })

  it('prints the problems of an unfinished draft when the agent runs ready', async () => {
    const environment = environmentWithScratchPad((folder) => {
      writeFileInPad(folder, 'pages/1-idea.md', decisionPageTemplate('d-1'))
    })

    expect(await output(['ready', 'd-1'], environment)).toContain(
      "Decision d-1 isn't ready. Fix these problems and run ready d-1 again:",
    )
  })

  it('lists ready in the help text', async () => {
    expect(await output(['help'], {})).toContain('ready <id>')
  })

  it('lists the command in the help text', async () => {
    expect(await output(['help'], {})).toContain('page <parent> <file-name> [--type=decision]')
  })

  it('prints the problems of a page that is still the template when the agent runs check', async () => {
    const environment = environmentWithScratchPad((folder) => {
      writeFileInPad(folder, 'pages/1-idea.md', decisionPageTemplate('d-1'))
    })

    expect(await output(['check'], environment)).toContain(
      'pages/1-idea.md:4  the page still has the placeholder <title> from the template.',
    )
  })

  it('prints that the parent page doesn’t link to the decision page', async () => {
    const environment = environmentWithScratchPad((folder) => {
      writeFileInPad(folder, 'pages/1-idea.md', finishedDecisionPage('d-1'))
    })

    expect(await output(['check'], environment)).toContain(
      "pages/1-idea.md:1  the decision page isn't linked from its parent page pages/index.md. Add a link to idea.md on the parent page",
    )
  })

  it('leaves the missing parent page to the number problem', async () => {
    const environment = environmentWithScratchPad((folder) => {
      writeFileInPad(folder, 'pages/2.1-idea.md', finishedDecisionPage('d-1'))
    })

    expect(await output(['check'], environment)).not.toContain("isn't linked")
  })

  it('reports that every page is fine when the parent page links to the finished decision page', async () => {
    const environment = environmentWithScratchPad((folder) => {
      writeFileInPad(folder, 'pages/1-idea.md', finishedDecisionPage('d-1'))
      writeFileInPad(folder, 'pages/index.md', '# Export job\n\nRead [the idea](idea.md).\n')
    })

    expect(await output(['check'], environment)).toContain("there aren't any problems in 2 pages")
  })
})
