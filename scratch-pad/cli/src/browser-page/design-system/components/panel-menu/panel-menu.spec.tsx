import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PanelMenu, type PanelMenuItem } from './panel-menu'

class StoppedServerError extends Error {}

const reply: PanelMenuItem = {
  key: 'c-1',
  href: '/pad/retry-limit.md#c-1',
  kind: 'reply',
  heading: 'The agent replied',
  where: 'Retry limit',
  quote: 'The export job retries 5 times.',
  last: 'Agent: I have raised the limit to 8 retries.',
  time: '2026-11-20T21:12:00.000Z',
  shownTime: '20 Nov, 21:12',
  context: undefined,
  linkLabel: undefined,
}

const queued: PanelMenuItem = {
  key: 'outbox-1',
  href: '/pad/invoice-template.md#outbox-1',
  kind: 'queued',
  heading: 'Comment',
  where: 'Invoice template',
  quote: 'the tax number',
  last: 'Is the tax number on every invoice?',
  time: '2026-11-20T21:14:00.000Z',
  shownTime: 'Queued 20 Nov, 21:14',
  context: undefined,
  linkLabel: 'Show on the page',
}

const section: PanelMenuItem = {
  key: 'sections pages/invoice-template.md',
  href: '/pad/invoice-template.md#the-logo',
  kind: 'section',
  heading: 'Updates to Invoice template',
  where: '2 sections changed',
  quote: undefined,
  last: undefined,
  time: undefined,
  shownTime: undefined,
  context: undefined,
  linkLabel: undefined,
}

const decision: PanelMenuItem = {
  key: 'd-1',
  href: '/pad/retry-limit.md#d-1',
  kind: 'decision',
  heading: 'A decision to make',
  where: 'Retry limit',
  quote: 'Will the export job retry 8 times?',
  last: undefined,
  time: undefined,
  shownTime: undefined,
  context: { lead: undefined, links: [{ text: 'How the job runs', href: '/pad/how.md' }] },
  linkLabel: undefined,
}

const assignedSubtask: PanelMenuItem = {
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
  linkLabel: 'Read the full details',
}

// The name of the button that marks the assigned subtask as done
const markDoneName = 'Mark as done: 4.2 Run the first export against production'

// A task with subtasks that is still assigned to Nick takes its state from its subtasks.
const assignedTaskWithSubtasks: PanelMenuItem = {
  ...assignedSubtask,
  key: 't-4',
  href: '/pad/progress-tracker#t-4',
  heading: 'Go live with the export job',
  task: {
    id: 't-4',
    number: '4',
    state: 'in-progress',
    summary: 'Go live with the export job.',
    canBeDone: false,
  },
}

interface MenuOptions {
  readonly onTab?: () => void
  readonly onChoose?: () => void
  readonly onNavigate?: (href: string) => void
  readonly focusFirstItem?: boolean
  readonly onMarkDone?: (id: string) => Promise<void>
  readonly focusPanel?: () => void
}

function renderMenu(items: readonly PanelMenuItem[], options: MenuOptions = {}) {
  const props = {
    id: 'exports-menu',
    labelledBy: 'exports-title',
    onNavigate: options.onNavigate ?? (() => undefined),
    onChoose: options.onChoose ?? (() => undefined),
    onTab: options.onTab,
    focusFirstItem: options.focusFirstItem ?? true,
    onMarkDone: options.onMarkDone,
    focusPanel: options.focusPanel,
  }
  const view = render(
    <>
      <p id="exports-title">Waiting for you</p>
      <PanelMenu items={items} {...props} />
      <button type="button">Elsewhere</button>
    </>,
  )
  return {
    rerender: (changed: readonly PanelMenuItem[]) =>
      view.rerender(
        <>
          <p id="exports-title">Waiting for you</p>
          <PanelMenu items={changed} {...props} />
          <button type="button">Elsewhere</button>
        </>,
      ),
  }
}

function tabIndexes(): number[] {
  return screen.getAllByRole('menuitem').map((item) => item.tabIndex)
}

describe('PanelMenu', () => {
  it('shows each item with its heading, its time, its place, its quote, its last line and its link', () => {
    renderMenu([reply, queued, section])
    expect(screen.getByRole('menu', { name: 'Waiting for you' }).id).toBe('exports-menu')
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toStrictEqual([
      'The agent replied20 Nov, 21:12Retry limitThe export job retries 5 times.Agent: I have raised the limit to 8 retries.',
      'CommentQueued 20 Nov, 21:14Invoice templatethe tax numberIs the tax number on every invoice?Show on the page',
      'Updates to Invoice template2 sections changed',
    ])
  })

  it('marks the heading of each item with its kind so that a page with changed sections is quieter', () => {
    renderMenu([reply, section])
    expect(
      ['The agent replied', 'Updates to Invoice template'].map((heading) =>
        screen.getByText(heading).getAttribute('data-kind'),
      ),
    ).toStrictEqual(['reply', 'section'])
  })

  it('shows the links of a decision’s context without a first paragraph when the context starts with the links', () => {
    renderMenu([decision])
    expect(screen.getByRole('menu').textContent).toBe(
      'A decision to makeRetry limitWill the export job retry 8 times?How the job runs',
    )
  })

  it('focuses the first item when the menu is shown', () => {
    renderMenu([reply, queued])
    expect(document.activeElement?.textContent).toContain('The agent replied')
    expect(tabIndexes()).toStrictEqual([0, -1])
  })

  it('leaves the focus where it is when the menu is shown without focusing its first item', () => {
    renderMenu([reply, queued], { focusFirstItem: false })
    expect(document.activeElement).toBe(document.body)
    expect(tabIndexes()).toStrictEqual([0, -1])
  })

  it('moves the focus with the arrow keys from the last item to the first and back', async () => {
    renderMenu([reply, queued])
    await userEvent.keyboard('{ArrowDown}')
    expect(tabIndexes()).toStrictEqual([-1, 0])
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement?.textContent).toContain('The agent replied')
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement?.textContent).toContain('Comment')
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement?.textContent).toContain('The agent replied')
  })

  it('moves the focus to the last item with End and to the first item with Home and ignores another key', async () => {
    renderMenu([reply, queued, section])
    await userEvent.keyboard('{End}')
    expect(document.activeElement?.textContent).toContain('2 sections changed')
    await userEvent.keyboard('{Home}x')
    expect(document.activeElement?.textContent).toContain('The agent replied')
  })

  it('calls onTab when Nick presses Tab', async () => {
    const onTab = vi.fn<() => void>()
    renderMenu([reply], { onTab })
    await userEvent.tab()
    expect(onTab).toHaveBeenCalledOnce()
  })

  it('moves the focus to the next control when Nick presses Tab and there isn’t an onTab', async () => {
    renderMenu([reply])
    await userEvent.tab()
    expect(document.activeElement?.textContent).toBe('Elsewhere')
  })

  it('keeps the last item in the Tab order when the current item is removed', async () => {
    const { rerender } = renderMenu([reply, queued])
    await userEvent.keyboard('{End}')
    rerender([reply])
    expect(tabIndexes()).toStrictEqual([0])
  })

  it('calls onChoose and goes to the item when Nick clicks an item', async () => {
    const onChoose = vi.fn<() => void>()
    const onNavigate = vi.fn<(href: string) => void>()
    renderMenu([reply, queued], { onChoose, onNavigate })
    await userEvent.click(screen.getByRole('menuitem', { name: /Show on the page/ }))
    expect(onChoose).toHaveBeenCalledOnce()
    expect(onNavigate).toHaveBeenCalledWith('/pad/invoice-template.md#outbox-1')
  })

  it('shows a task with its number, its title, its state, the first line of what Nick has to do and its link', () => {
    renderMenu([assignedSubtask])
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toStrictEqual([
      '4.2 Run the first export against productionIn progressRun the export job by hand against the accounting system.Read the full details',
    ])
  })

  it('shows a button that marks the task as done after the link of the task', async () => {
    const onMarkDone = vi.fn<(id: string) => Promise<void>>(() => Promise.resolve())
    renderMenu([assignedSubtask, reply], { onMarkDone })
    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent?.slice(0, 12)),
    ).toStrictEqual(['4.2 Run the ', 'Mark as done', 'The agent re'])
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    expect(onMarkDone).toHaveBeenCalledWith('t-8')
  })

  it('names each button that marks a task as done after the number and the title of its task', () => {
    const exportTask: PanelMenuItem = {
      ...assignedSubtask,
      key: 't-9',
      heading: 'Check the totals of the export',
      task: {
        id: 't-9',
        number: '4.3',
        state: 'to-do',
        summary: 'Add up the totals of the file.',
        canBeDone: true,
      },
    }
    renderMenu([assignedSubtask, exportTask], { onMarkDone: () => Promise.resolve() })
    expect(
      screen
        .getAllByRole('menuitem', { name: /^Mark as done/ })
        .map((button) => button.getAttribute('aria-label')),
    ).toStrictEqual([markDoneName, 'Mark as done: 4.3 Check the totals of the export'])
  })

  it('moves the focus with the arrow keys from the task to its button and on to the next item', async () => {
    renderMenu([assignedSubtask, reply], { onMarkDone: () => Promise.resolve() })
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement?.textContent).toBe('Mark as done')
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement?.textContent).toContain('The agent replied')
  })

  // A disabled button would lose the focus in a browser, which would close the panel of the menu.
  it('ignores a press while the task is marked as done and keeps the focus on the button', async () => {
    const onMarkDone = vi.fn<(id: string) => Promise<void>>(() => new Promise(() => undefined))
    renderMenu([assignedSubtask], { onMarkDone })
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    const button = screen.getByRole('menuitem', { name: markDoneName })
    expect([
      onMarkDone.mock.calls.length,
      button.getAttribute('aria-disabled'),
      button.hasAttribute('disabled'),
      document.activeElement,
    ]).toStrictEqual([1, 'true', false, button])
  })

  it('shows the problem under the button and keeps the focus on the button when the task can’t be marked as done', async () => {
    renderMenu([assignedSubtask], {
      onMarkDone: () => Promise.reject(new StoppedServerError('The server has stopped.')),
    })
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('The server has stopped.'),
    )
    const button = screen.getByRole('menuitem', { name: markDoneName })
    expect([
      document.activeElement,
      button.getAttribute('aria-disabled'),
      screen.getByRole('menuitem', { description: 'The server has stopped.' }),
    ]).toStrictEqual([button, null, button])
  })

  // A menu can only contain its items.
  it('announces the problem from outside the menu', async () => {
    renderMenu([assignedSubtask], {
      onMarkDone: () => Promise.reject(new StoppedServerError('The server has stopped.')),
    })
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    const alert = await screen.findByRole('alert')
    expect([
      screen.getByRole('menu').contains(alert),
      screen.getByRole('menu').querySelector('.panel-menu__problem')?.getAttribute('aria-hidden'),
    ]).toStrictEqual([false, 'true'])
  })

  it('moves the focus to the next item once the task is done', async () => {
    const focusPanel = vi.fn<() => void>()
    const view = renderMenu([assignedSubtask, reply], {
      onMarkDone: () => Promise.resolve(),
      focusPanel,
    })
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    await waitFor(() => expect(document.activeElement?.textContent).toContain('The agent replied'))
    view.rerender([reply])
    expect([
      document.activeElement?.textContent,
      tabIndexes(),
      focusPanel.mock.calls,
    ]).toStrictEqual([expect.stringContaining('The agent replied'), [0], []])
  })

  it('moves the focus to the item before once the task of the last item is done', async () => {
    renderMenu([reply, assignedSubtask], { onMarkDone: () => Promise.resolve() })
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    await waitFor(() => expect(document.activeElement?.textContent).toContain('The agent replied'))
    expect(tabIndexes()).toStrictEqual([0, -1, -1])
  })

  it('moves the focus to the panel once the task of the only item is done', async () => {
    const focusPanel = vi.fn<() => void>()
    renderMenu([assignedSubtask], { onMarkDone: () => Promise.resolve(), focusPanel })
    await userEvent.click(screen.getByRole('menuitem', { name: markDoneName }))
    await waitFor(() => expect(focusPanel).toHaveBeenCalledOnce())
  })

  it('doesn’t show a button for a task that takes its state from its subtasks', () => {
    renderMenu([assignedTaskWithSubtasks], { onMarkDone: () => Promise.resolve() })
    expect(screen.queryByRole('menuitem', { name: /Mark as done/ })).toBeNull()
  })

  it('doesn’t show a button for a task when the menu can’t mark a task as done', () => {
    renderMenu([assignedSubtask])
    expect(screen.queryByRole('menuitem', { name: /Mark as done/ })).toBeNull()
  })
})
