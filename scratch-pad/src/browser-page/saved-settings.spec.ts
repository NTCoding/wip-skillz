import { describe, expect, it } from 'vitest'
import { savedSidebarCollapsed, saveSidebarCollapsed, type SavedSettings } from './saved-settings'

const brokenSettings: SavedSettings = {
  getItem: () => {
    throw new DOMException('The storage is blocked.', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('The storage is blocked.', 'SecurityError')
  },
}

describe('savedSidebarCollapsed', () => {
  it('returns true when Nick collapsed the sidebar before', () => {
    saveSidebarCollapsed(window.localStorage, true)
    expect(savedSidebarCollapsed(window.localStorage)).toBe(true)
  })

  it('returns false when Nick opened the sidebar again', () => {
    saveSidebarCollapsed(window.localStorage, false)
    expect(savedSidebarCollapsed(window.localStorage)).toBe(false)
  })

  it('returns false and doesn’t throw when the storage can’t be read or written', () => {
    expect(() => saveSidebarCollapsed(brokenSettings, true)).not.toThrow()
    expect(savedSidebarCollapsed(brokenSettings)).toBe(false)
  })
})
