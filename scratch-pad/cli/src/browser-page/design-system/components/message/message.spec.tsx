import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NavigationProvider } from '../../navigation-context'
import { Message } from './message'

describe('Message', () => {
  it('shows the first letter of the author, the author, the time and the text', () => {
    const { container } = render(
      <Message
        author="agent"
        text="I have raised the retry limit to 8."
        time="2026-11-20T21:12:00.000Z"
        shownTime="20 Nov, 21:12"
      />,
    )
    expect(container.textContent).toBe('AAgent20 Nov, 21:12I have raised the retry limit to 8.')
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-11-20T21:12:00.000Z',
    )
  })

  it('shows the editor in place of the text when Nick edits the message', () => {
    render(
      <Message
        author="nick"
        text="Is 5 retries enough?"
        time="2026-11-20T21:09:00.000Z"
        shownTime="20 Nov, 21:09"
        editor={<textarea aria-label="Edit the comment" defaultValue="Is 5 retries enough?" />}
      />,
    )
    expect(screen.getByRole('textbox', { name: 'Edit the comment' })).toBeDefined()
    expect(screen.queryByText('Is 5 retries enough?', { selector: 'p' })).toBeNull()
  })

  describe('links in the text', () => {
    const shown = (text: string, onNavigate = vi.fn()) => {
      render(
        <NavigationProvider onNavigate={onNavigate}>
          <Message
            author="nick"
            text={text}
            time="2026-11-20T21:09:00.000Z"
            shownTime="20 Nov, 21:09"
          />
        </NavigationProvider>,
      )
      return onNavigate
    }

    it('opens a link to a page of the scratch pad in the browser page', () => {
      const onNavigate = shown(
        `See [the design](${window.location.origin}/pad/design.md#the-goal) first.`,
      )
      const link = screen.getByRole('link', { name: 'the design' })
      expect(link.getAttribute('target')).toBeNull()
      fireEvent.click(link)
      expect(onNavigate).toHaveBeenCalledWith('/pad/design.md#the-goal')
      expect(screen.getByText(/See/).textContent).toBe('See the design first.')
    })

    it('opens a link to another site in a new tab', () => {
      shown('Read [the docs](https://example.com/docs) or mail me@example.com')
      const link = screen.getByRole('link', { name: 'the docs' })
      expect(link.getAttribute('href')).toBe('https://example.com/docs')
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noreferrer')
    })

    it('doesn’t turn a bare file name into a link', () => {
      shown('See SKILL.md and reference.md or https://example.com')
      expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toStrictEqual([
        'https://example.com/',
      ])
    })

    it('opens a mailto: link in a new tab and never as a page of the scratch pad', () => {
      shown('Write to [Nick](mailto:nick@example.com)')
      const link = screen.getByRole('link', { name: 'Nick' })
      expect(link.getAttribute('href')).toBe('mailto:nick@example.com')
      expect(link.getAttribute('target')).toBe('_blank')
    })

    it('turns a bare address into a link', () => {
      shown('Look at https://example.com/a.')
      expect(screen.getByRole('link', { name: 'https://example.com/a' })).toBeDefined()
    })

    it('shows an address with any other scheme as text', () => {
      shown('Do not [click](javascript:alert(1)) or [this](ftp://example.com/file)')
      expect(screen.queryByRole('link')).toBeNull()
    })

    it('shows an address that the browser can not read as text', () => {
      shown('Open [this](http://) now')
      expect(screen.queryByRole('link')).toBeNull()
      expect(screen.getByText(/Open/).textContent).toBe('Open this now')
    })

    it('opens a link to a page of the scratch pad in the same tab when there is not any navigation', () => {
      render(
        <Message
          author="nick"
          text={`[the design](${window.location.origin}/pad/design.md)`}
          time="2026-11-20T21:09:00.000Z"
          shownTime="20 Nov, 21:09"
        />,
      )
      expect(screen.getByRole('link', { name: 'the design' }).getAttribute('href')).toBe(
        '/pad/design.md',
      )
    })

    it('shows every other Markdown character as it was written', () => {
      shown('Is **5** retries `enough`?\nYes_ no_')
      expect(screen.getByText(/retries/).textContent).toBe('Is **5** retries `enough`?\nYes_ no_')
    })
  })
})
