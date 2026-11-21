import { describe, expect, it } from 'vitest'
import { aDecisionAnswer } from '../decisions/decision-answer-fixtures'
import {
  exportJobAddress,
  missingLinksText,
  servedLinks,
  unservedLinks,
} from '../item-links/item-links-fixtures'
import { aThread } from '../threads/thread-fixtures'
import { nothingPrinted, type AgentInboxSelection } from './agent-inbox'
import { agentInboxText, itemCountText, type AgentInboxTextContext } from './agent-inbox-text'

const context: AgentInboxTextContext = {
  links: servedLinks,
  includeSeen: false,
  pageLines: () => ['# Export job', '', '## Retry policy', '', 'The export job retries 5 times.'],
}

const empty: AgentInboxSelection = {
  printed: [],
  seenBefore: 0,
  sideNotes: [],
  otherItems: [],
  lastPrinted: nothingPrinted,
}

const twoItems: AgentInboxSelection = {
  ...empty,
  printed: [
    {
      kind: 'thread',
      thread: aThread({
        anchor: {
          firstLine: 5,
          lastLine: 5,
          selectedText: 'retries',
          prefix: 'The export job',
          suffix: '5 times.',
        },
      }),
    },
    { kind: 'decision', decision: aDecisionAnswer({}) },
  ],
  sideNotes: [{ type: 'grammar', count: 2 }],
}

describe('agentInboxText', () => {
  it('prints the count, each item and the side notes separated by blank lines', () => {
    expect(agentInboxText(twoItems, context)).toBe(
      [
        '2 new items in 2026-03-14-export-job',
        '',
        '[c-1] comment · pages/index.md:5 · section "Retry policy"',
        `  link: ${exportJobAddress}#c-1`,
        '  selected: "retries"',
        '  Nick: Is 5 retries enough on a slow network?',
        '  block:',
        '    5 | The export job retries 5 times.',
        '',
        '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?"',
        `  link: ${exportJobAddress}#d-1`,
        '  Nick chose: proposal',
        '',
        '2 grammar notes wait for a subagent',
      ].join('\n'),
    )
  })

  it("prints that there aren't any links instead of each link when the server isn't running", () => {
    const lines = agentInboxText(twoItems, { ...context, links: unservedLinks }).split('\n')

    expect([lines[3], lines.at(-1)]).toStrictEqual(['  selected: "retries"', missingLinksText])
  })

  it("doesn't print the line about the links when nothing is printed and the server isn't running", () => {
    expect(agentInboxText(empty, { ...context, links: unservedLinks })).toBe(
      'nothing new in 2026-03-14-export-job',
    )
  })

  it('prints that the items wait for the agent when seen items are included', () => {
    const text = agentInboxText(
      { ...twoItems, printed: twoItems.printed.slice(1) },
      {
        ...context,
        includeSeen: true,
      },
    )

    expect(text.split('\n')[0]).toBe('1 item waits for the agent in 2026-03-14-export-job')
  })

  it('prints that the items wait for the agent in the plural when there are several', () => {
    const text = agentInboxText(twoItems, { ...context, includeSeen: true })

    expect(text.split('\n')[0]).toBe('2 items wait for the agent in 2026-03-14-export-job')
  })

  it('prints nothing new when nothing waits for the agent', () => {
    expect(agentInboxText(empty, context)).toBe('nothing new in 2026-03-14-export-job')
  })

  it('prints how many items were printed before when there is nothing new', () => {
    expect(agentInboxText({ ...empty, seenBefore: 1 }, context)).toBe(
      'nothing new in 2026-03-14-export-job · 1 item printed before (scratch-pad inbox --pad 2026-03-14-export-job --all)',
    )
  })

  it('prints that nothing waits when seen items are included and nothing waits', () => {
    expect(agentInboxText(empty, { ...context, includeSeen: true })).toBe(
      'nothing waits for the agent in 2026-03-14-export-job',
    )
  })

  it('prints the side notes straight after the header when there are no items', () => {
    const selection: AgentInboxSelection = {
      ...empty,
      sideNotes: [
        { type: 'grammar', count: 1 },
        { type: 'improvement', count: 1 },
      ],
    }

    expect(agentInboxText(selection, context)).toBe(
      'nothing new in 2026-03-14-export-job\n1 grammar note and 1 improvement note wait for a subagent',
    )
  })

  it('prints waits in the singular when one side note waits', () => {
    const selection: AgentInboxSelection = {
      ...empty,
      sideNotes: [{ type: 'improvement', count: 1 }],
    }

    expect(agentInboxText(selection, context).split('\n')[1]).toBe(
      '1 improvement note waits for a subagent',
    )
  })
})

describe('the summary line of agentInboxText', () => {
  it('prints the other items that wait for the agent and how to print them when a type was not requested', () => {
    const selection: AgentInboxSelection = {
      ...empty,
      otherItems: [{ type: 'decision', count: 1 }],
    }

    expect(agentInboxText(selection, context).split('\n')[1]).toBe(
      '1 decision waits for the agent (scratch-pad inbox --pad 2026-03-14-export-job --type decision)',
    )
  })

  it('prints the other items and the side notes on one line when both wait', () => {
    const selection: AgentInboxSelection = {
      ...empty,
      otherItems: [
        { type: 'comment', count: 2 },
        { type: 'decision', count: 1 },
      ],
      sideNotes: [{ type: 'grammar', count: 1 }],
    }

    expect(agentInboxText(selection, context).split('\n')[1]).toBe(
      '2 comments and 1 decision wait for the agent (scratch-pad inbox --pad 2026-03-14-export-job --type comment,decision) · 1 grammar note waits for a subagent',
    )
  })
})

describe('itemCountText', () => {
  it('prints the count with the noun of the type', () => {
    expect(itemCountText({ type: 'improvement', count: 3 })).toBe('3 improvement notes')
  })
})
