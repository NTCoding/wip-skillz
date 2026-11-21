import { type Preview } from '@storybook/react-vite'
import { EveryColourMode } from '../src/browser-page/design-system/design-system'

const preview: Preview = {
  parameters: { layout: 'fullscreen' },
  decorators: [(story) => <EveryColourMode>{story()}</EveryColourMode>],
}

export default preview
