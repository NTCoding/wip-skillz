import { cleanup } from '@testing-library/react'
import { setProjectAnnotations } from '@storybook/react-vite'
import { afterEach, beforeEach, vi } from 'vitest'
import preview from '../../.storybook/preview'

setProjectAnnotations(preview)

Element.prototype.scrollIntoView = function scrollIntoView(): void {
  this.setAttribute('data-scrolled-into-view', 'true')
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-colour-mode')
})

class ResizeObserverInTests {
  constructor(private readonly resized: () => void) {}

  observe(): void {
    this.resized()
  }

  disconnect(): void {
    return undefined
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverInTests)
})

Range.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
  return DOMRect.fromRect({ x: 100, y: 300, width: 200, height: 20 })
}

HTMLElement.prototype.showPopover = function showPopover(): void {
  this.setAttribute('data-popover-shown', 'true')
  this.style.setProperty('display', 'block')
}

HTMLDialogElement.prototype.showModal = function showModal(): void {
  this.setAttribute('open', '')
}
