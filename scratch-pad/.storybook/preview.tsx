import { type Preview } from '@storybook/react-vite'
import { GalleryPanel } from '../src/browser-page/design-system/design-system'

const preview: Preview = {
  parameters: { layout: 'fullscreen' },
  decorators: [(story) => <GalleryPanel>{story()}</GalleryPanel>],
}

export default preview
