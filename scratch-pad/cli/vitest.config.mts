import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    watch: false,
    reporters: ['default'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    env: { TZ: 'UTC' },
    projects: [
      {
        extends: true,
        test: {
          name: 'tool',
          environment: 'node',
          include: ['src/**/*.spec.ts', '.token-lint/**/*.spec.mjs'],
          exclude: ['src/browser-page/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser-page',
          environment: 'jsdom',
          include: ['src/browser-page/**/*.spec.{ts,tsx}'],
          setupFiles: ['src/browser-page/browser-page-test-setup.ts'],
          css: {
            include: [
              /design-system\/tokens\/.+\.css/u,
              /components\/(app-frame|reading-column|thread-card|margin-decision)\/[a-z-]+\.css/u,
            ],
          },
        },
      },
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: [['text', { skipFull: false }], 'lcov'],
      include: ['src/**/*.{ts,tsx}', '.token-lint/*.mjs'],
      exclude: [
        'src/**/*.spec.{ts,tsx}',
        'src/**/*-fixtures.ts',
        'src/**/*.stories.tsx',
        'src/executable.ts',
        '.token-lint/*.spec.mjs',
      ],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
})
