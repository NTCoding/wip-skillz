import { type Token } from 'markdown-it'
import { blockBodyParser, firstWordOf, namedBlockType } from './page-markdown-parser'
import { type NamedBlock, type NamedBlockContent } from './named-block'

export const agentNoteBlockName = 'agent-note'

export function isAgentNote(token: Token): boolean {
  return token.type === namedBlockType && firstWordOf(token.info) === agentNoteBlockName
}

export function agentNoteBlockContent(block: NamedBlock): NamedBlockContent {
  return {
    className: agentNoteBlockName,
    attributes: [],
    html: blockBodyParser.render(block.body),
    problems:
      block.options === ''
        ? []
        : [
            {
              line: block.lines.firstLine,
              text: "the :::agent-note block doesn't take any options. Write :::agent-note on its own",
            },
          ],
    decision: undefined,
  }
}
