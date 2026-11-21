import path from 'node:path'

const forbiddenWordsWithSuggestions = {
  utils: 'Use domain-specific name describing what it does',
  helpers: 'Try "fixtures" for test data, or name by purpose',
  helper: 'Try "fixtures" for test data, or name by purpose',
  service: 'Name by domain action (e.g., OrderSubmitter, PaymentGateway)',
  services: 'Name by domain action (e.g., OrderSubmitter, PaymentGateway)',
  manager: 'Name by responsibility (e.g., ConnectionPool, SessionStore)',
  managers: 'Name by responsibility (e.g., ConnectionPool, SessionStore)',
  processor: 'Name by what it processes (e.g., OrderFulfiller, EventDispatcher)',
  processors: 'Name by what it processes (e.g., OrderFulfiller, EventDispatcher)',
  data: 'Name by domain concept (e.g., OrderDetails, CustomerProfile)',
}

const forbiddenWords = Object.keys(forbiddenWordsWithSuggestions)
const forbiddenPattern = new RegExp(
  `(^|/|-|[a-z])(${forbiddenWords.join('|')})(-|[.]ts$|[.]tsx$|/|$)`,
  'i',
)

const findForbiddenWord = (text) => {
  const lowerText = text.toLowerCase()
  return forbiddenWords.find((word) => lowerText.includes(word))
}

const isForbiddenName = (name) => {
  if (!name) return false
  const lowerName = name.toLowerCase()
  return forbiddenWords.some(
    (word) => lowerName === word || lowerName.startsWith(word) || lowerName.endsWith(word),
  )
}

const filenameMessage = (filename) => {
  const matchedWord = findForbiddenWord(filename)
  if (matchedWord) {
    return `Generic word "${matchedWord}" in filename. ${forbiddenWordsWithSuggestions[matchedWord]}`
  }
  return 'Generic filename. Use domain-specific naming.'
}

const classMessage = (className) => {
  const matchedWord = findForbiddenWord(className)
  if (matchedWord) {
    return `Generic word "${matchedWord}" in class "${className}". ${forbiddenWordsWithSuggestions[matchedWord]}`
  }
  return `Generic class name "${className}". Use domain-specific naming.`
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid generic names (Utils, Helper, Service, Manager, Processor, Data) in filenames and class names',
      recommended: true,
    },
    schema: [],
  },
  create(context) {
    const filename = path.basename(context.filename)

    return {
      ClassDeclaration(node) {
        if (node.id && isForbiddenName(node.id.name)) {
          context.report({ node: node.id, message: classMessage(node.id.name) })
        }
      },

      Program(node) {
        if (forbiddenPattern.test(filename)) {
          context.report({ node, message: filenameMessage(filename) })
        }
      },
    }
  },
}
