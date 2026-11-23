import { describe, expect, it } from 'vitest'
import {
  decisionLogLink,
  improvementLink,
  improvementsLink,
  itemLinks,
  linkLines,
  padLink,
  pageLink,
  progressTrackerLink,
  serverOrigin,
  taskLink,
  textWithLink,
  withLinksNote,
} from './item-links'
import {
  exportJobAddress,
  missingLinksText,
  servedLinks,
  unservedLinks,
} from './item-links-fixtures'

describe('serverOrigin', () => {
  it('returns the origin of the server on the port', () => {
    expect(serverOrigin(4822)).toBe('http://127.0.0.1:4822')
  })
})

describe('itemLinks', () => {
  it("doesn't have an origin when the server isn't running", () => {
    expect(itemLinks('2026-03-14-export-job', undefined)).toStrictEqual({
      pad: '2026-03-14-export-job',
      origin: undefined,
    })
  })
})

describe('pageLink', () => {
  it('returns the full address of an item on a page when the server is running', () => {
    expect(pageLink(servedLinks, 'pages/retry-policy.md', 'd-1')).toBe(
      `${exportJobAddress}retry-policy.md#d-1`,
    )
  })

  it("returns undefined when the server isn't running", () => {
    expect(pageLink(unservedLinks, 'pages/index.md', 'c-1')).toBeUndefined()
  })
})

describe('the links of the views', () => {
  it('returns the address of the scratch pad, the progress tracker and the log of decisions', () => {
    expect([
      padLink(servedLinks),
      progressTrackerLink(servedLinks),
      decisionLogLink(servedLinks),
    ]).toStrictEqual([
      exportJobAddress,
      `${exportJobAddress}progress-tracker`,
      `${exportJobAddress}decisions`,
    ])
  })

  it('returns the address of an improvement on the improvements', () => {
    expect(improvementLink(servedLinks, 3)).toBe(`${exportJobAddress}improvements#improvement-3`)
  })

  it('returns the address of a task on the progress tracker with the id of the task as its anchor', () => {
    expect(taskLink(servedLinks, 't-4')).toBe(`${exportJobAddress}progress-tracker#t-4`)
  })

  it('returns the address of the improvements without an anchor', () => {
    expect(improvementsLink(servedLinks)).toBe(`${exportJobAddress}improvements`)
  })
})

describe('linkLines', () => {
  it('returns one indented link line when there is a link', () => {
    expect(linkLines(`${exportJobAddress}#c-1`, '  ')).toStrictEqual([
      `  link: ${exportJobAddress}#c-1`,
    ])
  })

  it("doesn't return any lines when there isn't a link", () => {
    expect(linkLines(undefined)).toStrictEqual([])
  })
})

describe('withLinksNote', () => {
  it("adds the line about the missing links when the server isn't running", () => {
    expect(withLinksNote(unservedLinks, 'c-1 is done')).toBe(`c-1 is done\n${missingLinksText}`)
  })

  it('keeps the text as it is when the server is running', () => {
    expect(withLinksNote(servedLinks, 'c-1 is done')).toBe('c-1 is done')
  })
})

describe('textWithLink', () => {
  it('adds the link on its own line when the server is running', () => {
    expect(textWithLink(servedLinks, 'c-1 is done', `${exportJobAddress}#c-1`)).toBe(
      `c-1 is done\nlink: ${exportJobAddress}#c-1`,
    )
  })
})
