import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ImageBlock } from './image-block'

describe('ImageBlock', () => {
  it('shows the image with its text alternative when it is rendered', () => {
    render(<ImageBlock src="steps.svg" alt="The 3 steps of the export job" />)
    expect(
      screen.getByRole('img', { name: 'The 3 steps of the export job' }).getAttribute('src'),
    ).toBe('steps.svg')
  })

  it('opens the image at full size when Nick presses the control', async () => {
    render(<ImageBlock src="steps.svg" alt="The 3 steps" />)
    await userEvent.click(screen.getByRole('button', { name: 'Open the image at full size' }))
    expect(
      screen.getByRole('dialog', { name: 'image' }).querySelector('img')?.getAttribute('alt'),
    ).toBe('The 3 steps')
  })
})
