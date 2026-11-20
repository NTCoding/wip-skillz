import { type NamedBlock, type NamedBlockContent } from './named-block'
import { type PageProblem } from './page-problem'

const fileOption = 'file='
const customHtmlPattern = /^custom\/[^/]+\.html$/

export type CustomFileReader = (file: string) => string | undefined

export function isCustomHtmlPath(file: string): boolean {
  return customHtmlPattern.test(file)
}

export function htmlBlockContent(
  block: NamedBlock,
  readCustomFile: CustomFileReader,
): NamedBlockContent {
  const content = (html: string, problems: readonly PageProblem[]): NamedBlockContent => ({
    className: 'html-block',
    attributes: [],
    html,
    problems,
    decision: undefined,
  })
  const line = block.lines.firstLine
  if (block.options === '') {
    return content(block.body, [])
  }
  const file = block.options.startsWith(fileOption) ? block.options.slice(fileOption.length) : ''
  if (!isCustomHtmlPath(file)) {
    return content('', [{ line, text: 'the :::html block only takes file=custom/<name>.html' }])
  }
  const inline =
    block.body.trim() === ''
      ? []
      : [{ line, text: `the :::html block reads ${file} and has HTML inside it too` }]
  const html = readCustomFile(file)
  return html === undefined
    ? content('', [
        ...inline,
        { line, text: `the :::html block reads ${file}, which doesn't exist` },
      ])
    : content(html, inline)
}
