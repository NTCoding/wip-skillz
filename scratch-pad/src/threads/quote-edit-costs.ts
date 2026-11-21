const wordBits = 32
const characterCodes = 1 << 16
const highestBit = 1 << (wordBits - 1)
const counting = { numbers: new Int32Array(0) }
const current = 0
const lowest = 1
const carried = 2

function positionsUpTo(count: number): Int32Array {
  if (counting.numbers.length < count) {
    counting.numbers = Int32Array.from({ length: count * 2 }, (_, index) => index)
  }
  return counting.numbers.subarray(0, count)
}

export class QuoteEditCosts {
  private readonly words: number
  private readonly matches: Int32Array
  private readonly lastBits: Int32Array

  constructor(private readonly quote: string) {
    this.words = Math.max(1, Math.ceil(quote.length / wordBits))
    this.matches = new Int32Array(characterCodes * this.words)
    positionsUpTo(quote.length).forEach((position) => {
      const at = quote.charCodeAt(position) * this.words + Math.floor(position / wordBits)
      this.matches[at] = Number(this.matches[at]) | (1 << (position % wordBits))
    })
    this.lastBits = Int32Array.from({ length: this.words }, (_, word) =>
      word === this.words - 1 ? 1 << ((quote.length - 1) % wordBits) : highestBit,
    )
  }

  lowestCostIn(text: string): number {
    const positive = new Int32Array(this.words).fill(-1)
    const negative = new Int32Array(this.words)
    const costs = Int32Array.of(this.quote.length, this.quote.length, 0)
    const wordIndexes = positionsUpTo(this.words)
    for (const at of positionsUpTo(text.length)) {
      const row = text.charCodeAt(at) * this.words
      costs[carried] = 0
      for (const word of wordIndexes) {
        const before: number = Number(costs[carried])
        const plus: number = Number(positive[word])
        const minus: number = Number(negative[word])
        const match: number = Number(this.matches[row + word])
        const vertical: number = match | minus
        const equal: number = match | Number(before < 0)
        const horizontal: number = (((equal & plus) + plus) ^ plus) | equal
        const up: number = minus | ~(horizontal | plus)
        const down: number = plus & horizontal
        const lastBit: number = Number(this.lastBits[word])
        costs[carried] = Number((up & lastBit) !== 0) - Number((down & lastBit) !== 0)
        const shiftedUp: number = (up << 1) | Number(before > 0)
        const shiftedDown: number = (down << 1) | Number(before < 0)
        positive[word] = shiftedDown | ~(vertical | shiftedUp)
        negative[word] = shiftedUp & vertical
      }
      costs[current] = Number(costs[current]) + Number(costs[carried])
      costs[lowest] = Math.min(Number(costs[lowest]), Number(costs[current]))
    }
    return Number(costs[lowest])
  }
}
