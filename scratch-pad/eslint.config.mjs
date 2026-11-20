import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import importPlugin from 'eslint-plugin-import'
import sonarjs from 'eslint-plugin-sonarjs'
import unicorn from 'eslint-plugin-unicorn'
import vitest from '@vitest/eslint-plugin'
import noGenericNames from './.eslint-rules/no-generic-names.js'

// Ban generic folder imports (not lib - that's NX convention)
const genericFolderPatterns = [
  {
    group: ['*/utils/*', '*/utils', '*/utilities'],
    message: 'No utils folders. Use domain-specific names.',
  },
  {
    group: ['*/helpers/*', '*/helpers'],
    message: 'No helpers folders. Use domain-specific names.',
  },
  {
    group: ['*/common/*', '*/common'],
    message: 'No common folders. Use domain-specific names.',
  },
  {
    group: ['*/shared/*', '*/shared'],
    message: 'No shared folders. Use domain-specific names.',
  },
  {
    group: ['*/core/*', '*/core'],
    message: 'No core folders. Use domain-specific names.',
  },
  {
    group: ['*/src/lib/*', '*/src/lib', './lib/*', './lib', '../lib/*', '../lib'],
    message: 'No lib folders in projects. Use domain-specific names.',
  },
]

// The domain folders decide things. Files, SQLite and processes belong to the storage code.
const domainFiles = [
  'src/agent-inbox/**/*.ts',
  'src/decisions/**/*.ts',
  'src/events/**/*.ts',
  'src/items/**/*.ts',
  'src/nick-inbox/**/*.ts',
  'src/pad-changes/**/*.ts',
  'src/page-check/**/*.ts',
  'src/pages/**/*.ts',
  'src/progress-tracker/**/*.ts',
  'src/rendered-page/**/*.ts',
  'src/status/**/*.ts',
  'src/threads/**/*.ts',
  'src/counted-noun.ts',
  'src/local-time.ts',
  'src/scratch-pad-error.ts',
  'src/slug.ts',
]

const storageImports = ['node:sqlite', 'node:fs', 'node:fs/promises', 'node:child_process'].map(
  (name) => ({ name, message: 'Domain code never touches files, SQLite or processes.' }),
)

const customRules = {
  plugins: {
    custom: {
      rules: {
        'no-generic-names': noGenericNames,
      },
    },
    import: importPlugin,
  },
}

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules', '*.config.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintComments.recommended,
  {
    rules: {
      '@eslint-community/eslint-comments/no-use': ['error', { allow: [] }],
    },
  },
  sonarjs.configs.recommended,
  {
    rules: {
      'sonarjs/void-use': 'off',
    },
  },
  customRules,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'import/extensions': [
        'error',
        'never',
        { ts: 'never', tsx: 'never', js: 'never', json: 'always' },
      ],

      // Custom rule: no generic names
      'custom/no-generic-names': 'error',

      // No comments - forces self-documenting code
      'no-warning-comments': 'off',
      'multiline-comment-style': 'off',
      'capitalized-comments': 'off',
      'no-inline-comments': 'error',
      'spaced-comment': 'off',

      // Prefer positive conditions in if/else and ternaries (SonarCloud S7735)
      'no-negated-condition': 'error',

      // Ban let - use const only
      'no-restricted-syntax': [
        'error',
        {
          selector: 'VariableDeclaration[kind="let"]',
          message: 'Use const. Avoid mutation.',
        },
        {
          selector: 'NewExpression[callee.name="Error"]',
          message:
            'Use custom precise error classes instead of generic Error or fail assertions in tests.',
        },
        {
          selector:
            'Identifier[name="TypeError"], ImportSpecifier[imported.name="TypeError"], MemberExpression[property.name="TypeError"], MemberExpression[property.value="TypeError"]',
          message: 'Use custom precise error classes instead of TypeError.',
        },
        {
          selector: 'LogicalExpression[operator="??"][right.type="Literal"][right.value=""]',
          message:
            "Banned: `?? ''` violates fail-fast principle. Never use empty string fallback. Options: (1) Fail fast if value should exist (throw descriptive error), (2) Handle undefined explicitly without empty string, (3) Create a type that represents emptiness (not string literal).",
        },
      ],
      'prefer-const': 'error',
      'no-var': 'error',

      // No any types
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // No type assertions - fix the types instead
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],

      // No non-null assertions - handle errors properly
      '@typescript-eslint/no-non-null-assertion': 'error',

      // SonarCloud rule equivalents
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'import/no-duplicates': 'error',

      // Ban generic folder imports (not lib - that's NX convention)
      'no-restricted-imports': ['error', { patterns: genericFolderPatterns }],

      // Complexity limits
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 3],
      complexity: ['error', 12],

      // ESM compatibility - ban CommonJS globals
      'no-restricted-globals': [
        'error',
        {
          name: '__dirname',
          message: 'Use dirname(fileURLToPath(import.meta.url)) in ESM',
        },
        {
          name: '__filename',
          message: 'Use fileURLToPath(import.meta.url) in ESM',
        },
      ],

      // Naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase'],
        },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        {
          selector: 'objectLiteralProperty',
          format: null,
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { unicorn },
    rules: {
      'unicorn/prefer-string-replace-all': 'error',
    },
  },
  {
    files: domainFiles,
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: storageImports,
          patterns: [
            ...genericFolderPatterns,
            {
              group: ['**/scratch-pad-folder/*', '**/scratch-pads-home/*', '**/prose-check/*'],
              message: 'Domain code never imports the storage code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    plugins: { vitest },
    rules: {
      'vitest/no-conditional-expect': 'error',
      'vitest/no-conditional-in-test': 'error',
      'vitest/prefer-strict-equal': 'error',
      'vitest/consistent-test-it': ['error', { fn: 'it' }],
      'vitest/consistent-test-filename': ['error', { pattern: '.*\\.spec\\.[tj]sx?$' }],
      'vitest/max-expects': ['error', { max: 4 }],
      'vitest/prefer-called-with': 'error',
      'vitest/prefer-to-have-length': 'error',
      'vitest/require-to-throw-message': 'error',
      'vitest/prefer-spy-on': 'error',
      // Allow expect.any() matchers in tests (returns any by design)
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
)
