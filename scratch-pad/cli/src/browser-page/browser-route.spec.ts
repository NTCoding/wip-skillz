import { describe, expect, it } from 'vitest'
import {
  decisionLogHref,
  exportedAddresses,
  fileOfPage,
  improvementAnchor,
  improvementsHref,
  pageHref,
  progressTrackerHref,
  routeOf,
  servedAddresses,
} from './browser-route'

describe('routeOf', () => {
  it('returns the index page when the address is the scratch pad', () => {
    expect(routeOf({ pathname: '/2026-11-20-invoice-export/', hash: '' })).toStrictEqual({
      kind: 'page',
      pad: '2026-11-20-invoice-export',
      file: 'index.md',
      section: undefined,
    })
  })

  it('returns the page and the section when the address has a page and a hash', () => {
    expect(routeOf({ pathname: '/pad/invoice%20template.md', hash: '#tax-number' })).toStrictEqual({
      kind: 'page',
      pad: 'pad',
      file: 'invoice template.md',
      section: 'tax-number',
    })
  })

  it('returns the progress tracker when the address ends in progress-tracker', () => {
    expect(routeOf({ pathname: '/pad/progress-tracker', hash: '' })).toStrictEqual({
      kind: 'progress-tracker',
      pad: 'pad',
    })
  })

  it('returns the Inbox / Outbox when the address ends in inbox-outbox', () => {
    expect(routeOf({ pathname: '/pad/inbox-outbox', hash: '' })).toStrictEqual({
      kind: 'inbox-outbox',
      pad: 'pad',
    })
  })

  it('returns the log of decisions when the address ends in decisions', () => {
    expect(routeOf({ pathname: '/pad/decisions', hash: '' })).toStrictEqual({
      kind: 'decision-log',
      pad: 'pad',
    })
  })

  it('returns the improvements and the entry in the hash when the address ends in improvements', () => {
    expect(routeOf({ pathname: '/pad/improvements', hash: '#improvement-2' })).toStrictEqual({
      kind: 'improvements',
      pad: 'pad',
      section: 'improvement-2',
    })
    expect(routeOf({ pathname: '/pad/improvements', hash: '' })).toStrictEqual({
      kind: 'improvements',
      pad: 'pad',
      section: undefined,
    })
  })

  it('keeps a part as it is when the part isn’t valid percent encoding', () => {
    expect(routeOf({ pathname: '/pad/retry%E0.md', hash: '#%E0' })).toStrictEqual({
      kind: 'page',
      pad: 'pad',
      file: 'retry%E0.md',
      section: '%E0',
    })
  })

  it('returns the index page of an empty scratch pad name when the address is the root', () => {
    expect(routeOf({ pathname: '/', hash: '' })).toStrictEqual({
      kind: 'page',
      pad: '',
      file: 'index.md',
      section: undefined,
    })
  })

  it('returns the index page when the address doesn’t have a slash after the scratch pad', () => {
    expect(routeOf({ pathname: '/pad', hash: '' })).toStrictEqual({
      kind: 'page',
      pad: 'pad',
      file: 'index.md',
      section: undefined,
    })
  })
})

describe('the addresses of the browser page', () => {
  it('returns the address of the scratch pad when the page is the index page', () => {
    expect(pageHref('pad', 'index.md')).toBe('/pad/')
  })

  it('returns the address of the page with an encoded hash when a section is given', () => {
    expect(pageHref('pad', 'invoice template.md', 'tax number')).toBe(
      '/pad/invoice%20template.md#tax%20number',
    )
  })

  it('returns the addresses of the 3 tabs when they are asked for', () => {
    expect(progressTrackerHref('pad')).toBe('/pad/progress-tracker')
    expect(decisionLogHref('pad')).toBe('/pad/decisions')
    expect(improvementsHref('pad')).toBe('/pad/improvements')
  })

  it('returns the address of an improvement on the improvements when it is asked for', () => {
    expect(improvementsHref('pad', improvementAnchor(2))).toBe('/pad/improvements#improvement-2')
  })

  it('returns the file of a page when the page is in pages/', () => {
    expect(fileOfPage('pages/retry-limit.md')).toBe('retry-limit.md')
  })
})

describe('servedAddresses', () => {
  const addresses = servedAddresses('pad')

  it('returns the paths of the server and loads the frame of an html block from the server when the page is served', () => {
    expect(addresses.pageHref('retry-limit.md', 'wait')).toBe('/pad/retry-limit.md#wait')
    expect([addresses.progressTrackerHref, addresses.decisionLogHref]).toStrictEqual([
      '/pad/progress-tracker',
      '/pad/decisions',
    ])
    expect(addresses.improvementsHref('improvement-1')).toBe('/pad/improvements#improvement-1')
    expect(addresses.htmlBlockFrame).toBe('server')
  })

  it('reads the route from the path when the page is served', () => {
    expect(addresses.routeOf({ pathname: '/pad/retry-limit.md', hash: '' })).toStrictEqual({
      kind: 'page',
      pad: 'pad',
      file: 'retry-limit.md',
      section: undefined,
    })
  })
})

describe('exportedAddresses', () => {
  const addresses = exportedAddresses('pad')
  const exportPath = '/Users/jo/export.html'

  it('returns an address in the hash for a page, a section and the 2 tabs when the scratch pad is exported', () => {
    expect(addresses.pageHref('invoice template.md', 'tax number')).toBe(
      '#/invoice%20template.md/tax%20number',
    )
    expect(addresses.pageHref('index.md')).toBe('#/index.md')
    expect([
      addresses.progressTrackerHref,
      addresses.decisionLogHref,
      addresses.inboxOutboxHref,
    ]).toStrictEqual(['#/progress-tracker', '#/decisions', '#/inbox-outbox'])
    expect([
      addresses.improvementsHref(),
      addresses.improvementsHref('improvement-1'),
    ]).toStrictEqual(['#/improvements', '#/improvements/improvement-1'])
  })

  it('puts the frame of an html block in the page when the scratch pad is exported', () => {
    expect(addresses.htmlBlockFrame).toBe('inline')
  })

  it('returns the page and the section in the hash when the hash has both', () => {
    expect(
      addresses.routeOf({ pathname: exportPath, hash: '#/invoice%20template.md/tax%20number' }),
    ).toStrictEqual({
      kind: 'page',
      pad: 'pad',
      file: 'invoice template.md',
      section: 'tax number',
    })
  })

  it('returns the index page when the export is opened without a hash', () => {
    expect(addresses.routeOf({ pathname: exportPath, hash: '' })).toStrictEqual({
      kind: 'page',
      pad: 'pad',
      file: 'index.md',
      section: undefined,
    })
  })

  it('returns the progress tracker and the log of decisions when the hash names them', () => {
    expect(addresses.routeOf({ pathname: exportPath, hash: '#/progress-tracker' })).toStrictEqual({
      kind: 'progress-tracker',
      pad: 'pad',
    })
    expect(addresses.routeOf({ pathname: exportPath, hash: '#/decisions' })).toStrictEqual({
      kind: 'decision-log',
      pad: 'pad',
    })
  })

  it('returns the improvements and the entry when the hash names them', () => {
    expect(
      addresses.routeOf({ pathname: exportPath, hash: '#/improvements/improvement-1' }),
    ).toStrictEqual({
      kind: 'improvements',
      pad: 'pad',
      section: 'improvement-1',
    })
  })
})
