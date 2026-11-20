import { ScratchPadError } from '../scratch-pad-error'

export const itemTypes = ['comment', 'decision', 'grammar', 'improvement'] as const
export type ItemType = (typeof itemTypes)[number]

const itemPrefixes: Readonly<Record<ItemType, string>> = {
  comment: 'c',
  decision: 'd',
  grammar: 'g',
  improvement: 'i',
}

const itemIdPattern = /^([cdgi])-[1-9]\d*$/

export class InvalidItemIdError extends ScratchPadError {
  constructor(id: string) {
    super(`"${id}" isn't an id. An id looks like c-1, g-1, i-1 or d-1.`)
  }
}

export function nextItemId(type: ItemType, existingIds: readonly string[]): string {
  const prefix = `${itemPrefixes[type]}-`
  const numbers = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
  return `${prefix}${Math.max(0, ...numbers) + 1}`
}

export function itemTypeOf(id: string): ItemType {
  const prefix = itemIdPattern.exec(id)?.[1]
  const type = itemTypes.find((candidate) => itemPrefixes[candidate] === prefix)
  if (type === undefined) {
    throw new InvalidItemIdError(id)
  }
  return type
}

export function itemTypeNoun(type: ItemType): string {
  return type === 'comment' || type === 'decision' ? type : `${type} note`
}
