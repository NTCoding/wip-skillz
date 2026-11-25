import { type Answer, type ViewedPage } from './api-responses'
import { type ThreadKindName } from './design-system/design-system'
import { type PageElementContext } from './page-elements'
import { wholeBlockSelection, type BlockSelection } from './selected-block'

export type PageContext = Omit<
  PageElementContext,
  | 'page'
  | 'onAnswerDecision'
  | 'onRequestDecisionChanges'
  | 'onCommentOnBlock'
  | 'answersOnThisPage'
>

type AnswerDecision = (id: string, page: string, answer: Answer) => Promise<void>
type RequestDecisionChanges = (id: string, page: string, reason: string) => Promise<void>

// Nick asks the agent to change the page of a decision. He has to write a reason.
export interface DecisionChangeRequests {
  readonly requestDecisionChanges: RequestDecisionChanges
}

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
  changeRequests: DecisionChangeRequests | undefined,
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
    onRequestDecisionChanges:
      changeRequests === undefined
        ? undefined
        : (id, reason) => changeRequests.requestDecisionChanges(id, page.page, reason),
    onAnswerDecision:
      answerDecision === undefined
        ? undefined
        : async (id, choice) => {
            await answerDecision(id, page.page, choice)
            events.answered(id, choice)
          },
  }
}
