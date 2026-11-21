// The number in a page's file name sets the place of the page in the order and its parent page.
// The id of a page is the file name without the number. That's why a renumbered page doesn't
// lose its address or the threads and the decisions that Nick wrote on the page.
const numberedFilePattern = /^pages\/(\d+(?:\.\d+)*)-([^/]+\.md)$/
const indexPage = 'pages/index.md'

export interface PageFile {
  readonly page: string
  readonly file: string
  readonly number: string | undefined
}

export interface PageLines {
  readonly file: string
  readonly lines: readonly string[]
}

export function pageFileOf(file: string): PageFile {
  const match = numberedFilePattern.exec(file)
  return match === null
    ? { page: file, file, number: undefined }
    : { page: `pages/${String(match[2])}`, file, number: match[1] }
}

export function pageFilesInOrder(files: readonly PageFile[]): PageFile[] {
  return files.toSorted(
    (first, second) =>
      placeOf(first) - placeOf(second) ||
      byNumber(numberParts(first), numberParts(second)) ||
      first.file.localeCompare(second.file),
  )
}

export function parentNumberOf(number: string | undefined): string | undefined {
  const parts = number?.split('.') ?? []
  return parts.length < 2 ? undefined : parts.slice(0, -1).join('.')
}

export function isUnderNumber(number: string | undefined, parent: string | undefined): boolean {
  return number !== undefined && parent !== undefined && number.startsWith(`${parent}.`)
}

function placeOf(file: PageFile): number {
  if (file.page === indexPage) {
    return 0
  }
  return file.number === undefined ? 2 : 1
}

function numberParts(file: PageFile): number[] {
  return file.number === undefined ? [] : file.number.split('.').map(Number)
}

function byNumber(first: readonly number[], second: readonly number[]): number {
  const differs = first.findIndex((part, index) => part !== second[index])
  return differs === -1 || differs >= second.length
    ? first.length - second.length
    : Number(first[differs]) - Number(second[differs])
}
