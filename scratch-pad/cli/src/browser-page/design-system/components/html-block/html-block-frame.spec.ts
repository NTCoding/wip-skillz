import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  connectHtmlBlockFrame,
  followLink,
  heightIn,
  linkIn,
  htmlBlockFrameReady,
  htmlBlockFrameScript,
  tokenRuleFor,
} from './html-block-frame'

const disconnects: Array<() => void> = []

afterEach(() => {
  disconnects.splice(0).forEach((disconnect) => disconnect())
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  Reflect.deleteProperty(window, 'htmlBlockPort')
})

function messagesOn(port: MessagePort): unknown[] {
  const received: unknown[] = []
  port.addEventListener('message', (event) => received.push(event.data))
  port.start()
  return received
}

function frameWithTokens(onLink: (href: string) => void = () => undefined) {
  document.head.innerHTML =
    '<style>:root { --text: #242424; } @media screen { :root { --space-md: 8px; } } .invoice-only { --invoice-gap: 4px; } @font-face { font-family: Export; }</style>'
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const frameWindow = frame.contentWindow ?? window
  const disconnect = connectHtmlBlockFrame(
    frame,
    '<ol><li>Read the paid invoices</li></ol>',
    onLink,
  )
  disconnects.push(disconnect ?? (() => undefined))
  const channel = new MessageChannel()
  const fromFrame = messagesOn(channel.port1)
  const ready = (source: Window = frameWindow, origin = 'null'): void => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: htmlBlockFrameReady,
        source,
        origin,
        ports: [channel.port2],
      }),
    )
  }
  return { frame, channel, fromFrame, ready }
}

describe('connectHtmlBlockFrame', () => {
  it('doesn’t connect anything when there isn’t any frame', () => {
    expect(
      connectHtmlBlockFrame(null, '<p>Write one file per shop</p>', () => undefined),
    ).toBeUndefined()
  })

  it('sends the HTML of the block with the tokens through the port of the frame when the frame is ready', async () => {
    const { fromFrame, ready } = frameWithTokens()
    ready()
    await vi.waitFor(() => expect(fromFrame).toHaveLength(1))
    expect(fromFrame[0]).toContain('<body><ol><li>Read the paid invoices</li></ol></body>')
    expect(fromFrame[0]).toContain('--text:#242424;--space-md:8px')
  })

  it('ignores the ready message when another window or another origin sent it', async () => {
    const { fromFrame, ready } = frameWithTokens()
    ready(window)
    ready(undefined, window.location.origin)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(fromFrame).toStrictEqual([])
  })

  it('sets the height of the frame to the height of its content when the frame reports a height', async () => {
    const { frame, channel, ready } = frameWithTokens()
    ready()
    channel.port1.postMessage({ height: 'tall' })
    channel.port1.postMessage({ height: 211.4 })
    await vi.waitFor(() =>
      expect(frame.style.getPropertyValue('--html-block-height')).toBe('212px'),
    )
  })

  it('passes the address of a link to onLink when Nick clicks a link in the frame', async () => {
    const onLink = vi.fn<(href: string) => void>()
    const { channel, ready } = frameWithTokens(onLink)
    ready()
    channel.port1.postMessage({ link: 7 })
    channel.port1.postMessage({ link: 'retry-limit.md#wait' })
    await vi.waitFor(() => expect(onLink).toHaveBeenCalledWith('retry-limit.md#wait'))
    expect(onLink).toHaveBeenCalledOnce()
  })

  it('ignores another message of the frame or a ready message without a port', async () => {
    const { frame, fromFrame } = frameWithTokens()
    const source = frame.contentWindow ?? window
    window.dispatchEvent(new MessageEvent('message', { data: 'hello', source, origin: 'null' }))
    window.dispatchEvent(
      new MessageEvent('message', { data: htmlBlockFrameReady, source, origin: 'null' }),
    )
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(fromFrame).toStrictEqual([])
  })

  it('stops listening to the frame when it is disconnected', async () => {
    const { fromFrame, ready } = frameWithTokens()
    disconnects.splice(0).forEach((disconnect) => disconnect())
    ready()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(fromFrame).toStrictEqual([])
  })
})

describe('tokenRuleFor', () => {
  it('lists every token with its value for the element when the page has tokens', () => {
    const { frame } = frameWithTokens()
    expect(tokenRuleFor(frame)).toBe(':root{color-scheme:normal;--text:#242424;--space-md:8px}')
  })
})

describe('htmlBlockFrameScript', () => {
  it('sends the address of a clicked link to the page instead of opening it in the frame', async () => {
    document.body.innerHTML =
      '<p>See <a href="retry-limit.md"><strong>the retry limit</strong></a> and <a>no address</a>.</p>'
    const channel = new MessageChannel()
    const fromFrame = messagesOn(channel.port2)
    Reflect.set(window, 'htmlBlockPort', channel.port1)
    htmlBlockFrameScript()
    const clicks = [...document.querySelectorAll('strong, a:not([href]), p')].map((target) =>
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
    )
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => expect(fromFrame).toContainEqual({ link: 'retry-limit.md' }))
    expect(clicks).toStrictEqual([true, false, true])
  })

  it('reports the height of the frame when it runs in the frame', async () => {
    const channel = new MessageChannel()
    const fromFrame = messagesOn(channel.port2)
    Reflect.set(window, 'htmlBlockPort', channel.port1)
    htmlBlockFrameScript()
    await vi.waitFor(() => expect(fromFrame).toStrictEqual([{ height: 0 }]))
  })

  it('reports the height of the frame when the written document is ready, even if the frame is never resized', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {
          return undefined
        }
      },
    )
    vi.spyOn(document.documentElement, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ height: 120 }),
    )
    const channel = new MessageChannel()
    const fromFrame = messagesOn(channel.port2)
    Reflect.set(window, 'htmlBlockPort', channel.port1)
    htmlBlockFrameScript()
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await vi.waitFor(() => expect(fromFrame).toStrictEqual([{ height: 120 }]))
  })

  it('does nothing when the frame doesn’t have a port to the page', () => {
    expect(() => htmlBlockFrameScript()).not.toThrow()
  })
})

describe('linkIn', () => {
  it('returns the address when the message has a link', () => {
    expect(linkIn({ link: 'https://example.com/retries' })).toBe('https://example.com/retries')
  })

  it('returns undefined when the message doesn’t have a link', () => {
    expect(linkIn('ready')).toBeUndefined()
  })
})

describe('followLink', () => {
  it('goes to the page of the scratch pad when the link points to a page on the same server', () => {
    window.history.replaceState(null, '', '/2026-11-20-invoice-export/index.md')
    const onNavigate = vi.fn<(href: string) => void>()
    followLink('retry-limit.md#wait', onNavigate)
    expect(onNavigate).toHaveBeenCalledWith('/2026-11-20-invoice-export/retry-limit.md#wait')
  })

  it('opens a link to another site in a new tab when the link points to another site', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const onNavigate = vi.fn<(href: string) => void>()
    followLink('https://example.com/retries', onNavigate)
    expect(open).toHaveBeenCalledWith(
      'https://example.com/retries',
      '_blank',
      'noopener,noreferrer',
    )
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('ignores a link that isn’t a web address or isn’t a valid address', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const onNavigate = vi.fn<(href: string) => void>()
    followLink('data:text/html,retries', onNavigate)
    followLink('https://[invalid', onNavigate)
    expect(open).not.toHaveBeenCalled()
    expect(onNavigate).not.toHaveBeenCalled()
  })
})

describe('heightIn', () => {
  it('returns the height rounded up when the message has a height', () => {
    expect(heightIn({ height: 99.2 })).toBe(100)
  })

  it('returns undefined when the message doesn’t have a height', () => {
    expect(heightIn(null)).toBeUndefined()
  })
})
