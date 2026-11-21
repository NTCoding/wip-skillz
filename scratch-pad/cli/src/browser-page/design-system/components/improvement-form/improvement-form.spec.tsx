import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ImprovementForm, type ImprovementEdit } from './improvement-form'

class RefusedEditError extends Error {}

function renderForm(onSave: (edit: ImprovementEdit) => Promise<void>, onCancel = vi.fn()) {
  render(
    <ImprovementForm
      title="The export job skips the custom files."
      details="Run the export job."
      onSave={onSave}
      onCancel={onCancel}
    />,
  )
  return {
    title: screen.getByRole('textbox', { name: 'Title' }),
    details: screen.getByRole('textbox', { name: 'Details in Markdown' }),
    onCancel,
  }
}

describe('ImprovementForm', () => {
  it('shows the title and the details and focuses the title when it opens', () => {
    const { title, details } = renderForm(() => Promise.resolve())
    expect(title).toHaveProperty('value', 'The export job skips the custom files.')
    expect(details).toHaveProperty('value', 'Run the export job.')
    expect(document.activeElement).toBe(title)
  })

  it('saves the changed title and details when Nick presses Save', async () => {
    const onSave = vi.fn(() => Promise.resolve())
    const { title, details } = renderForm(onSave)
    await userEvent.clear(title)
    await userEvent.type(title, 'The export job skips the invoice template.')
    await userEvent.type(details, ' Twice.')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith({
      title: 'The export job skips the invoice template.',
      details: 'Run the export job. Twice.',
    })
  })

  it('disables Save while the title is empty', async () => {
    const { title } = renderForm(() => Promise.resolve())
    await userEvent.clear(title)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true)
  })

  it('cancels the edit when Nick presses Cancel', async () => {
    const { onCancel } = renderForm(() => Promise.resolve())
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables both buttons while the server hasn’t returned yet', async () => {
    const saving = Promise.withResolvers<undefined>()
    renderForm(() => saving.promise)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true)
    saving.resolve(undefined)
  })

  it('shows the problem and keeps the edit when the server refuses the edit', async () => {
    const { title } = renderForm(() =>
      Promise.reject(new RefusedEditError('The improvement is empty.')),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect((await screen.findByRole('alert')).textContent).toBe('The improvement is empty.')
    expect(title).toHaveProperty('value', 'The export job skips the custom files.')
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', false)
  })
})
