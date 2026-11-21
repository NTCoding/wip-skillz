import stylelint from 'stylelint'
import { valuesThatNeedATokenIn } from './declaration-values.mjs'

const ruleName = 'tokens/value-from-token'

const tokenExamples = {
  colour: 'var(--text)',
  font: 'var(--fs-ui)',
  spacing: 'var(--space-md)',
  size: 'var(--col-w)',
  radius: 'var(--r-md)',
  shadow: 'var(--shadow-sm)',
  border: 'var(--hairline)',
}

const messages = stylelint.utils.ruleMessages(ruleName, {
  writtenOut: (text, property, kind) =>
    `"${text}" in ${property} is a ${kind} that isn't a token. Use a ${kind} token like ${tokenExamples[kind]} from src/browser-page/design-system/tokens/tokens.css.`,
})

function valueFromToken(primary) {
  return (root, result) => {
    const valid = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
      possible: [true],
    })
    if (!valid) {
      return
    }
    root.walkDecls((declaration) => {
      for (const found of valuesThatNeedATokenIn(declaration.prop, declaration.value)) {
        stylelint.utils.report({
          ruleName,
          result,
          node: declaration,
          word: found.text,
          message: messages.writtenOut(found.text, declaration.prop, found.kind),
        })
      }
    })
  }
}

valueFromToken.ruleName = ruleName
valueFromToken.messages = messages
valueFromToken.meta = { url: 'src/browser-page/design-system/DESIGN.md' }

export default stylelint.createPlugin(ruleName, valueFromToken)
