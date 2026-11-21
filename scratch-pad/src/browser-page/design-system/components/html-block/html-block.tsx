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
      {...(frameSource === 'inline'
        ? { srcDoc: htmlBlockFrameDocument }
        : { src: htmlBlockFrameSource })}
      sandbox="allow-scripts"
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
