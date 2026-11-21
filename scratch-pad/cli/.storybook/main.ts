import { type StorybookConfig } from '@storybook/react-vite'
import { type Plugin } from 'vite'
import { htmlBlockFrameDocument } from '../src/browser-page/design-system/html-block-frame-document'
import { htmlBlockFramePath } from '../src/local-server/html-block-frame'

const htmlBlockFrame: Plugin = {
  name: 'html-block-frame',
  configureServer(server) {
    server.middlewares.use(htmlBlockFramePath, (_request, response) => {
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(htmlBlockFrameDocument)
    })
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: htmlBlockFramePath.slice(1),
      source: htmlBlockFrameDocument,
    })
  },
}

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/browser-page/design-system/**/*.stories.tsx'],
  addons: [],
  core: { disableTelemetry: true },
  features: { actions: false, interactions: false },
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), htmlBlockFrame],
    build: { ...viteConfig.build, chunkSizeWarningLimit: 2000 },
  }),
}

export default config
