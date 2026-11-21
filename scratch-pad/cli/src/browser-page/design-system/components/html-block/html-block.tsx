import { useCallback } from 'react'
import { type Navigate } from '../../navigation-click'
import { FullSizeView } from '../full-size-view/full-size-view'
import { IconButton } from '../icon-button/icon-button'
import { connectHtmlBlockFrame, followLink, htmlBlockFrameSource } from './html-block-frame'
import { htmlBlockFrameDocument } from '../../html-block-frame-document'
import './html-block.css'

export type HtmlBlockFrameSource = 'server' | 'inline'

interface HtmlBlockFrameProps {
  readonly html: string
  readonly onNavigate: Navigate
  readonly frameSource: HtmlBlockFrameSource
}

interface HtmlBlockProps {
  readonly html: string
  readonly onNavigate: Navigate
  readonly frameSource?: HtmlBlockFrameSource
  readonly onComment?: (() => void) | undefined
}

// An export doesn't have a server to send a header so the sandbox attribute sandboxes this frame.
const inlineFrame = { srcDoc: htmlBlockFrameDocument, sandbox: 'allow-scripts' }

// The sandbox directive in the policy of the server's response sandboxes this frame. This frame
// doesn't have a sandbox attribute, because the Claude desktop app blocks every frame that has one.
const serverFrame = { src: htmlBlockFrameSource }

function HtmlBlockFrame({ html, onNavigate, frameSource }: HtmlBlockFrameProps) {
  const connect = useCallback(
    (frame: HTMLIFrameElement | null) =>
      connectHtmlBlockFrame(frame, html, (href) => followLink(href, onNavigate)),
    [html, onNavigate],
  )
  return (
    <iframe
      ref={connect}
      className="html-block"
      {...(frameSource === 'inline' ? inlineFrame : serverFrame)}
      title="HTML block"
    />
  )
}

export function HtmlBlock({ html, onNavigate, frameSource = 'server', onComment }: HtmlBlockProps) {
  return (
    <FullSizeView
      label="HTML block"
      actions={
        onComment === undefined ? undefined : (
          <IconButton icon="comment" label="Comment on the HTML block" onClick={onComment} />
        )
      }
    >
      <HtmlBlockFrame key={html} html={html} onNavigate={onNavigate} frameSource={frameSource} />
    </FullSizeView>
  )
}
