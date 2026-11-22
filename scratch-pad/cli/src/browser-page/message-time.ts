const messageTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function shownTime(time: string): string {
  return messageTimeFormat.format(new Date(time))
}

const minute = 60_000

// How long ago a time was, like "25 min ago" or "yesterday"
export function timeAgo(time: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(time)) / minute)
  if (minutes < 1) {
    return 'just now'
  }
  if (minutes < 60) {
    return `${minutes} min ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  const days = Math.floor(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}
