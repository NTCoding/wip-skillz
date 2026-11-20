import { ScratchPadError } from '../scratch-pad-error'
import { localDate } from '../local-time'
import { slugOf } from '../slug'

const longestSlug = 60

export class EmptyTopicError extends ScratchPadError {
  constructor(topic: string) {
    super(
      `"${topic}" can't be a folder name. Write a topic with letters or digits, like: scratch-pad new export job`,
    )
  }
}

export function scratchPadFolderName(topic: string, today: Date): string {
  const slug = slugOf(topic).slice(0, longestSlug).replace(/-$/, '')
  if (slug === '') {
    throw new EmptyTopicError(topic)
  }
  return `${localDate(today)}-${slug}`
}

export function scratchPadTitle(topic: string): string {
  const text = topic.trim()
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}
