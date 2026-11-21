import { describe, expect, it } from 'vitest'
import { renderedInvoicePage } from './rendered-page-fixtures'

const steps = '<ol><li>retry</li></ol>'

describe('the :::html block', () => {
  it('inserts the HTML as it is when the HTML is inside the block', () => {
    expect(renderedInvoicePage([':::html', '<svg><circle r="4"/></svg>', ':::']).html).toBe(
      '<div class="html-block" data-lines="1-3">\n<svg><circle r="4"/></svg>\n</div>\n',
    )
  })

  it('inserts the custom file as it is when the block reads a file that exists', () => {
    const page = renderedInvoicePage([':::html file=custom/retry-steps.html', ':::'], {
      'custom/retry-steps.html': steps,
    })

    expect(page.html).toBe(`<div class="html-block" data-lines="1-2">\n${steps}\n</div>\n`)
  })

  it('shows a warning with the problem when the block reads a missing file', () => {
    const page = renderedInvoicePage([':::html file=custom/retry-steps.html', ':::'])
    const text = "the :::html block reads custom/retry-steps.html, which doesn't exist"

    expect(page.problems).toStrictEqual([{ line: 1, text }])
    expect(page.html).toContain(`<p class="named-block-warning">${text}</p>`)
  })

  it.each(['file=pages/index.md', 'file=custom/sub/steps.html', 'wide'])(
    'reports the option when the option is %s',
    (option) => {
      expect(renderedInvoicePage([`:::html ${option}`, ':::']).problems).toStrictEqual([
        { line: 1, text: 'the :::html block only takes file=custom/<name>.html' },
      ])
    },
  )

  it('inserts the file and reports the HTML inside the block when the block has both', () => {
    const page = renderedInvoicePage(
      [':::html file=custom/retry-steps.html', '<p>inline</p>', ':::'],
      { 'custom/retry-steps.html': steps },
    )

    expect(page.problems).toStrictEqual([
      {
        line: 1,
        text: 'the :::html block reads custom/retry-steps.html and has HTML inside it too',
      },
    ])
    expect(page.html).toContain(steps)
  })
})
