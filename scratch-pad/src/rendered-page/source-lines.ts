import { type Token } from 'markdown-it'

export interface SourceLines {
  readonly firstLine: number
  readonly lastLine: number
}

export function sourceLinesOf(
  map: readonly [number, number],
  lines: readonly string[],
): SourceLines {
  const firstLine = map[0] + 1
  const lastText = lines.slice(map[0], map[1]).findLastIndex((text) => text.trim() !== '')
  return { firstLine, lastLine: firstLine + Math.max(0, lastText) }
}

export function linesAttribute(lines: SourceLines): string {
  return `${lines.firstLine}-${lines.lastLine}`
}

export function markTopLevelBlocks(tokens: readonly Token[], lines: readonly string[]): void {
  tokens.forEach((token) => {
    if (token.level === 0 && token.map !== null) {
      token.attrSet('data-lines', linesAttribute(sourceLinesOf(token.map, lines)))
    }
  })
}
