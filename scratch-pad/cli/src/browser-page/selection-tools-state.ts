import { useEffect, useState, type RefObject } from 'react'
import { selectedBlockText, type SelectedBlockText } from './selected-block'

// The selection tools are shown above the text that Nick selects in the page. They're hidden when
// Nick presses Escape.
export function useSelectionTools(
  pageText: RefObject<HTMLElement | null>,
  tools: RefObject<HTMLDivElement | null>,
): [SelectedBlockText | undefined, (selection: SelectedBlockText | undefined) => void] {
  const [selected, setSelected] = useState<SelectedBlockText | undefined>(undefined)
  useEffect(() => {
    const update = (event: MouseEvent | KeyboardEvent): void => {
      const insideTools = event.target instanceof Node && tools.current?.contains(event.target)
      const selecting = event instanceof MouseEvent || event.shiftKey || event.key === 'Shift'
      if (!insideTools && selecting) {
        setSelected(selectedBlockText(document.getSelection(), pageText.current))
      }
    }
    const hideOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setSelected(undefined)
      }
    }
    document.addEventListener('mouseup', update)
    document.addEventListener('keyup', update)
    document.addEventListener('keydown', hideOnEscape)
    return () => {
      document.removeEventListener('mouseup', update)
      document.removeEventListener('keyup', update)
      document.removeEventListener('keydown', hideOnEscape)
    }
  }, [pageText, tools])
  return [selected, setSelected]
}
