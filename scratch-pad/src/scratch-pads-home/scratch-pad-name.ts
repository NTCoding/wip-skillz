import { ScratchPadError } from '../scratch-pad-error'

const longestSlug = 60

export class EmptyTopicError extends ScratchPadError {
  constructor(topic: string) {
    super(
      `"${topic}" can't be a folder name. Write a topic with letters or digits, like: scratch-pad new export job`,
    )
  }
}

export function scratchPadFolderName(topic: string, today: Date): string {
  const slug = topic
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, longestSlug)
    .replace(/-$/, '')
  if (slug === '') {
    throw new EmptyTopicError(topic)
  }
  return `${localDate(today)}-${slug}`
}

export function scratchPadTitle(topic: string): string {
  const text = topic.trim()
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

function localDate(today: Date): string {
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${day}`
}
