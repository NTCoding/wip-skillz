import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Icon } from '../icon/icon'
import './command-palette.css'

interface MatchInSnippet {
  readonly start: number
  readonly end: number
}

export interface CommandPaletteResult {
  readonly key: string
  // Where the result is, like "Invoice export › How the job runs"
  readonly place: string
  readonly snippet: string
  // The places of the query in the snippet, which are highlighted
  readonly matches: readonly MatchInSnippet[]
}

// CommandPalette is a field and a list of results over the dimmed page. The feature controls the
// query and the selected result. That's why the palette will show the same query and the same
// selected result if Nick opens it again. ↑ and ↓ move the selection, ↵ chooses the selected
// result. Esc or a click on the dimmed page closes the palette.
interface CommandPaletteProps<Result extends CommandPaletteResult> {
  readonly label: string
  readonly open: boolean
  readonly query: string
  readonly results: readonly Result[]
  readonly selected: number
  // The problem of the last search, which is shown under the field with role="alert"
  readonly problem?: string | undefined
  // The query of a search that has returned without any results, which the palette shows in a
  // message under the field
  readonly queryWithoutResults?: string | undefined
  readonly onQueryChange: (query: string) => void
  readonly onSelect: (index: number) => void
  readonly onChoose: (result: Result) => void
  readonly onClose: () => void
}

function highlightedSnippet({ snippet, matches }: CommandPaletteResult): ReactNode[] {
  const marked = matches.reduce<{ readonly pieces: readonly ReactNode[]; readonly end: number }>(
    (done, match) => ({
      end: match.end,
      pieces: [
        ...done.pieces,
        snippet.slice(done.end, match.start),
        <mark key={match.start} className="command-palette__match">
          {snippet.slice(match.start, match.end)}
        </mark>,
      ],
    }),
    { pieces: [], end: 0 },
  )
  return [...marked.pieces, snippet.slice(marked.end)]
}

export function CommandPalette<Result extends CommandPaletteResult>(
  props: CommandPaletteProps<Result>,
) {
  const { open, results, selected } = props
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  useLayoutEffect(() => {
    if (!open) {
      return undefined
    }
    const opener = document.querySelector<HTMLElement>(':focus')
    dialog.current?.showModal()
    field.current?.focus()
    return () => opener?.focus()
  }, [open])
  const { onClose } = props
  // A click on the dimmed page is a click on the dialog itself, because the content of the dialog
  // fills the whole dialog. The press has to start on the dimmed page too. So a selection in the
  // field that ends on the dimmed page doesn't close the palette.
  useEffect(() => {
    const element = dialog.current
    const press = { onBackdrop: false }
    const notePress = (event: MouseEvent): void => {
      press.onBackdrop = event.target === element
    }
    const closeOnBackdrop = (event: MouseEvent): void => {
      if (press.onBackdrop && event.target === element) {
        onClose()
      }
    }
    element?.addEventListener('mousedown', notePress)
    element?.addEventListener('click', closeOnBackdrop)
    return () => {
      element?.removeEventListener('mousedown', notePress)
      element?.removeEventListener('click', closeOnBackdrop)
    }
  }, [open, onClose])
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, results, selected])
  if (!open) {
    return null
  }
  // The focus stays in the field while Nick moves the selection. The propagation of the Escape is
  // stopped, because the Escape only closes the palette. The listeners of the page never receive
  // that Escape.
  const followKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    const last = results.length - 1
    const moves: Readonly<Record<string, number>> = {
      ArrowDown: Math.min(selected + 1, last),
      ArrowUp: Math.max(selected - 1, 0),
    }
    const move = moves[event.key]
    if (move !== undefined && last >= 0) {
      event.preventDefault()
      props.onSelect(move)
    }
    const chosen = results[selected]
    if (event.key === 'Enter' && chosen !== undefined) {
      event.preventDefault()
      props.onChoose(chosen)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      props.onClose()
    }
  }
  const optionId = (index: number): string => `${id}-result-${String(index)}`
  return (
    <dialog
      ref={dialog}
      className="command-palette"
      aria-label={props.label}
      onClose={() => props.onClose()}
    >
      <div className="command-palette__field">
        <Icon name="search" />
        <input
          ref={field}
          className="command-palette__query"
          type="text"
          role="combobox"
          aria-label={props.label}
          aria-expanded={results.length > 0}
          aria-controls={`${id}-results`}
          aria-activedescendant={results.length > 0 ? optionId(selected) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          onKeyDown={followKey}
        />
        <kbd className="command-palette__key">esc</kbd>
      </div>
      {props.problem !== undefined && (
        <p className="command-palette__problem" role="alert">
          {props.problem}
        </p>
      )}
      {props.queryWithoutResults !== undefined && (
        <p className="command-palette__empty" role="status">
          No results for “{props.queryWithoutResults}”
        </p>
      )}
      <ul
        ref={list}
        id={`${id}-results`}
        className="command-palette__results"
        role="listbox"
        aria-label="Results"
      >
        {results.map((result, index) => (
          <li
            key={result.key}
            id={optionId(index)}
            className="command-palette__result"
            role="option"
            tabIndex={-1}
            aria-selected={index === selected}
            onClick={() => props.onChoose(result)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                props.onChoose(result)
              }
            }}
          >
            <span className="command-palette__text">
              <span className="command-palette__place">
                <Icon name="page" />
                <span className="command-palette__place-text">{result.place}</span>
              </span>
              <span className="command-palette__snippet">{highlightedSnippet(result)}</span>
            </span>
            <span className="command-palette__enter" aria-hidden="true">
              ↵
            </span>
          </li>
        ))}
      </ul>
      <div className="command-palette__keys">
        <span className="command-palette__hint">
          <kbd className="command-palette__key">↑</kbd>
          <kbd className="command-palette__key">↓</kbd>
          to move
        </span>
        <span className="command-palette__hint">
          <kbd className="command-palette__key">↵</kbd>
          to open
        </span>
        <span className="command-palette__hint">
          <kbd className="command-palette__key">esc</kbd>
          to close
        </span>
      </div>
    </dialog>
  )
}
