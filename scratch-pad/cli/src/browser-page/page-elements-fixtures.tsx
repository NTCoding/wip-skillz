import { render } from '@testing-library/react'
import { type ViewedPage } from './api-responses'
import { exportPadAddresses, indexPage } from './browser-page-fixtures'
import { pageElements, parsedPageBody, type PageElementContext } from './page-elements'

export function contextFor(page: ViewedPage, overrides: Partial<PageElementContext> = {}) {
  const context: PageElementContext = {
    addresses: exportPadAddresses,
    page,
    onNavigate: () => undefined,
    loadPreview: () => Promise.resolve(undefined),
    findTask: () => undefined,
    onAnswerDecision: () => Promise.resolve(),
    onRequestDecisionChanges: undefined,
    onCommentOnBlock: () => undefined,
    answersOnThisPage: new Map(),
    ...overrides,
  }
  return context
}

export function renderPage(page: ViewedPage, overrides: Partial<PageElementContext> = {}) {
  const context = contextFor(page, overrides)
  return render(<article>{pageElements(context, parsedPageBody(page.html), new Map())}</article>)
}

type DecisionOnPage = ViewedPage['decisions'][number]

export function answeredDecision(
  id: string,
  question: string | undefined,
  answer: DecisionOnPage['answer'],
): DecisionOnPage {
  return { id, question, answer, reviews: [], options: undefined }
}

export function withHtml(html: string): ViewedPage {
  return { ...indexPage, html, links: [], decisions: [] }
}
