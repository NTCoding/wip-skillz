import { type MouseEvent } from 'react'

export type Navigate = (href: string) => void

export function navigationClick(href: string, onNavigate: Navigate) {
  return (event: MouseEvent<HTMLAnchorElement>): void => {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    if (event.button !== 0 || modified) {
      return
    }
    event.preventDefault()
    onNavigate(href)
  }
}
