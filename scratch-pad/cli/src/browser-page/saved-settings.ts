const sidebarKey = 'scratch-pad-sidebar'

export interface SavedSettings {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

function savedValue(settings: SavedSettings, key: string): string | null {
  try {
    return settings.getItem(key)
  } catch {
    return null
  }
}

function save(settings: SavedSettings, key: string, value: string): void {
  try {
    settings.setItem(key, value)
  } catch {
    return
  }
}

export function savedSidebarCollapsed(settings: SavedSettings): boolean {
  return savedValue(settings, sidebarKey) === 'collapsed'
}

export function saveSidebarCollapsed(settings: SavedSettings, collapsed: boolean): void {
  save(settings, sidebarKey, collapsed ? 'collapsed' : 'open')
}
