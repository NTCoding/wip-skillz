import { describe, expect, it } from 'vitest'
import { decisionPageTemplate, optionHeadingOf, readyDecisionPageIds } from './decision-page'
import {
  decisionPageFile,
  finishedDecisionPage,
  renderedDecisionPage,
} from './decision-page-fixtures'

function problemsOf(markdown: string): string[] {
  return (renderedDecisionPage(markdown).decisionPage?.problems ?? []).map(
    (problem) => `${problem.line}: ${problem.text}`,
  )
}

function changed(markdown: string, from: string, to: string): string {
  return markdown.replace(from, to)
}

const page = finishedDecisionPage()

describe('decisionPageTemplate', () => {
  it('has the marker with the id, the 3 sections and one option', () => {
    expect(decisionPageTemplate('d-4')).toBe(
      [
        ':::decision-page d-4',
        ':::',
        '',
        '# <title>',
        '<description>',
        '',
        '## Context',
        '<the problem or goal, explained with examples>',
        '',
        '## Options',
        '',
        '<Write one "### Option N: name" section for each option. Add as many as the decision needs. There have to be at least 2. Delete this line.>',
        '',
        '### Option 1: <name>',
        '<prose>',
        '',
        '## Agent recommendation',
        '<which option and why>',
        '',
      ].join('\n'),
    )
  })

  it('is a broken page that reports every placeholder and the missing second option', () => {
    expect(problemsOf(decisionPageTemplate('d-4'))).toStrictEqual([
      '4: the page has fewer than 2 options. A decision needs at least 2 options',
      '4: the page still has the placeholder <title> from the template. Replace the placeholder with real content',
      '5: the page still has the placeholder <description> from the template. Replace the placeholder with real content',
      '8: the page still has the placeholder <the problem or goal, explained with examples> from the template. Replace the placeholder with real content',
      '12: the page still has the instruction line from the template. Delete the line',
      '14: the page still has the placeholder <name> from the template. Replace the placeholder with real content',
      '15: the page still has the placeholder <prose> from the template. Replace the placeholder with real content',
      '18: the page still has the placeholder <which option and why> from the template. Replace the placeholder with real content',
    ])
  })
})

describe('a decision page that the agent has finished', () => {
  it('doesn’t have a problem and has the decision with an option for each option on the page', () => {
    const rendered = renderedDecisionPage(page)

    expect(rendered.problems).toStrictEqual([])
    expect(rendered.decisions).toStrictEqual([
      {
        id: 'd-4',
        firstLine: 4,
        lastLine: 30,
        question: 'How long should a retry wait?',
        context: undefined,
        proposal: undefined,
        alternative: undefined,
        pick: undefined,
        options: [
          { choice: 'option-1', label: 'Option 1: Wait 30 seconds' },
          { choice: 'option-2', label: 'Option 2: Double the wait' },
        ],
      },
    ])
  })

  it('has no limit on the number of options', () => {
    const more = changed(
      page,
      '## Agent recommendation',
      '### Option 3: Wait 5 minutes\nEach retry waits 5 minutes.\n\n### Option 4: Stop\nNo retry.\n\n## Agent recommendation',
    )

    expect(
      renderedDecisionPage(more).decisions[0]?.options?.map((option) => option.choice),
    ).toStrictEqual(['option-1', 'option-2', 'option-3', 'option-4'])
  })

  it('shows the status under the title and before the text of the page', () => {
    const { html } = renderedDecisionPage(page)

    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('class="decision-page-status"'))
    expect(html.indexOf('class="decision-page-status"')).toBeLessThan(
      html.indexOf('<h2 data-lines="7-7"'),
    )
  })

  it('shows a table of contents that lists the options under the Options section', () => {
    expect(renderedDecisionPage(page).html).toContain(
      '<nav class="decision-page-contents"><ul><li><a href="#context">Context</a></li><li><a href="#options">Options</a><ul><li><a href="#option-1-wait-30-seconds">Option 1: Wait 30 seconds</a></li><li><a href="#option-2-double-the-wait">Option 2: Double the wait</a></li></ul></li><li><a href="#agent-recommendation">Agent recommendation</a></li><li><a href="#decision">Decision</a></li></ul></nav>',
    )
  })

  it('shows the Decision section with an option for each option at the end of the page', () => {
    const { html, headings } = renderedDecisionPage(page)

    expect(html.endsWith('</div>\n')).toBe(true)
    expect(html).toContain('<h2 id="decision">Decision</h2>')
    expect(html).toContain(
      '<p class="decision-option" data-choice="option-2">Option 2: Double the wait</p>',
    )
    expect(headings.at(-1)).toStrictEqual({ level: 2, text: 'Decision', id: 'decision', line: 31 })
  })

  it('links every entry of the table of contents to a heading of the page', () => {
    const { links } = renderedDecisionPage(page)

    expect(
      links.filter((link) => link.kind === 'page' && link.page === decisionPageFile),
    ).toHaveLength(6)
  })

  it('gives the Decision heading the next free id when the agent has a heading with the same id', () => {
    const { headings } = renderedDecisionPage(
      changed(
        page,
        'Each retry waits 30 seconds.',
        'Each retry waits 30 seconds.\n\n#### Decision\nText.',
      ),
    )

    expect(headings.at(-1)?.id).toBe('decision-2')
  })

  it('escapes the name of an option in the table of contents and in the options', () => {
    const { html } = renderedDecisionPage(
      changed(page, 'Wait 30 seconds', 'Wait "30" & <b>seconds</b>'),
    )

    expect(html).toContain('Option 1: Wait &quot;30&quot; &amp; &lt;b&gt;seconds&lt;/b&gt;')
  })

  it('allows other text in angle brackets in prose, in code and in a link', () => {
    const withBrackets = changed(
      page,
      'Each retry waits 30 seconds.',
      'The export returns a List<Invoice> today. Each retry waits `<30>` seconds, as in <https://example.com/wait>.\n\n```\nList<Invoice> invoices = <name>;\n```',
    )

    expect(problemsOf(withBrackets)).toStrictEqual([
      '16: the page still has the placeholder <name> from the template. Replace the placeholder with real content',
    ])
  })

  it('reports a placeholder of the template in code and in an option that only has the placeholder', () => {
    const withPlaceholder = changed(page, 'Each retry waits 30 seconds.', '`<prose>`')

    expect(problemsOf(withPlaceholder)).toStrictEqual([
      '13: the page still has the placeholder <prose> from the template. Replace the placeholder with real content',
    ])
  })
})

describe('a broken decision page', () => {
  it('doesn’t have a decision and shows the problems under the marker', () => {
    const broken = renderedDecisionPage(
      changed(page, '### Option 2: Double the wait', '### Second idea'),
    )

    expect(broken.decisions).toStrictEqual([])
    expect(broken.html).toContain('<p class="named-block-warning">')
    expect(broken.html).not.toContain('decision-page-status')
    expect(broken.html).not.toContain('<h2 id="decision">')
  })

  it.each([
    [
      'the title is missing',
      changed(page, '# How long should a retry wait?\n', ''),
      ["1: the page doesn't have a title. Write the title as a # heading"],
    ],
    [
      'the title is written twice',
      changed(page, '## Agent recommendation', '# Another title\n## Agent recommendation'),
      ['28: the page has more than one # heading. Write the title once'],
    ],
    [
      'the description is missing',
      changed(
        page,
        'The export job retries a failed upload. This page decides the wait between 2 retries.\n',
        '',
      ),
      ["4: the title doesn't have a description under it"],
    ],
    [
      'the Context section is missing',
      changed(
        page,
        '## Context\nA shop with a slow network fails an upload in the evening. For example, shop 12 fails 3 times a week.\n\n',
        '',
      ),
      [
        '4: the "Context" section is missing. The sections are Context, Options and Agent recommendation',
      ],
    ],
    [
      'a section is renamed',
      changed(page, '## Agent recommendation', '## Recommendation'),
      [
        '4: the "Agent recommendation" section is missing. The sections are Context, Options and Agent recommendation',
        '28: the section "Recommendation" isn\'t one of the sections. The sections are Context, Options and Agent recommendation',
      ],
    ],
    [
      'a section is written twice',
      changed(page, '## Agent recommendation', '## Context\nMore.\n\n## Agent recommendation'),
      ['4: the "Context" section is written twice'],
    ],
    [
      'the sections are out of order',
      changed(
        changed(page, '## Context', '## Agent recommendation\nOption 2.\n\n## Context'),
        '\n## Agent recommendation\nOption 2, because a slow network needs more time.\n',
        '',
      ),
      ['4: the sections are out of order. The order is Context, Options and Agent recommendation'],
    ],
    [
      'the Context section is empty',
      changed(
        page,
        'A shop with a slow network fails an upload in the evening. For example, shop 12 fails 3 times a week.\n',
        '',
      ),
      ['7: the "Context" section doesn\'t have any text'],
    ],
    [
      'the recommendation is empty',
      changed(page, 'Option 2, because a slow network needs more time.\n', ''),
      ['28: the "Agent recommendation" section doesn\'t have any text'],
    ],
    [
      'there is only one option',
      page.replace(/### Option 2[\s\S]*?(?=## Agent recommendation)/u, ''),
      ['4: the page has fewer than 2 options. A decision needs at least 2 options'],
    ],
    [
      'an option heading has no name',
      changed(page, '### Option 2: Double the wait', '### Double the wait'),
      [
        '4: the page has fewer than 2 options. A decision needs at least 2 options',
        '15: "Double the wait" isn\'t an option heading. Write the heading as ### Option 2: name',
      ],
    ],
    [
      'the options are numbered out of order',
      changed(page, '### Option 2: Double the wait', '### Option 3: Double the wait'),
      [
        '15: the option is numbered 3 but it is option 2. Number the options 1, 2, 3 and so on in order',
      ],
    ],
    [
      'an option has no text',
      changed(page, 'Each retry waits 30 seconds.\n', ''),
      ['12: "Option 1: Wait 30 seconds" doesn\'t have any text. Describe the option'],
    ],
  ])('reports the problem when %s', (_name, markdown, expected) => {
    expect(problemsOf(markdown)).toStrictEqual(expected)
  })

  it('reports a marker without an id and a second marker', () => {
    const marked = changed(
      page,
      ':::decision-page d-4\n:::\n',
      ':::decision-page\n:::\n\n:::decision-page d-5\n:::\n',
    )

    expect(problemsOf(marked)).toStrictEqual([
      "1: the decision page doesn't have an id (write :::decision-page d-1)",
      '4: the page has more than one :::decision-page marker',
    ])
  })

  it('reports only the missing section when the Options section is missing', () => {
    expect(
      problemsOf(page.replace(/## Options[\s\S]*?(?=## Agent recommendation)/u, '')),
    ).toStrictEqual([
      '4: the "Options" section is missing. The sections are Context, Options and Agent recommendation',
    ])
  })
})

describe('a draft decision page', () => {
  const draft = renderedDecisionPage(page, decisionPageFile, new Set())

  it('shows the status Draft under the title without a table of contents or a Decision section', () => {
    expect(draft.draft).toBe(true)
    expect(draft.html).toContain(
      '<p class="decision-page-status" data-decision="d-4" data-state="draft"></p>',
    )
    expect(draft.html).not.toContain('decision-page-contents')
    expect(draft.html).not.toContain('decision-page-decision')
  })

  it('doesn’t have a decision and doesn’t add a heading', () => {
    expect(draft.decisions).toStrictEqual([])
    expect(draft.headings.map((heading) => heading.text)).not.toContain('Decision')
  })

  it('keeps the problems of the template out of the page but reports them to the check', () => {
    const unfinished = renderedDecisionPage(
      decisionPageTemplate('d-4'),
      decisionPageFile,
      new Set(),
    )

    expect(unfinished.html).not.toContain('named-block-warning')
    expect(unfinished.problems).toHaveLength(8)
  })

  it('is ready when the set of ready decision pages has the id', () => {
    const ready = renderedDecisionPage(page, decisionPageFile, new Set(['d-4']))

    expect([ready.draft, ready.decisions.map((decision) => decision.id)]).toStrictEqual([
      false,
      ['d-4'],
    ])
  })

  it('keeps the decision of a ready page that has a problem now', () => {
    const broken = renderedDecisionPage(
      changed(page, '### Option 2: Double the wait', '### Second idea'),
      decisionPageFile,
      new Set(['d-4']),
    )

    expect(broken.problems.length).toBeGreaterThan(0)
    expect(broken.decisions.map((decision) => decision.options?.length)).toStrictEqual([1])
  })

  it('names the decision after its id when a ready page doesn’t have a title any more', () => {
    const untitled = renderedDecisionPage(
      changed(page, '# How long should a retry wait?', ''),
      decisionPageFile,
      new Set(['d-4']),
    )

    expect(untitled.decisions.map((decision) => decision.question)).toStrictEqual(['Decision d-4'])
  })

  it('stays a draft when only another decision page is ready', () => {
    expect(renderedDecisionPage(page, decisionPageFile, new Set(['d-5'])).draft).toBe(true)
  })

  it('isn’t a draft when the marker doesn’t have an id', () => {
    const noId = renderedDecisionPage(changed(page, 'd-4', ''), decisionPageFile, new Set())

    expect(noId.draft).toBe(false)
  })
})

describe('readyDecisionPageIds', () => {
  it('returns the ids of the decision-ready events and leaves out every other event', () => {
    expect(
      readyDecisionPageIds([
        { kind: 'decision-ready', item: 'd-4' },
        { kind: 'decision-ready', item: undefined },
        { kind: 'decision-answered', item: 'd-5' },
        { kind: 'decision-ready', item: 'd-6' },
      ]),
    ).toStrictEqual(new Set(['d-4', 'd-6']))
  })
})

describe('a decision page that only has a title and a description', () => {
  it('reports the 3 sections that are missing', () => {
    expect(
      problemsOf(':::decision-page d-4\n:::\n\n# A title\nA description.\n').map((text) =>
        text.slice(0, text.indexOf('.')),
      ),
    ).toStrictEqual([
      '4: the "Context" section is missing',
      '4: the "Options" section is missing',
      '4: the "Agent recommendation" section is missing',
    ])
  })
})

describe('a page without the marker', () => {
  it('isn’t a decision page', () => {
    const plain = renderedDecisionPage(changed(page, ':::decision-page d-4\n:::\n', ''))

    expect([plain.decisionPage, plain.decisions]).toStrictEqual([undefined, []])
  })
})

describe('optionHeadingOf', () => {
  const lines = ['## Options', '### Option 1: Wait 30 seconds', '### Option 2: Double the wait  ']

  it('returns the heading of the option that the choice stands for', () => {
    expect(optionHeadingOf(lines, 'option-2')).toBe('Option 2: Double the wait')
  })

  it('returns nothing for a choice of an inline block or an option that the page doesn’t have', () => {
    expect(optionHeadingOf(lines, 'proposal')).toBeUndefined()
    expect(optionHeadingOf(lines, 'option-3')).toBeUndefined()
  })
})
