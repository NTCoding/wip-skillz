import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HtmlBlock } from './html-block'
import { htmlBlockFrameReady } from './html-block-frame'
import { htmlBlockFrameDocument } from '../../html-block-frame-document'

describe('HtmlBlock', () => {
  it('renders the HTML of the agent in a sandboxed frame without the same origin when it is rendered', () => {
    render(<HtmlBlock html="<ol><li>Read the invoices</li></ol>" onNavigate={() => undefined} />)
    const frame = screen.getByTitle('HTML block')
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts')
    expect(frame.getAttribute('src')).toBe('/browser-page/html-block-frame.html')
  })

  it('puts the document of the frame in its srcdoc when the page doesn’t have a server', () => {
    render(
      <HtmlBlock
        html="<ol><li>Read the invoices</li></ol>"
        onNavigate={() => undefined}
        frameSource="inline"
      />,
    )
    const frame = screen.getByTitle('HTML block')
    expect(frame.getAttribute('src')).toBeNull()
    expect(frame.getAttribute('srcdoc')).toBe(htmlBlockFrameDocument)
  })

  it('opens the same frame at full size when Nick presses the control', async () => {
    render(<HtmlBlock html="<p>Write one file per shop</p>" onNavigate={() => undefined} />)
    const frame = screen.getByTitle('HTML block')
    await userEvent.click(screen.getByRole('button', { name: 'Open the HTML block at full size' }))
    expect(screen.getByRole('dialog', { name: 'HTML block' }).contains(frame)).toBe(true)
    expect(screen.getAllByTitle('HTML block')).toHaveLength(1)
  })

  it('calls onComment when Nick presses the comment button beside the block', async () => {
    const onComment = vi.fn<() => void>()
    render(
      <HtmlBlock
        html="<p>Write one file per shop</p>"
        onNavigate={() => undefined}
        onComment={onComment}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Comment on the HTML block' }))
    expect(onComment).toHaveBeenCalledWith()
  })

  it('doesn’t offer a comment button when the block can’t be commented on', () => {
    render(<HtmlBlock html="<p>Write one file per shop</p>" onNavigate={() => undefined} />)
    expect(screen.queryByRole('button', { name: 'Comment on the HTML block' })).toBeNull()
  })

  it('goes to the page when Nick clicks a link to a page of the scratch pad in the frame', async () => {
    window.history.replaceState(null, '', '/2026-11-20-invoice-export/')
    const onNavigate = vi.fn<(href: string) => void>()
    render(<HtmlBlock html='<a href="retry-limit.md">Retry limit</a>' onNavigate={onNavigate} />)
    const frame = screen.getByTitle<HTMLIFrameElement>('HTML block')
    const channel = new MessageChannel()
    window.dispatchEvent(
      new MessageEvent('message', {
        data: htmlBlockFrameReady,
        source: frame.contentWindow,
        origin: 'null',
        ports: [channel.port2],
      }),
    )
    channel.port1.postMessage({ link: 'retry-limit.md' })
    await vi.waitFor(() =>
      expect(onNavigate).toHaveBeenCalledWith('/2026-11-20-invoice-export/retry-limit.md'),
    )
    channel.port1.close()
  })
})
