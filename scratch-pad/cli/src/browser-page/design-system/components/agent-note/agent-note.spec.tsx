import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AgentNote } from './agent-note'

describe('AgentNote', () => {
  it('shows the note under the label Agent note when the agent writes a note', () => {
    render(
      <AgentNote>
        <p>I haven’t read the code of the export job.</p>
      </AgentNote>,
    )
    const note = screen.getByRole('figure')
    expect(note.querySelector('figcaption')?.textContent).toBe('Agent note')
    expect(note.querySelector('.agent-note__body')?.textContent).toBe(
      'I haven’t read the code of the export job.',
    )
  })

  it('shows every paragraph of the note when the note has several paragraphs', () => {
    render(
      <AgentNote>
        <p>I haven’t run the export job.</p>
        <p>The retry limit comes from the config file.</p>
      </AgentNote>,
    )
    expect(screen.getByRole('figure').querySelectorAll('.agent-note__body > p')).toHaveLength(2)
  })
})
