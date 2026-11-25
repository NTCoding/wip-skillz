import { type DatabaseSync } from 'node:sqlite'
import { type DecisionReview } from '../decisions/decision-review'
import { byItemNumber } from '../items/item-id'
import { readSavedValues, type SavedValues } from './saved-values'

export class StoredDecisionReviews {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  // Every round of every decision, in the order of the decision numbers and then the rounds
  readAll(): DecisionReview[] {
    return readSavedValues(
      this.db,
      this.padName,
      'decision_reviews',
      'SELECT * FROM decision_reviews',
    )
      .map(reviewFrom)
      .toSorted((first, second) => byItemNumber(first.id, second.id) || first.round - second.round)
  }

  // The rounds of one decision, oldest first
  readRounds(id: string): DecisionReview[] {
    return readSavedValues(
      this.db,
      this.padName,
      'decision_reviews',
      'SELECT * FROM decision_reviews WHERE id = ? ORDER BY round',
      id,
    ).map(reviewFrom)
  }

  write(review: DecisionReview): void {
    this.db
      .prepare(
        `INSERT INTO decision_reviews
           (id, round, page, line, question, reason, outcome, time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id, round) DO UPDATE SET
           page = excluded.page, line = excluded.line, question = excluded.question,
           reason = excluded.reason, outcome = excluded.outcome, time = excluded.time`,
      )
      .run(
        review.id,
        review.round,
        review.page,
        review.line,
        review.question,
        review.reason,
        review.outcome ?? null,
        review.time,
      )
  }
}

function reviewFrom(review: SavedValues): DecisionReview {
  return {
    id: review.text('id'),
    page: review.text('page'),
    line: review.wholeNumber('line'),
    question: review.text('question'),
    round: review.wholeNumber('round'),
    reason: review.text('reason'),
    outcome: review.optionalText('outcome'),
    time: review.text('time'),
  }
}
