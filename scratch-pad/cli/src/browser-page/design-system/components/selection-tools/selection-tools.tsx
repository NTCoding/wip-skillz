import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { Icon } from '../icon/icon'
import { threadKindLabels, threadKindNames, type ThreadKindName } from '../thread-kind/thread-kind'
import './selection-tools.css'

interface SelectionToolsProps {
  readonly top: number
  readonly centre: number
  readonly onPick: (kind: ThreadKindName) => void
  readonly onLeave: () => void
}

const gapAboveSelection = 8
const smallestLeft = 8

const moves: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1 }

export function SelectionTools({ top, centre, onPick, onLeave }: SelectionToolsProps) {
  const tools = useRef<HTMLDivElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const [current, setCurrent] = useState(0)
  useLayoutEffect(() => {
    const element = tools.current
    element?.style.setProperty(
      '--selection-tools-top',
      `${Math.round(top - element.offsetHeight - gapAboveSelection)}px`,
    )
    element?.style.setProperty(
      '--selection-tools-left',
      `${Math.round(Math.max(smallestLeft, centre - element.offsetWidth / 2))}px`,
    )
  }, [top, centre])
  useEffect(() => {
    const focusTheToolsFirst = (event: globalThis.KeyboardEvent): void => {
      const inTools = event.target instanceof Node && tools.current?.contains(event.target)
      if (event.key !== 'Tab' || event.shiftKey || inTools === true) {
        return
      }
      event.preventDefault()
      document.removeEventListener('keydown', focusTheToolsFirst, true)
      buttons.current[0]?.focus()
    }
    document.addEventListener('keydown', focusTheToolsFirst, true)
    return () => document.removeEventListener('keydown', focusTheToolsFirst, true)
  }, [])
  const move = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = moves[event.key]
    if (step === undefined) {
      return
    }
    event.preventDefault()
    const next = (current + step + threadKindNames.length) % threadKindNames.length
    setCurrent(next)
    buttons.current[next]?.focus()
  }
  const leaveWhenFocusLeaves = (event: FocusEvent<HTMLDivElement>): void => {
    if (!tools.current?.contains(event.relatedTarget)) {
      onLeave()
    }
  }
  return (
    <div
      ref={tools}
      className="selection-tools"
      role="toolbar"
      aria-label="Write about the selected text"
      onKeyDown={move}
      onBlur={leaveWhenFocusLeaves}
      onMouseDown={(event) => event.preventDefault()}
    >
      {threadKindNames.map((kind, index) => (
        <button
          key={kind}
          ref={(button) => {
            buttons.current[index] = button
          }}
          type="button"
          className="selection-tools__button"
          data-kind={kind}
          tabIndex={index === current ? 0 : -1}
          onClick={() => onPick(kind)}
        >
          <Icon name={kind} />
          {threadKindLabels[kind]}
        </button>
      ))}
    </div>
  )
}
