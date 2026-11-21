export class BrowserPageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrowserPageError'
  }
}
