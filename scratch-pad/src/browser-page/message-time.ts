const messageTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function shownTime(time: string): string {
  return messageTimeFormat.format(new Date(time))
}
