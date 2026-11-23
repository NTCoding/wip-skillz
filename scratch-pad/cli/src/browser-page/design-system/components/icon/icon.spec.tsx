import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon, iconNames } from './icon'

describe('Icon', () => {
  it('draws a hidden SVG with one path when an icon is given', () => {
    const { container } = render(<Icon name="copy" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.querySelectorAll('path')).toHaveLength(1)
  })

  it('lists every icon when the names of the icons are read', () => {
    expect(iconNames).toContain('full-size')
    expect(iconNames).toHaveLength(23)
  })
})
