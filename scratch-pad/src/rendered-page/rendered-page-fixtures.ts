import { renderPage, type RenderedPage } from './rendered-page'

export function renderedInvoicePage(
  markdown: readonly string[],
  customFiles: Readonly<Record<string, string>> = {},
): RenderedPage {
  return renderPage({
    page: 'pages/invoice-template.md',
    markdown: markdown.join('\n'),
    readCustomFile: (file) => customFiles[file],
  })
}

export function invoiceHtml(markdown: readonly string[]): string {
  return renderedInvoicePage(markdown).html
}
