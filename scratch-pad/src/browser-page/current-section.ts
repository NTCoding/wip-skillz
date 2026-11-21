import { useEffect, useState } from 'react'

const readingOffset = 120

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
      setCurrent(passed.at(-1) ?? ids[0])
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
