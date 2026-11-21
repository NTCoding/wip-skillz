import { describe, expect, it } from 'vitest'
import { makePageBehindInert } from './page-behind'

function pageWithBlock(): Element {
  document.body.innerHTML =
    '<header>Invoice export</header><main><p>Intro</p><figure id="block"></figure><aside inert>Notes</aside></main>'
  return document.querySelector('#block') ?? document.body
}

describe('makePageBehindInert', () => {
  it('makes every element beside the block and beside its parents inert when it is called', () => {
    const restore = makePageBehindInert(pageWithBlock())
    const inert = [...document.querySelectorAll('[inert]')].map((element) => element.tagName)
    restore()
    expect(inert).toStrictEqual(['HEAD', 'HEADER', 'P', 'ASIDE'])
  })

  it('gives back only the elements that it made inert when the page is restored', () => {
    const restore = makePageBehindInert(pageWithBlock())
    restore()
    const inert = [...document.querySelectorAll('[inert]')].map((element) => element.tagName)
    expect(inert).toStrictEqual(['ASIDE'])
  })

  it('doesn’t make anything inert when there isn’t any block', () => {
    document.body.innerHTML = '<main><p>Intro</p></main>'
    makePageBehindInert(null)
    expect(document.querySelectorAll('[inert]')).toHaveLength(0)
  })
})
