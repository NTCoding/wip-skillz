import { pageBlocksOf, type PageBlock } from '../rendered-page/page-blocks'
import { QuoteEditCosts } from './quote-edit-costs'
import {
  allowedEdits,
  exactMatches,
  similarMatches,
  wordBoundariesOf,
  type QuoteMatch,
} from './quote-match'

export interface FoundQuote {
  readonly block: PageBlock
  readonly found: QuoteMatch
}

const rememberedPages = 8
const searchedPages = new Map<string, SearchedPage>()

export function searchedPageOf(markdown: string): SearchedPage {
  const page = searchedPages.get(markdown) ?? new SearchedPage(markdown)
  searchedPages.delete(markdown)
  searchedPages.set(markdown, page)
  ;[...searchedPages.keys()]
    .slice(0, -rememberedPages)
    .forEach((forgotten) => searchedPages.delete(forgotten))
  return page
}

export class SearchedPage {
  readonly blocks: readonly PageBlock[]
  private readonly boundaries = new Map<PageBlock, Uint8Array>()

  constructor(markdown: string) {
    this.blocks = pageBlocksOf(markdown)
  }

  exactCopies(quote: string): FoundQuote[] {
    return this.blocks.flatMap((block) =>
      exactMatches(quote, block.text).map((found) => ({ block, found })),
    )
  }

  similarCopies(quote: string): FoundQuote[] {
    if (quote === '') {
      return []
    }
    const editCosts = new QuoteEditCosts(quote)
    const allowed = allowedEdits(quote)
    return this.blocks
      .filter((block) => editCosts.lowestCostIn(block.text) <= allowed)
      .flatMap((block) =>
        similarMatches(quote, block.text, this.wordBoundaries(block)).map((found) => ({
          block,
          found,
        })),
      )
  }

  private wordBoundaries(block: PageBlock): Uint8Array {
    const boundaries = this.boundaries.get(block) ?? wordBoundariesOf(block.text)
    this.boundaries.set(block, boundaries)
    return boundaries
  }
}
