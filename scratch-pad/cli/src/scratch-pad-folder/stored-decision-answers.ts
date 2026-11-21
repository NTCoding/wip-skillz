import { type DatabaseSync } from 'node:sqlite'
import { type Answer, type DecisionAnswer } from '../decisions/decision-answer'
import { byItemNumber, InvalidDecisionIdError, isDecisionId } from '../items/item-id'
import { ScratchPadError } from '../scratch-pad-error'
import { readSavedValues, type SavedValues } from './saved-values'

export class UnknownDecisionError extends ScratchPadError {
  constructor(id: string, padName: string) {
    super(`There isn't any answered decision called ${id} in ${padName}.`)
  }
}

export class StoredDecisionAnswers {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  readAll(): DecisionAnswer[] {
    return readSavedValues(this.db, this.padName, 'decisions', 'SELECT * FROM decisions')
      .map(decisionFrom)
      .toSorted((first, second) => byItemNumber(first.id, second.id))
  }

  read(id: string): DecisionAnswer {
    if (!isDecisionId(id)) {
      throw new InvalidDecisionIdError(id)
    }
    const [decision] = readSavedValues(
      this.db,
      this.padName,
      'decisions',
      'SELECT * FROM decisions WHERE id = ?',
      id,
    )
    if (decision === undefined) {
      throw new UnknownDecisionError(id, this.padName)
    }
    return decisionFrom(decision)
  }

  write(decision: DecisionAnswer): void {
    this.db
      .prepare(
        `INSERT INTO decisions
           (id, page, line, question, choice, written_answer, outcome, time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           page = excluded.page, line = excluded.line, question = excluded.question,
           choice = excluded.choice, written_answer = excluded.written_answer,
           outcome = excluded.outcome, time = excluded.time`,
      )
      .run(
        decision.id,
        decision.page,
        decision.line,
        decision.question,
        'choice' in decision.answer ? decision.answer.choice : null,
        'written' in decision.answer ? decision.answer.written : null,
        decision.outcome ?? null,
        decision.time,
      )
  }
}

function decisionFrom(decision: SavedValues): DecisionAnswer {
  return {
    id: decision.text('id'),
    page: decision.text('page'),
    line: decision.wholeNumber('line'),
    question: decision.text('question'),
    answer: answerFrom(decision),
    outcome: decision.optionalText('outcome'),
    time: decision.text('time'),
  }
}

function answerFrom(decision: SavedValues): Answer {
  const choice = decision.optionalText('choice')
  return choice === undefined ? { written: decision.text('written_answer') } : { choice }
}
