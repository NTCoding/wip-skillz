import { type Key, type ReactNode } from 'react'
import { type ViewedPage } from './api-responses'
import { DecisionForm } from './decision-form'
import {
  DecisionCard,
  DecisionPageStatus,
  TableOfContents,
  type ContentsEntry,
  type DecisionPageState,
} from './design-system/design-system'
import { type PageElementContext } from './page-elements'

type DecisionOnPage = ViewedPage['decisions'][number]

// A decision with changes requested is out of Nick's hands until the agent reopens the decision.
// The newest round of such a decision doesn't have an outcome.
function isSentBack(decision: DecisionOnPage | undefined): boolean {
  const newest = decision?.reviews.at(-1)
  return newest !== undefined && newest.outcome === undefined
}

export function canBeAnswered(decision: DecisionOnPage | undefined, answered: boolean): boolean {
  return !answered && decision?.question !== undefined && !isSentBack(decision)
}

function decisionOf(element: Element, context: PageElementContext): DecisionOnPage | undefined {
  const id = String(element.getAttribute('data-decision'))
  return context.page.decisions.find((each) => each.id === id)
}

// The status of a decision page follows the decision. Nick decides the page by choosing an option
// or by writing his own text. The page has changes requested until the agent reopens the decision.
function statusOf(decision: DecisionOnPage | undefined, answered: boolean): DecisionPageState {
  if (answered) {
    return 'decided'
  }
  return isSentBack(decision) ? 'changes-requested' : 'open'
}

function answerLabel(
  decision: DecisionOnPage | undefined,
  answer: NonNullable<DecisionOnPage['answer']>,
): string {
  if ('written' in answer) {
    return answer.written
  }
  return (
    decision?.options?.find((option) => option.choice === answer.choice)?.label ?? answer.choice
  )
}

// The server writes an empty element where the status goes. The browser fills the element in,
// because the status depends on what Nick and the agent have done.
function decisionPageStatusElement(
  element: Element,
  key: Key,
  context: PageElementContext,
): ReactNode {
  if (element.getAttribute('data-state') === 'draft') {
    return <DecisionPageStatus key={key} state="draft" />
  }
  const decision = decisionOf(element, context)
  const answer =
    decision?.answer ?? context.answersOnThisPage.get(String(element.getAttribute('data-decision')))
  return <DecisionPageStatus key={key} state={statusOf(decision, answer !== undefined)} />
}

// The server writes the table of contents as a list of links with a list of the options inside the
// link of the Options section. The browser shows the list as the table of contents component,
// which has the same look as the table of contents of the sidebar.
function contentsEntriesOf(element: Element): ContentsEntry[] {
  return [...element.querySelectorAll('a')].map((link) => ({
    id: String(link.getAttribute('href')).slice(1),
    text: link.textContent,
    level: link.parentElement?.parentElement?.parentElement?.tagName === 'LI' ? 3 : 2,
  }))
}

function decisionPageContentsElement(
  element: Element,
  key: Key,
  context: PageElementContext,
): ReactNode {
  return (
    <TableOfContents
      key={key}
      label="Contents of the page"
      entries={contentsEntriesOf(element)}
      currentId={undefined}
      hrefOf={(id) => `#${id}`}
      onNavigate={context.onNavigate}
    />
  )
}

// The elements that only a decision page has, or undefined for any other element
export function decisionPageElement(
  element: Element,
  key: Key,
  context: PageElementContext,
): ReactNode {
  if (element.classList.contains('decision-page-decision')) {
    return pageDecisionElement(element, key, context)
  }
  if (element.classList.contains('decision-page-contents')) {
    return decisionPageContentsElement(element, key, context)
  }
  return element.classList.contains('decision-page-status')
    ? decisionPageStatusElement(element, key, context)
    : undefined
}

// The Decision section of a decision page. It has a button for each option on the page, and it
// doesn't show the fields of an inline block, because the options are in the text of the page.
function pageDecisionElement(element: Element, key: Key, context: PageElementContext): ReactNode {
  const id = String(element.getAttribute('data-decision'))
  const decision = decisionOf(element, context)
  const answer = decision?.answer ?? context.answersOnThisPage.get(id)
  const open = answer === undefined && !isSentBack(decision)
  return (
    <div key={key} id={id} tabIndex={-1}>
      <DecisionCard
        id={id}
        question={undefined}
        context={undefined}
        proposal={undefined}
        alternative={undefined}
        pick={undefined}
        answer={answer === undefined ? undefined : answerLabel(decision, answer)}
        showFields={false}
        reviews={decision?.reviews}
      >
        {open && <DecisionForm id={id} options={decision?.options} actions={context} />}
      </DecisionCard>
    </div>
  )
}
