import { type Answer, type ViewedPage } from './api-responses'
import { type ThreadKindName } from './design-system/design-system'
import { type PageElementContext } from './page-elements'
import { wholeBlockSelection, type BlockSelection } from './selected-block'

export type PageContext = Omit<
  PageElementContext,
  'page' | 'onAnswerDecision' | 'onCommentOnBlock' | 'answersOnThisPage'
>

type AnswerDecision = (id: string, page: string, answer: Answer) => Promise<void>

interface ElementEvents {
  readonly startDraft: (kind: ThreadKindName, selection: BlockSelection) => void
  // After Nick has answered a decision, its card is opened in the margin.
  readonly answered: (id: string, choice: Answer) => void
}

// Without answerDecision, the page is read only, so Nick can't comment on a block or answer a
// decision.
export function elementContextOf(
  context: PageContext,
  page: ViewedPage,
  choices: ReadonlyMap<string, Answer>,
  answerDecision: AnswerDecision | undefined,
  events: ElementEvents,
): PageElementContext {
  return {
    ...context,
    page,
    answersOnThisPage: choices,
    onCommentOnBlock:
      answerDecision === undefined
        ? undefined
        : (lines) => {
            const selection = wholeBlockSelection(lines)
            if (selection !== undefined) {
              events.startDraft('comment', selection)
            }
          },
    onAnswerDecision:
      answerDecision === undefined
        ? undefined
        : async (id, choice) => {
            await answerDecision(id, page.page, choice)
            events.answered(id, choice)
          },
  }
}
