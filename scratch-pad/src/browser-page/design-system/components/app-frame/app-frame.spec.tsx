import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppFrame, narrowAppFrameQuery } from './app-frame'
import appFrameCss from './app-frame.css?raw'

function renderFrame(sidebarCollapsed: boolean, onSidebarCollapse: () => void = () => undefined) {
  return render(
    <AppFrame
      topBar={<p>Top bar</p>}
      sidebar={<p>Sidebar</p>}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarCollapse={onSidebarCollapse}
    >
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

  it('marks the sidebar as collapsed and leaves out the scrim when the sidebar is collapsed', () => {
    const { container } = renderFrame(true)
    expect(container.firstElementChild?.getAttribute('data-sidebar')).toBe('collapsed')
    expect(screen.queryByLabelText('Close the sidebar')).toBeNull()
  })

  it('asks to collapse the sidebar when Nick clicks the scrim beside an open sidebar', () => {
    const onSidebarCollapse = vi.fn<() => void>()
    renderFrame(false, onSidebarCollapse)
    fireEvent.click(screen.getByLabelText('Close the sidebar'))
    expect(onSidebarCollapse).toHaveBeenCalledWith()
  })

  it('uses the width of narrowAppFrameQuery in the CSS of the frame when the window is narrow', () => {
    expect(appFrameCss).toContain(`@media ${narrowAppFrameQuery} {`)
  })
})
