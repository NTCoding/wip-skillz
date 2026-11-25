// The number in a page's file name sets the place of the page in the order and its parent page.
// The id of a page is the file name without the number. That's why a renumbered page doesn't
// lose its address or the threads and the decisions that Nick wrote on the page.
const numberedFilePattern = /^pages\/(\d+(?:\.\d+)*)-([^/]+\.md)$/
const leadingZeroPattern = /^0+(?=\d)/
const indexPage = 'pages/index.md'

export interface PageFile {
  readonly page: string
  readonly file: string
  readonly number: string | undefined
  readonly hasLeadingZero: boolean
}

export interface PageLines {
  readonly file: string
  readonly lines: readonly string[]
}

export interface StoredPageId {
  readonly stored: string
  readonly page: string
}

export function pageFileOf(file: string): PageFile {
  const match = numberedFilePattern.exec(file)
  if (match === null) {
    return { page: file, file, number: undefined, hasLeadingZero: false }
  }
  const written = String(match[1]).split('.')
  const parts = written.map((part) => part.replace(leadingZeroPattern, ''))
  return {
    page: `pages/${String(match[2])}`,
    file,
    number: parts.join('.'),
    hasLeadingZero: parts.some((part, index) => part !== written[index]),
  }
}

export function pageFilesInOrder(files: readonly PageFile[]): PageFile[] {
  return files.toSorted(
    (first, second) =>
      placeOf(first) - placeOf(second) ||
      byNumber(numberParts(first), numberParts(second)) ||
      first.file.localeCompare(second.file),
  )
}

// The number for a new sub page of a page. A page of the top level is a sub page of the index
// page, so the parent number is undefined for the index page. The new number follows the numbers of
// the sub pages that the parent already has.
export function nextSubPageNumber(
  files: readonly PageFile[],
  parentNumber: string | undefined,
): string {
  const prefix = parentNumber === undefined ? '' : `${parentNumber}.`
  const last = files.flatMap((file) => {
    if (!file.number?.startsWith(prefix)) {
      return []
    }
    const rest = file.number.slice(prefix.length)
    return /^\d+$/u.test(rest) ? [Number(rest)] : []
  })
  return `${prefix}${Math.max(0, ...last) + 1}`
}

export function parentNumberOf(number: string | undefined): string | undefined {
  const parts = number?.split('.') ?? []
  return parts.length < 2 ? undefined : parts.slice(0, -1).join('.')
}

export function isUnderNumber(number: string | undefined, parent: string | undefined): boolean {
  return number !== undefined && parent !== undefined && number.startsWith(`${parent}.`)
}

// The build before the numbers stored a page under its file name. A file name with digits and a
// dash at its start, like pages/2026-plan.md, is now read as a number and a name. Each stored
// page that is the path of a real file rather than an id is given the id of that file.
export function storedPageIds(
  stored: readonly string[],
  files: readonly PageFile[],
): StoredPageId[] {
  const pages = new Set(files.map((file) => file.page))
  return [...new Set(stored)].flatMap((page) => {
    const file = files.find((each) => each.file === page)
    return file === undefined || pages.has(page) ? [] : [{ stored: page, page: file.page }]
  })
}

function placeOf(file: PageFile): number {
  if (file.page === indexPage) {
    return 0
  }
  return file.number === undefined ? 2 : 1
}

function numberParts(file: PageFile): string[] {
  return file.number === undefined ? [] : file.number.split('.')
}

function byNumber(first: readonly string[], second: readonly string[]): number {
  const differs = first.findIndex((part, index) => part !== second[index])
  return differs === -1 || differs >= second.length
    ? first.length - second.length
    : byPart(String(first[differs]), String(second[differs]))
}

function byPart(first: string, second: string): number {
  return first.length - second.length || first.localeCompare(second)
}
