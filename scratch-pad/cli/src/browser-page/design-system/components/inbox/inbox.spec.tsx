import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Inbox, type InboxEntry } from './inbox'

class StoppedServerError extends Error {}

const decision: InboxEntry = {
  key: 'd-1',
  href: '/pad/#d-1',
  kind: 'decision',
  heading: 'A decision to make',
  where: 'Invoice export',
  quote: 'Will the export job retry 8 times?',
  last: undefined,
  time: '2026-11-20T21:05:00.000Z',
  shownTime: '20 Nov, 21:05',
  context: undefined,
}

const decisionWithContext: InboxEntry = {
  ...decision,
  key: 'd-2',
  href: '/pad/#d-2',
  quote: 'Will the job tell the team after the last retry?',
  context: {
    lead: 'The team only reads the log in the morning. Read these in order:',
    links: [
      { text: 'How the job runs', href: '/pad/how-the-job-runs.md' },
      { text: 'What counts as a failure', href: '/pad/retry-limit.md#what-counts-as-a-failure' },
    ],
  },
}

const reply: InboxEntry = {
  key: 'c-1',
  href: '/pad/invoice-template.md#c-1',
  kind: 'reply',
  heading: 'The agent replied',
  where: 'Invoice template',
  quote: 'The tax number',
  last: 'Agent: I have moved the tax number.',
  time: '2026-11-20T21:12:00.000Z',
  shownTime: '20 Nov, 21:12',
  context: undefined,
}

const newPage: InboxEntry = {
  key: 'page pages/retry-limit.md',
  href: '/pad/retry-limit.md',
  kind: 'page',
  heading: 'A new page',
  where: 'Retry limit',
  quote: 'The export job retries the upload of the invoices.',
  last: undefined,
  time: '2026-11-20T21:20:00.000Z',
  shownTime: '20 Nov, 21:20',
  context: undefined,
}

const changedPage: InboxEntry = {
  key: 'sections pages/invoice-template.md',
  href: '/pad/invoice-template.md#the-logo',
  kind: 'section',
  heading: 'Updates to Invoice template',
  where: '2 sections changed',
  quote: undefined,
  last: undefined,
  time: '2026-11-20T21:15:00.000Z',
  shownTime: '20 Nov, 21:15',
  context: undefined,
}

const assignedSubtask: InboxEntry = {
  key: 't-8',
  href: '/pad/progress-tracker#t-8',
  kind: 'task',
  heading: 'Run the first export against production',
  where: 'Progress tracker',
  quote: undefined,
  last: undefined,
  time: undefined,
  shownTime: undefined,
  context: undefined,
  task: {
    id: 't-8',
    number: '4.2',
    state: 'in-progress',
    summary: 'Run the export job by hand against the accounting system.',
    canBeDone: true,
  },
}

function renderInbox(
  entries: readonly InboxEntry[],
  onNavigate = vi.fn<(href: string) => void>(),
  onMarkDone?: (id: string) => Promise<void>,
) {
  const inbox = (shown: readonly InboxEntry[]) => (
    <>
      <Inbox entries={shown} onNavigate={onNavigate} onMarkDone={onMarkDone} />
      <button type="button">Elsewhere</button>
    </>
  )
  const view = render(inbox(entries))
  return {
    onNavigate,
    button: screen.getByRole('button', { name: /^Inbox/ }),
    rerender: (shown: readonly InboxEntry[]) => view.rerender(inbox(shown)),
  }
}

const markDoneName = 'Mark as done: 4.2 Run the first export against production'

function updatesButton(): HTMLElement {
  return screen.getByRole('button', { name: /^Updates to pages/ })
}

describe('Inbox', () => {
  it('shows the count of the items that wait for Nick on the button when the list is closed', () => {
    const { button } = renderInbox([decision, reply])
    expect(button.textContent).toBe('Inbox2')
    expect(button.getAttribute('aria-label')).toBe('Inbox: 2 items wait for you')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('opens the list of the items with the focus on the first item when Nick presses the button', async () => {
    const { button } = renderInbox([decision, reply])
    await userEvent.click(button)
    const items = screen.getAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toStrictEqual([
      'A decision to make20 Nov, 21:05Invoice exportWill the export job retry 8 times?',
      'The agent replied20 Nov, 21:12Invoice templateThe tax numberAgent: I have moved the tax number.',
    ])
    expect(screen.getByRole('menu', { name: 'Needs your answer' })).not.toBeNull()
    expect(document.activeElement).toBe(items[0])
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  it('points the button at the menu of the items', async () => {
    const { button } = renderInbox([decision])
    await userEvent.click(button)
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-controls')).toBe(screen.getByRole('menu').id)
  })

  it('goes to the item and closes the list when Nick chooses an item', async () => {
    const { button, onNavigate } = renderInbox([decision, reply])
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('menuitem', { name: /The agent replied/ }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/invoice-template.md#c-1')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('moves between the items with the arrow keys and ignores another key', async () => {
    const { button } = renderInbox([decision, reply])
    await userEvent.click(button)
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement?.textContent).toContain('The agent replied')
    await userEvent.keyboard('{ArrowDown}x')
    expect(document.activeElement?.textContent).toContain('A decision to make')
  })

  it('keeps only the focused item in the Tab order and goes to the first or last item with Home and End', async () => {
    const { button } = renderInbox([decision, reply])
    await userEvent.click(button)
    expect(screen.getAllByRole('menuitem').map((item) => item.tabIndex)).toStrictEqual([0, -1])
    await userEvent.keyboard('{End}')
    expect(screen.getAllByRole('menuitem').map((item) => item.tabIndex)).toStrictEqual([-1, 0])
    await userEvent.keyboard('{Home}')
    expect(document.activeElement?.textContent).toContain('A decision to make')
  })

  it('closes the list and moves the focus on from the button when Nick presses Tab in the list', async () => {
    const { button } = renderInbox([decision, reply])
    await userEvent.click(button)
    await userEvent.tab()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement?.textContent).toBe('Elsewhere')
  })

  it('closes the list and gives the focus back to the button when Nick presses Escape', async () => {
    const { button } = renderInbox([decision])
    await userEvent.click(button)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('closes the list when the focus leaves the Inbox', async () => {
    const { button } = renderInbox([decision])
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('says that nothing waits for Nick and doesn’t show a count or a dot when the Inbox is empty', async () => {
    const { button } = renderInbox([])
    await userEvent.click(button)
    expect(screen.getByText('Nothing waits for you.').tagName).toBe('P')
    expect([
      button.textContent,
      button.querySelector('.top-bar-panel__dot'),
      screen.queryByRole('button', { name: /^Updates to pages/ }),
    ]).toStrictEqual(['Inbox', null, null])
    expect(button.getAttribute('aria-haspopup')).toBeNull()
    expect(button.getAttribute('aria-controls')).toBe(
      screen.getByRole('group', { name: 'Inbox' }).id,
    )
  })

  it('closes the list when Nick presses the button again or Escape on the button', async () => {
    const { button } = renderInbox([])
    await userEvent.click(button)
    await userEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(button)
    await userEvent.keyboard('x{Escape}')
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('uses the singular when one item waits for Nick', () => {
    const { button } = renderInbox([reply])
    expect(button.getAttribute('aria-label')).toBe('Inbox: 1 item waits for you')
  })

  it('doesn’t count the updates to pages and doesn’t show a dot when an item waits for Nick', () => {
    const { button } = renderInbox([reply, changedPage, newPage])
    expect(button.textContent).toBe('Inbox1')
    expect(button.getAttribute('aria-label')).toBe('Inbox: 1 item waits for you')
    expect(button.querySelector('.top-bar-panel__dot')).toBeNull()
  })

  it('shows a dot without a number when there are only updates to pages', async () => {
    const { button } = renderInbox([changedPage])
    expect([button.textContent, button.getAttribute('aria-label')]).toStrictEqual([
      'Inbox',
      'Inbox: pages have been updated',
    ])
    expect(button.querySelector('.top-bar-panel__dot')).not.toBeNull()
    await userEvent.click(button)
    expect([
      screen.getByText('Nothing waits for you.').tagName,
      button.getAttribute('aria-haspopup'),
      updatesButton().getAttribute('aria-expanded'),
    ]).toStrictEqual(['P', null, 'false'])
  })

  it('shows the updates to pages collapsed below the items that wait for Nick, with the count of the pages', async () => {
    const { button } = renderInbox([reply, changedPage, newPage])
    await userEvent.click(button)
    expect(updatesButton().textContent).toBe('Updates to pages 2')
    expect(updatesButton().getAttribute('aria-expanded')).toBe('false')
    expect(updatesButton().getAttribute('aria-controls')).toBeNull()
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toStrictEqual([
      'The agent replied20 Nov, 21:12Invoice templateThe tax numberAgent: I have moved the tax number.',
    ])
  })

  it('opens and collapses the updates to pages when Nick clicks their button', async () => {
    const { button } = renderInbox([reply, changedPage, newPage])
    await userEvent.click(button)
    await userEvent.click(updatesButton())
    const updates = screen.getByRole('menu', { name: 'Updates to pages 2' })
    expect(updatesButton().getAttribute('aria-expanded')).toBe('true')
    expect(updatesButton().getAttribute('aria-controls')).toBe(updates.id)
    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent?.slice(0, 27)),
    ).toStrictEqual([
      'The agent replied20 Nov, 21',
      'Updates to Invoice template',
      'A new page20 Nov, 21:20Retr',
    ])
    await userEvent.click(updatesButton())
    expect(screen.queryByRole('menu', { name: 'Updates to pages 2' })).toBeNull()
  })

  it('shows a page with changed sections and a new page with their titles, their counts and their descriptions', async () => {
    const { button } = renderInbox([changedPage, newPage])
    await userEvent.click(button)
    await userEvent.click(updatesButton())
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toStrictEqual([
      'Updates to Invoice template20 Nov, 21:152 sections changed',
      'A new page20 Nov, 21:20Retry limitThe export job retries the upload of the invoices.',
    ])
  })

  it('goes to the first changed section and closes the list when Nick chooses a page with changed sections', async () => {
    const { button, onNavigate } = renderInbox([changedPage])
    await userEvent.click(button)
    await userEvent.click(updatesButton())
    await userEvent.click(screen.getByRole('menuitem', { name: /2 sections changed/ }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/invoice-template.md#the-logo')
    expect(screen.queryByRole('group', { name: 'Inbox' })).toBeNull()
  })

  it('moves the focus from the items to the button of the updates when Nick presses Tab and leaves it there when he opens the updates', async () => {
    const { button } = renderInbox([reply, changedPage])
    await userEvent.click(button)
    await userEvent.tab()
    expect(document.activeElement).toBe(updatesButton())
    await userEvent.keyboard('{Enter}')
    expect(document.activeElement).toBe(updatesButton())
    await userEvent.tab()
    expect(document.activeElement?.textContent).toContain('2 sections changed')
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(updatesButton())
  })

  it('shows the first paragraph and the numbered links of a decision’s context under its question', async () => {
    const { button } = renderInbox([decisionWithContext, reply])
    await userEvent.click(button)
    expect(screen.getByRole('menu').firstElementChild?.textContent).toBe(
      'A decision to make20 Nov, 21:05Invoice exportWill the job tell the team after the last retry?The team only reads the log in the morning. Read these in order:How the job runsWhat counts as a failure',
    )
    expect(
      screen
        .getAllByRole('menuitem')
        .slice(1, 3)
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toStrictEqual([
      ['How the job runs', '/pad/how-the-job-runs.md'],
      ['What counts as a failure', '/pad/retry-limit.md#what-counts-as-a-failure'],
    ])
    expect(screen.getByRole('group', { name: 'Context' }).tagName).toBe('OL')
  })

  it('moves through the links of a decision’s context with the arrow keys', async () => {
    const { button } = renderInbox([decisionWithContext, reply])
    await userEvent.click(button)
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement?.textContent).toBe('How the job runs')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(document.activeElement?.textContent).toContain('The agent replied')
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement?.textContent).toBe('What counts as a failure')
  })

  it('goes to the section and closes the list when Nick chooses a link of a decision’s context', async () => {
    const { button, onNavigate } = renderInbox([decisionWithContext])
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('menuitem', { name: 'What counts as a failure' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/retry-limit.md#what-counts-as-a-failure')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('counts a task that is assigned to Nick as an item that waits for him', () => {
    const { button } = renderInbox([decision, assignedSubtask])
    expect(button.getAttribute('aria-label')).toBe('Inbox: 2 items wait for you')
  })

  it('lists a task with a link to its details and marks it as done when Nick clicks its button', async () => {
    const onMarkDone = vi.fn<(id: string) => Promise<void>>(() => Promise.resolve())
    const { button } = renderInbox([decision, assignedSubtask], undefined, onMarkDone)
    await userEvent.click(button)
    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent?.slice(0, 20)),
    ).toStrictEqual(['A decision to make20', '4.2 Run the first ex', 'Mark as done'])
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    expect(onMarkDone).toHaveBeenCalledWith('t-8')
  })

  // A browser moves the focus away from a disabled button at its next rendering update. jsdom does
  // the same. So the Inbox would close if the button were disabled.
  it('stays open with the focus on the button while a task is marked as done', async () => {
    const { button } = renderInbox([assignedSubtask], undefined, () => new Promise(() => undefined))
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect([button.getAttribute('aria-expanded'), document.activeElement]).toStrictEqual([
      'true',
      screen.getByRole('menuitem', { name: markDoneName }),
    ])
  })

  it('stays open and shows the problem when a task can’t be marked as done', async () => {
    const { button } = renderInbox([assignedSubtask], undefined, () =>
      Promise.reject(new StoppedServerError('The server has stopped.')),
    )
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    expect([
      (await screen.findByRole('alert')).textContent,
      button.getAttribute('aria-expanded'),
      document.activeElement,
    ]).toStrictEqual([
      'The server has stopped.',
      'true',
      screen.getByRole('menuitem', { name: markDoneName }),
    ])
  })

  it('stays open with the focus on the panel when Nick has marked the only task as done', async () => {
    const { button, rerender } = renderInbox([assignedSubtask], undefined, () => Promise.resolve())
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    rerender([])
    const panel = screen.getByRole('group', { name: 'Inbox' })
    expect([document.activeElement, panel.textContent]).toStrictEqual([
      panel,
      'Needs your answerNothing waits for you.',
    ])
  })
})
