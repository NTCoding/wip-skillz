import { describe, expect, it } from 'vitest'
import {
  saveColourMode,
  savedColourMode,
  savedSidebarCollapsed,
  saveSidebarCollapsed,
  type SavedSettings,
} from './colour-mode'

const brokenSettings: SavedSettings = {
  getItem: () => {
    throw new DOMException('The storage is blocked.', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('The storage is blocked.', 'SecurityError')
  },
}

describe('savedColourMode', () => {
  it('returns the saved mode when Nick picked a mode before', () => {
    saveColourMode(window.localStorage, 'dark')
    expect(savedColourMode(window.localStorage, false)).toBe('dark')
  })

  it('follows the system when nothing was saved and the system prefers dark', () => {
    expect(savedColourMode(window.localStorage, true)).toBe('dark')
  })

  it('returns light when nothing was saved and the system prefers light', () => {
    expect(savedColourMode(window.localStorage, false)).toBe('light')
  })

  it('ignores a saved value when the value isn’t a mode', () => {
    window.localStorage.setItem('scratch-pad-colour-mode', 'not-a-mode')
    expect(savedColourMode(window.localStorage, false)).toBe('light')
  })

  it('returns the mode of the system when the storage can’t be read', () => {
    expect(() => saveColourMode(brokenSettings, 'dark')).not.toThrow()
    expect(savedColourMode(brokenSettings, true)).toBe('dark')
  })
})

describe('savedSidebarCollapsed', () => {
  it('returns true when Nick collapsed the sidebar before', () => {
    saveSidebarCollapsed(window.localStorage, true)
    expect(savedSidebarCollapsed(window.localStorage)).toBe(true)
  })

  it('returns false when Nick opened the sidebar again', () => {
    saveSidebarCollapsed(window.localStorage, false)
    expect(savedSidebarCollapsed(window.localStorage)).toBe(false)
  })
})
