import { MarginDecision, MarginMarker, type MarginItem } from './design-system/design-system'
import { type AnsweredDecision } from './page-elements'

// A thread on the text of a decision that has moved into the margin is shown beside the heading of
// the decision's question instead.
export function anchorLinesOf(
  blockLines: string | undefined,
  decisions: readonly AnsweredDecision[],
): string | undefined {
  const moved = decisions.find((decision) => decision.blockLines === blockLines)
  return moved === undefined ? blockLines : moved.headingLines
}

// Each answered decision is a marker beside the heading of its question. The decision whose id is
// open is shown as a card below its marker.
export function decisionMarginItems(
  decisions: readonly AnsweredDecision[],
  open: string | undefined,
  toggle: (id: string) => void,
): MarginItem[] {
  return decisions.map((decision) => ({
    key: decision.id,
    anchorLines: decision.headingLines,
    content: (
      <MarginDecision
        {...decision}
        open={decision.id === open}
        onToggle={() => toggle(decision.id)}
      />
    ),
    marker: (
      <MarginMarker
        label={`Decision ${decision.id}`}
        kind="decision"
        messages={1}
        open={decision.id === open}
        onClick={() => toggle(decision.id)}
      />
    ),
    popup: decision.id === open,
  }))
}
