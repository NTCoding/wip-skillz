import { type ViewedPage } from '../nick-views/nick-views'
import { pageMarkdownParser } from '../rendered-page/page-markdown-parser'

function escaped(text: string): string {
  return pageMarkdownParser.utils.escapeHtml(text)
}

function htmlDocument(title: string, body: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escaped(title)}</title>`,
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
    '',
  ].join('\n')
}

export function homePageHtml(home: string, names: readonly string[]): string {
  const links = names.map(
    (name) => `<li><a href="/${encodeURIComponent(name)}/">${escaped(name)}</a></li>`,
  )
  return htmlDocument(
    'Scratch pads',
    [
      '<main>',
      '<h1>Scratch pads</h1>',
      `<p>${escaped(home)}</p>`,
      `<ul>${links.join('')}</ul>`,
      '</main>',
    ].join('\n'),
  )
}

export function browserPageHtml(padName: string, page: ViewedPage): string {
  return htmlDocument(
    `${page.title ?? page.page} · ${padName}`,
    [
      `<main id="scratch-pad-page" data-scratch-pad="${escaped(padName)}" data-page="${escaped(page.page)}">`,
      page.html,
      '</main>',
    ].join('\n'),
  )
}
