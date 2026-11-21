const latinSpellings: readonly (readonly [string, string])[] = [
  ['ß', 'ss'],
  ['æ', 'ae'],
  ['ø', 'o'],
  ['œ', 'oe'],
  ['ł', 'l'],
  ['đ', 'd'],
  ['ð', 'd'],
  ['þ', 'th'],
  ['ħ', 'h'],
  ['ı', 'i'],
]

export function slugOf(text: string): string {
  return withoutOuterDashes(plainLatinLetters(text).replaceAll(/[^a-z0-9]+/g, '-'))
}

export function headingIdOf(text: string): string {
  return withoutOuterDashes(plainLatinLetters(text).replaceAll(/[^\p{L}\p{M}\p{N}]+/gu, '-'))
}

function plainLatinLetters(text: string): string {
  const withoutAccents = text
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .normalize('NFC')
  return latinSpellings.reduce(
    (spelled, [letter, spelling]) => spelled.replaceAll(letter, spelling),
    withoutAccents,
  )
}

function withoutOuterDashes(text: string): string {
  return text.replaceAll(/^-|-$/g, '')
}
