import { useEffect, useState } from 'react'

// The address is the section in the address of the page and the number of navigations so far.
export interface PageAddress {
  readonly section: string | undefined
  readonly navigations: number
}

const readingOffset = 120
const bottomTolerance = 2
const scrollingInputs = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const

// The last heading of a short page can't reach the reading line. So the last section is current
// once Nick has scrolled to the bottom of the page, as long as he has scrolled at all.
function atBottomOfPage(): boolean {
  const { scrollY, innerHeight } = window
  return (
    scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - bottomTolerance
  )
}

function measuredSection(ids: readonly string[]): string | undefined {
  const passed = ids.filter((id) => {
    const heading = document.getElementById(id)
    return heading !== null && heading.getBoundingClientRect().top <= readingOffset
  })
  return atBottomOfPage() ? ids.at(-1) : (passed.at(-1) ?? ids[0])
}

function useMeasuredSection(key: string): string | undefined {
  const [measured, setMeasured] = useState<string | undefined>(undefined)
  useEffect(() => {
    const ids = key === '' ? [] : key.split('\n')
    const update = (): void => setMeasured(measuredSection(ids))
    const frame = requestAnimationFrame(update)
    const resizes = new ResizeObserver(update)
    resizes.observe(document.body)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      resizes.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [key])
  return measured
}

// A section that Nick went to stays current until he scrolls, even when the page can't scroll its
// heading up to the reading line.
function usePinnedSection(address: PageAddress): string | undefined {
  const [pinned, setPinned] = useState(address.section)
  const [followed, setFollowed] = useState(address)
  if (followed.section !== address.section || followed.navigations !== address.navigations) {
    setFollowed(address)
    setPinned(address.section)
  }
  useEffect(() => {
    if (pinned === undefined) {
      return undefined
    }
    const unpin = (): void => setPinned(undefined)
    for (const input of scrollingInputs) {
      window.addEventListener(input, unpin, { passive: true })
    }
    return () => {
      for (const input of scrollingInputs) {
        window.removeEventListener(input, unpin)
      }
    }
  }, [pinned])
  return pinned
}

export function useCurrentSection(
  sectionIds: readonly string[],
  address: PageAddress,
): string | undefined {
  const measured = useMeasuredSection(sectionIds.join('\n'))
  const pinned = usePinnedSection(address)
  return pinned !== undefined && sectionIds.includes(pinned) ? pinned : measured
}
