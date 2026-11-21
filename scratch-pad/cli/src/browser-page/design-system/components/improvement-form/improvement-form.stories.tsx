import { type Meta, type StoryObj } from '@storybook/react-vite'
import { ImprovementForm } from './improvement-form'

const meta = {
  title: 'Design system/ImprovementForm',
  component: ImprovementForm,
  args: {
    title: 'The export job skips the custom files.',
    details: '## Steps\n\n1. Run the export job.\n2. Open the invoice template.',
    onSave: () => Promise.resolve(),
    onCancel: () => undefined,
  },
} satisfies Meta<typeof ImprovementForm>

export default meta

type Story = StoryObj<typeof meta>

export const WithDetails: Story = {}

export const WithoutDetails: Story = { args: { details: undefined } }
