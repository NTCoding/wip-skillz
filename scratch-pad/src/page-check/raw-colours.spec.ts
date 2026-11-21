import { describe, expect, it } from 'vitest'
import { rawColoursInHtml } from './raw-colours'

describe('rawColoursInHtml', () => {
  it('returns the hex colour and the colour function when a style attribute contains them', () => {
    expect(
      rawColoursInHtml('<p style="color:#ff0000;background:rgb(0 0 0)">red</p>'),
    ).toStrictEqual(['#ff0000', 'rgb(0 0 0)'])
  })

  it('returns the named colour when a style element contains it in a declaration', () => {
    expect(
      rawColoursInHtml('<style>.red { border: 1px solid red }</style><p class="red">Export</p>'),
    ).toStrictEqual(['red'])
  })

  it('returns the colour when an attribute of an SVG contains it', () => {
    expect(rawColoursInHtml('<svg><rect fill=\'#0a0\' stroke="teal"/></svg>')).toStrictEqual([
      '#0a0',
      'teal',
    ])
  })

  it('returns each colour function once when the same nested colour is used twice', () => {
    const style = 'color: color-mix(in srgb, var(--accent) 50%, rgb(0 0 0))'
    expect(rawColoursInHtml(`<p style="${style}">a</p><p style="${style}">b</p>`)).toStrictEqual([
      'color-mix(in srgb, var(--accent) 50%, rgb(0 0 0))',
      'rgb(0 0 0)',
    ])
  })

  it('returns the rest of the value when a colour function is not closed', () => {
    expect(rawColoursInHtml('<p style="color: rgb(0 0 0">Total</p>')).toStrictEqual(['rgb(0 0 0'])
  })

  it.each([
    '<p style="color:var(--accent);background:transparent">The export job</p>',
    '<a href="#fade">The red export job</a>',
    '<svg><rect fill="url(#fade)" stroke="currentcolor"/></svg>',
    '<p>Use #fff or rgb(0 0 0) in the text.</p>',
    '<p style="content: \'#12345\'">Invoice 12345</p>',
  ])('returns no colours when the html is %s', (html) => {
    expect(rawColoursInHtml(html)).toStrictEqual([])
  })
})
