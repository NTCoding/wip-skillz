import { type Meta, type StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { FullTree, type FullTreeNode } from './full-tree'

function section(title: string, children: readonly FullTreeNode[] = []): FullTreeNode {
  return { kind: 'section', title, href: `#${title}`, children }
}

function page(title: string, children: readonly FullTreeNode[]): FullTreeNode {
  return { kind: 'page', title, href: `#${title}`, children }
}

const nodes: FullTreeNode[] = [
  page('1 How the job runs', [
    section('When the job starts', [section('Every night'), section('After a failed export')]),
    section('What the job writes'),
    page('1.1 Retry limit', [
      section('Why 5 retries'),
      section('Wait between retries'),
      page('1.1.1 First retry', [
        section('Why 30 seconds'),
        page('1.1.1.1 Wait for the queue', [section('The longest wait')]),
      ]),
    ]),
  ]),
  page('2 Invoice template', [section('The tax number of the shop'), section('The logo')]),
  page('3 Shop storage', []),
]

const meta = {
  title: 'Design system/FullTree',
  component: FullTree,
  args: { label: 'Full tree', nodes, onNavigate: () => undefined },
} satisfies Meta<typeof FullTree>

export default meta

type Story = StoryObj<typeof meta>

export const Collapsed: Story = {}

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Full tree/ }))
  },
}

export const OneBranchCollapsed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /Full tree/ }))
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse 1 How the job runs' }))
  },
}

export const ALevel3NodeExpanded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /Full tree/ }))
    await userEvent.click(canvas.getByRole('button', { name: 'Expand 1.1.1 First retry' }))
  },
}
