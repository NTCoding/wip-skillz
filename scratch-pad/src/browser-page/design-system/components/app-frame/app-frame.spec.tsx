import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppFrame, narrowAppFrameQuery } from './app-frame'
import appFrameCss from './app-frame.css?raw'
import readingColumnCss from '../reading-column/reading-column.css?raw'

function renderFrame(sidebarCollapsed: boolean) {
  return render(
    <AppFrame topBar={<p>Top bar</p>} sidebar={<p>Sidebar</p>} sidebarCollapsed={sidebarCollapsed}>
      <p>Reading column</p>
    </AppFrame>,
  )
}

describe('AppFrame', () => {
  it('puts the top bar in a banner and the page in the main landmark when it is rendered', () => {
    renderFrame(false)
    expect(screen.getByRole('banner').textContent).toBe('Top bar')
    expect(screen.getByRole('main').textContent).toBe('Reading column')
  })

  it('marks the sidebar as open when the sidebar isn’t collapsed', () => {
    const { container } = renderFrame(false)
    expect(container.firstElementChild?.getAttribute('data-sidebar')).toBe('open')
  })

  it('marks the sidebar as collapsed when the sidebar is collapsed', () => {
    const { container } = renderFrame(true)
    expect(container.firstElementChild?.getAttribute('data-sidebar')).toBe('collapsed')
  })

  it('uses the width of narrowAppFrameQuery in the CSS of the frame and of the reading column when the window is narrow', () => {
    expect(appFrameCss).toContain(`@media ${narrowAppFrameQuery} {`)
    expect(readingColumnCss).toContain(`@media ${narrowAppFrameQuery} {`)
  })
})
