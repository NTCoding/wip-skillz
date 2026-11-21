import { describe, expect, it } from 'vitest'
import { pageCheckText } from './page-check-text'

describe('pageCheckText', () => {
  it('prints one line per problem and the count when there are problems', () => {
    expect(
      pageCheckText(
        [
          {
            page: 'pages/invoice-template.md',
            line: 16,
            text: "the link points to pages/queue.md, which doesn't exist",
          },
          {
            page: 'pages/invoice-template.md',
            line: undefined,
            text: 'line 4: the sentence is long',
          },
        ],
        1,
      ),
    ).toBe(
      [
        "pages/invoice-template.md:16  the link points to pages/queue.md, which doesn't exist",
        'pages/invoice-template.md  line 4: the sentence is long',
        '2 problems in 1 page',
      ].join('\n'),
    )
  })

  it("prints that there aren't any problems when every checked page is valid", () => {
    expect(pageCheckText([], 3)).toBe("there aren't any problems in 3 pages")
  })
})
