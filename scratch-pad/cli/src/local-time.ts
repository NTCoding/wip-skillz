export function localDate(time: Date): string {
  return `${time.getFullYear()}-${twoDigits(time.getMonth() + 1)}-${twoDigits(time.getDate())}`
}

export function localTime(isoTime: string): string {
  const time = new Date(isoTime)
  return `${localDate(time)} ${twoDigits(time.getHours())}:${twoDigits(time.getMinutes())}`
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}
