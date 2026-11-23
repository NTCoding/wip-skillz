import { useCallback, useEffect, useState } from 'react'
import { type PageSummary, type SearchResult } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import {
  CommandPalette,
  IconButton,
  problemOf,
  type CommandPaletteResult,
} from './design-system/design-system'
import { type ScratchPadSearch } from './scratch-pad-connection'
import { type SearchMatchOnPage } from './text-highlights'

// The search will only ask the server after Nick has stopped typing for this long.
export const searchDelayMilliseconds = 1000

export interface SearchMatch extends SearchMatchOnPage {
  readonly page: string
}

export function searchMatchOn(
  match: SearchMatch | undefined,
  page: string,
): SearchMatch | undefined {
  return match?.page === page ? match : undefined
}

interface FoundResults {
  readonly query: string
  readonly results: readonly SearchResult[]
}

const nothingFound: FoundResults = { query: '', results: [] }

const searchLabel = 'Search the pages'

interface PadSearchProps {
  readonly search: ScratchPadSearch['search']
  readonly pages: readonly PageSummary[]
  readonly onOpen: (match: SearchMatch) => void
}

interface FoundResult extends CommandPaletteResult {
  readonly match: SearchMatch
}

function paletteResults(found: FoundResults, pages: readonly PageSummary[]): FoundResult[] {
  return found.results.map((result, index) => {
    const title = pages.find((summary) => summary.page === result.page)?.title
    const place = [title ?? fileOfPage(result.page), result.heading].filter(
      (part) => part !== undefined,
    )
    return {
      key: `${result.page} ${String(index)}`,
      place: place.join(' › '),
      snippet: result.snippet,
      matches: result.matches,
      match: { page: result.page, headingId: result.headingId, query: found.query },
    }
  })
}

function useOpenOnShortcut(open: () => void): void {
  useEffect(() => {
    const openOnShortcut = (event: KeyboardEvent): void => {
      if (event.metaKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        open()
      }
    }
    document.addEventListener('keydown', openOnShortcut)
    return () => document.removeEventListener('keydown', openOnShortcut)
  }, [open])
}

// The state of the palette isn't reset after the palette has closed. That's why ⌘K shows the
// query again with the same result selected. A response for an older query is dropped, because
// Nick has typed since.
export function PadSearch({ search, pages, onOpen }: PadSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState(nothingFound)
  const [selected, setSelected] = useState(0)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const openPalette = useCallback(() => setOpen(true), [])
  useOpenOnShortcut(openPalette)
  useEffect(() => {
    if (query.trim() === '') {
      return undefined
    }
    const latest = { query: true }
    const timer = setTimeout(() => {
      search(query)
        .then((results) => {
          if (latest.query) {
            setFound({ query, results })
            setSelected(0)
            setProblem(undefined)
          }
        })
        .catch((error: unknown) => {
          if (latest.query) {
            setFound(nothingFound)
            setProblem(problemOf(error))
          }
        })
    }, searchDelayMilliseconds)
    return () => {
      latest.query = false
      clearTimeout(timer)
    }
  }, [query, search])
  // The old results are removed as soon as the query changes. So ↵ can't open a result of the old
  // query while the palette waits for Nick to stop typing.
  const changeQuery = (next: string): void => {
    setQuery(next)
    setFound(nothingFound)
    setSelected(0)
    if (next.trim() === '') {
      setProblem(undefined)
    }
  }
  const searched = found.query.trim()
  const choose = (result: FoundResult): void => {
    setOpen(false)
    onOpen(result.match)
  }
  return (
    <>
      <IconButton icon="search" label={searchLabel} pressed={open} onClick={openPalette} />
      <CommandPalette
        label={searchLabel}
        open={open}
        query={query}
        results={paletteResults(found, pages)}
        selected={selected}
        problem={problem}
        queryWithoutResults={searched !== '' && found.results.length === 0 ? searched : undefined}
        onQueryChange={changeQuery}
        onSelect={setSelected}
        onChoose={choose}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

// Opening a search match goes to the page and the heading of the match. The highlight of the match
// stays on the page until Nick clicks anywhere or presses Escape. The page removes the highlight as
// soon as the mouse button is pressed. So the click that opened the result doesn't remove the
// highlight.
export function useSearchMatch(
  navigate: (href: string) => void,
  pageHref: PadAddresses['pageHref'],
): [SearchMatch | undefined, (match: SearchMatch) => void] {
  const [match, setMatch] = useState<SearchMatch | undefined>(undefined)
  useEffect(() => {
    if (match === undefined) {
      return undefined
    }
    const remove = (): void => setMatch(undefined)
    const removeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        remove()
      }
    }
    document.addEventListener('mousedown', remove)
    document.addEventListener('keydown', removeOnEscape)
    return () => {
      document.removeEventListener('mousedown', remove)
      document.removeEventListener('keydown', removeOnEscape)
    }
  }, [match])
  const openSearchMatch = (opened: SearchMatch): void => {
    setMatch(opened)
    navigate(pageHref(fileOfPage(opened.page), opened.headingId))
  }
  return [match, openSearchMatch]
}
