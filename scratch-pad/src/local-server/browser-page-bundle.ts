export interface BrowserPageBundle {
  readonly script: string
  readonly stylesheet: string
}

// pnpm build replaces this value with the bundle of src/browser-page/browser-page.tsx
// and its CSS. Without the build, the server sends an empty script and an empty stylesheet.
export const browserPageBundle: BrowserPageBundle = { script: '', stylesheet: '' }
