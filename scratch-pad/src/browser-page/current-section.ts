import { useEffect, useState } from 'react'

const readingOffset = 120
const bottomTolerance = 2

// The last heading of a short page can't reach the reading line. So the last section is current
// once Nick has scrolled to the bottom of the page, as long as he has scrolled at all.
function atBottomOfPage(): boolean {
  const { scrollY, innerHeight } = window
  return (
    scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - bottomTolerance
  )
}

export function useCurrentSection(sectionIds: readonly string[]): string | undefined {
  const key = sectionIds.join('\n')
  const [current, setCurrent] = useState<string | undefined>(undefined)
  useEffect(() => {
    const ids = key === '' ? [] : key.split('\n')
    const update = (): void => {
      const passed = ids.filter((id) => {
        const heading = document.getElementById(id)
        return heading !== null && heading.getBoundingClientRect().top <= readingOffset
      })
      setCurrent(atBottomOfPage() ? ids.at(-1) : (passed.at(-1) ?? ids[0]))
    }
    const frame = requestAnimationFrame(update)
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
    }
  }, [key])
  return current
}
