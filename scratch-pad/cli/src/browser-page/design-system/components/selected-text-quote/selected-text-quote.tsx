import { Highlight } from '../highlight/highlight'
import { type ThreadKindName } from '../thread-kind/thread-kind'
import './selected-text-quote.css'

// The text that Nick selected for a thread and the text around it, which the full size view
// quotes above the messages
export interface ThreadQuote {
  readonly prefix: string | undefined
  readonly selectedText: string
  readonly suffix: string | undefined
}

interface SelectedTextQuoteProps {
  readonly quote: ThreadQuote
  readonly kind: ThreadKindName
}

const startsWithClosingMark = /^[\s.,;:!?)\]}’”…]/u
const endsWithOpeningMark = /[\s([{‘“]$/u

// The prefix and the suffix are stored without the space next to the selected text. So the quote
// puts a space back between 2 parts of the text. An empty part doesn't need a space. Neither does
// a full stop after the selected text or a bracket before the selected text.
function spaceBetween(before: string | undefined, after: string | undefined): string {
  const noSpace =
    before === undefined ||
    after === undefined ||
    before === '' ||
    after === '' ||
    endsWithOpeningMark.test(before) ||
    startsWithClosingMark.test(after)
  return noSpace ? '' : ' '
}

export function SelectedTextQuote({ quote, kind }: SelectedTextQuoteProps) {
  return (
    <blockquote className="selected-text-quote">
      {quote.prefix}
      {spaceBetween(quote.prefix, quote.selectedText)}
      <Highlight threads={[]} kind={kind} active={false}>
        {quote.selectedText}
      </Highlight>
      {spaceBetween(quote.selectedText, quote.suffix)}
      {quote.suffix}
    </blockquote>
  )
}
