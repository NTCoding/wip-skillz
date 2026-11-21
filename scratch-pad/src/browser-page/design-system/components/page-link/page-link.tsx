import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import { LinkPreview, type PreviewContent } from '../link-preview/link-preview'
import './page-link.css'

interface PageLinkProps {
  readonly href: string
  readonly children: ReactNode
  readonly onNavigate: Navigate
  readonly loadPreview: () => Promise<PreviewContent | undefined>
}

export const previewDelayMilliseconds = 400

export function PageLink({ href, children, onNavigate, loadPreview }: PageLinkProps) {
  const id = useId()
  const [preview, setPreview] = useState<PreviewContent | undefined>(undefined)
  const pending = useRef({ timer: 0, request: 0 })
  useEffect(() => {
    const current = pending.current
    return () => clearTimeout(current.timer)
  }, [])
  const show = (delay: number): void => {
    clearTimeout(pending.current.timer)
    const request = pending.current.request + 1
    pending.current.request = request
    pending.current.timer = window.setTimeout(() => {
      const showIfCurrent = (content: PreviewContent | undefined): void => {
        if (pending.current.request === request) {
          setPreview(content)
        }
      }
      void loadPreview().then(showIfCurrent, () => showIfCurrent(undefined))
    }, delay)
  }
  const hide = (): void => {
    clearTimeout(pending.current.timer)
    pending.current.request += 1
    setPreview(undefined)
  }
  return (
    <span
      className="page-link"
      onMouseEnter={() => show(previewDelayMilliseconds)}
      onMouseLeave={hide}
    >
      <a
        className="page-link__anchor"
        href={href}
        aria-describedby={preview === undefined ? undefined : id}
        onClick={navigationClick(href, onNavigate)}
        onFocus={() => show(0)}
        onBlur={hide}
      >
        {children}
      </a>
      {preview !== undefined && (
        <span className="page-link__preview">
          <LinkPreview id={id} {...preview} />
        </span>
      )}
    </span>
  )
}
