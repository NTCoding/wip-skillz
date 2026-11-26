import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TaskList } from './task-list'

const meta = {
  title: 'Design system/TaskList',
  component: TaskList,
  args: {
    tasks: [
      { id: 't-1', number: '1', title: 'Design the export job', state: 'done' },
      { id: 't-2', number: '2', title: 'Write the invoice template', state: 'in-progress' },
      { id: 't-3', number: '3', title: 'Check the retry limit', state: 'to-do' },
    ],
  },
} satisfies Meta<typeof TaskList>

export default meta

type Story = StoryObj<typeof meta>

export const ThreeStates: Story = {}

// The titles of the first 2 tasks link to their descriptions, whereas the last task doesn't have a
// description.
export const TitlesWithDescriptions: Story = {
  args: {
    tasks: [
      { id: 't-1', number: '1', title: 'Design the export job', state: 'done', href: '#t-1' },
      {
        id: 't-2',
        number: '2',
        title: 'Write the invoice template',
        state: 'in-progress',
        href: '#t-2',
      },
      { id: 't-3', number: '3', title: 'Check the retry limit', state: 'to-do' },
    ],
    onNavigate: () => undefined,
  },
}

// The task in progress shows its subtasks, whereas the subtasks of the last task are hidden
// until Nick clicks its chevron.
export const Subtasks: Story = {
  args: {
    tasks: [
      { id: 't-1', number: '1', title: 'Design the export job', state: 'done' },
      {
        id: 't-2',
        number: '2',
        title: 'Build the export job',
        state: 'in-progress',
        subtasks: [
          { id: 't-4', number: '2.1', title: 'Retry a failed export', state: 'done' },
          { id: 't-5', number: '2.2', title: 'Log each retry', state: 'in-progress' },
          { id: 't-6', number: '2.3', title: 'Alert the team', state: 'to-do' },
        ],
      },
      {
        id: 't-3',
        number: '3',
        title: 'Ship the export job',
        state: 'to-do',
        subtasks: [{ id: 't-7', number: '3.1', title: 'Tell the shops', state: 'to-do' }],
      },
    ],
  },
}

const runFirstExport = {
  do: (
    <>
      <p>
        Run the export job by hand against the production accounting system. Keep the terminal open
        until the job has printed its summary.
      </p>
      <p>Check that the total in the accounting system matches the total in the summary.</p>
    </>
  ),
  why: (
    <p>
      The production key for the accounting system is only on your laptop so the agent can’t run the
      job against production.
    </p>
  ),
  descriptionHref: '#t-8-description',
}

// Subtask 4.2 and subtask 4.3 are assigned to Nick, which is shown by the dot on task 4. Task 5
// is assigned to Nick as a whole. Subtask 2.1 was assigned to Nick and is done so its mark is grey.
// A link points to subtask 4.2 so its details are open.
export const AssignedToNick: Story = {
  args: {
    openTask: 't-8',
    onNavigate: () => undefined,
    tasks: [
      { id: 't-1', number: '1', title: 'Design the export job', state: 'done', href: '#t-1' },
      {
        id: 't-2',
        number: '2',
        title: 'Connect the export job to the accounting system',
        state: 'done',
        subtasks: [
          {
            id: 't-5',
            number: '2.1',
            title: 'Create the API key for the accounting system',
            state: 'done',
            anchor: true,
            assignment: {
              do: 'Create an API key with write access in the settings of the accounting system.',
              why: 'Only an admin of the accounting system can create a key.',
              descriptionHref: undefined,
            },
          },
          { id: 't-6', number: '2.2', title: 'Send a test invoice', state: 'done' },
        ],
      },
      {
        id: 't-4',
        number: '4',
        title: 'Go live with the export job',
        state: 'in-progress',
        subtasks: [
          { id: 't-7', number: '4.1', title: 'Write the runbook', state: 'done' },
          {
            id: 't-8',
            number: '4.2',
            title: 'Run the first export against production',
            state: 'in-progress',
            anchor: true,
            assignment: runFirstExport,
          },
          {
            id: 't-9',
            number: '4.3',
            title: 'Tell the finance team that the export is live',
            state: 'to-do',
            anchor: true,
            assignment: {
              do: 'Email the finance team after the first run.',
              why: 'The agent can’t send an email.',
              descriptionHref: undefined,
            },
          },
        ],
      },
      {
        id: 't-10',
        number: '5',
        title: 'Ask the finance team how the tax is rounded',
        state: 'to-do',
        anchor: true,
        assignment: {
          do: 'Ask the finance team whether the tax is rounded on each invoice line or on the total.',
          why: 'The agent can’t email the finance team.',
          descriptionHref: '#t-10-description',
        },
      },
      { id: 't-11', number: '6', title: 'Check the retry limit', state: 'to-do' },
    ],
  },
}

// Subtask 4.2 and task 5 have a speech bubble, which opens their threads below their rows. A link
// points to the thread of task 5 so the thread is open.
export const ThreadsOfTasks: Story = {
  args: {
    ...AssignedToNick.args,
    openTask: 'c-4',
    tasks: (AssignedToNick.args?.tasks ?? []).map((task) => ({
      ...task,
      ...(task.id === 't-10'
        ? { thread: { id: 'c-4', content: () => <p>Which invoices are rounded?</p> } }
        : {}),
      subtasks: (task.subtasks ?? []).map((subtask) =>
        subtask.id === 't-8'
          ? { ...subtask, thread: { id: undefined, content: () => <p>No messages yet.</p> } }
          : subtask,
      ),
    })),
  },
}

// On a phone, the state is shown under the title. In a row without a mark, the title takes the
// column of the mark so that a long word like "dashboard" isn't broken.
export const AssignedToNickOnAPhone: Story = {
  args: {
    ...AssignedToNick.args,
    openTask: undefined,
    tasks: [
      ...(AssignedToNick.args?.tasks ?? []).filter((task) => task.id !== 't-2'),
      { id: 't-12', number: '7', title: 'Show the exports on the dashboard', state: 'to-do' },
    ],
  },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
}
