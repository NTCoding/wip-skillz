export function countedNoun(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function listOfCounts(counts: readonly string[]): string {
  return counts.length === 0 ? 'nothing' : counts.join(', ')
}
