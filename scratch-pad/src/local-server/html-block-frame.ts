export const htmlBlockFramePath = '/browser-page/html-block-frame.html'

export const htmlBlockFramePolicy = [
  'sandbox allow-scripts',
  "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'",
  'connect-src https:',
  "form-action 'none'",
  "frame-ancestors 'self'",
].join('; ')
