import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TaskSection } from './task-section'

function section(open: boolean, openRequest = 0) {
  return (
    <TaskSection
      id="t-2"
      level={2}
      title="2. Build the export job"
      open={open}
      openRequest={openRequest}
    >
      <p>The job writes one CSV file per shop every night.</p>
    </TaskSection>
  )
}

describe('TaskSection', () => {
  it('shows the heading with the id of the task and hides the description when it is collapsed', () => {
    const { container } = render(section(false))
    expect([
      screen.getByRole('heading', { level: 2 }).id,
      container.querySelector('details')?.open,
    ]).toStrictEqual(['t-2', false])
  })

  it('opens the description when Nick clicks the heading', async () => {
    const { container } = render(section(false))
    await userEvent.click(screen.getByRole('heading', { name: '2. Build the export job' }))
    expect(container.querySelector('details')?.open).toBe(true)
  })

  it('opens the description when open turns true', () => {
    const { container, rerender } = render(section(false))
    rerender(section(true))
    expect(container.querySelector('details')?.open).toBe(true)
  })

  it('opens the description again when Nick has closed it and then follows the same link again', async () => {
    const { container, rerender } = render(section(true, 1))
    await userEvent.click(screen.getByRole('heading', { name: '2. Build the export job' }))
    const closed = container.querySelector('details')?.open
    rerender(section(true, 2))
    expect([closed, container.querySelector('details')?.open]).toStrictEqual([false, true])
  })
})
