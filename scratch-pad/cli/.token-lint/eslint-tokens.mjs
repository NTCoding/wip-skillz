import { colourLiteralsIn } from './css-colours.mjs'

const noColourInString = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Rejects a colour that is written out in a string. A component takes its colours from the tokens in its CSS file.',
    },
    schema: [],
    messages: {
      colourInString:
        'The string contains the colour "{{colour}}". Use a colour token in the CSS file of the component instead, or currentcolor in an SVG.',
    },
  },
  create(context) {
    const check = (node, text) => {
      for (const colour of colourLiteralsIn(text)) {
        context.report({ node, messageId: 'colourInString', data: { colour: colour.text } })
      }
    }
    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          check(node, node.value)
        }
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw)
      },
      JSXText(node) {
        check(node, node.value)
      },
    }
  },
}

export default {
  meta: { name: 'tokens' },
  rules: { 'no-colour-in-string': noColourInString },
}
