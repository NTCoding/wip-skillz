import { type Meta, type StoryObj } from '@storybook/react-vite'
import { Icon, iconNames } from './icon'

const meta = {
  title: 'Design system/Icon',
  component: Icon,
  args: { name: 'copy' },
} satisfies Meta<typeof Icon>

export default meta

type Story = StoryObj<typeof meta>

export const Copy: Story = {}

export const EveryIcon: Story = {
  render: () => (
    <ul>
      {iconNames.map((name) => (
        <li key={name}>
          <Icon name={name} /> {name}
        </li>
      ))}
    </ul>
  ),
}
