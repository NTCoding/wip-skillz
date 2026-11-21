import { normalisedText } from '../rendered-page/page-blocks'

export const contextLength = 32

export function contextBefore(textBefore: string): string {
  return [...normalisedText(textBefore)].slice(-contextLength).join('').trimStart()
}

export function contextAfter(textAfter: string): string {
  return [...normalisedText(textAfter)].slice(0, contextLength).join('').trimEnd()
}
