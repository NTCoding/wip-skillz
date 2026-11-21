import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import importPlugin from 'eslint-plugin-import'
import sonarjs from 'eslint-plugin-sonarjs'
import unicorn from 'eslint-plugin-unicorn'
import vitest from '@vitest/eslint-plugin'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import noGenericNames from './.eslint-rules/no-generic-names.js'
import tokens from './.token-lint/eslint-tokens.mjs'

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

const storageMessage = 'Domain code never touches files, SQLite or processes.'

const storageModules = ['sqlite', 'fs', 'child_process']

const storageImports = storageModules
  .flatMap((name) => [name, `node:${name}`])
  .map((name) => ({ name, message: storageMessage }))

const storageSubpaths = {
  group: storageModules.flatMap((name) => [`${name}/*`, `node:${name}/*`]),
  message: storageMessage,
}

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
    ignores: ['dist', 'coverage', 'node_modules', 'storybook-static', '*.config.mjs'],
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
        { ts: 'never', tsx: 'never', js: 'never', json: 'always', css: 'always' },
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
            storageSubpaths,
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
    files: ['src/browser-page/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['src/browser-page/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    ...react.configs.flat['jsx-runtime'],
  },
  {
    files: ['src/browser-page/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ['src/browser-page/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    files: ['src/browser-page/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    ignores: ['**/*.spec.ts', '**/*.spec.tsx'],
    plugins: { tokens },
    rules: {
      // A colour comes from a token in the CSS file of a component.
      'tokens/no-colour-in-string': 'error',
      // A React component returns a ReactNode, which is a union of a text, an element and null.
      'sonarjs/function-return-type': 'off',
      // A component is styled by its own CSS, so nobody passes a style from outside.
      'react/forbid-dom-props': ['error', { forbid: ['style'] }],
      'react/forbid-component-props': ['error', { forbid: ['style', 'className'] }],
    },
  },
  {
    files: ['src/browser-page/**/*.{ts,tsx}'],
    ignores: ['src/browser-page/design-system/**', 'src/browser-page/browser-page-test-setup.ts'],
    rules: {
      // A feature is built from the components of the design system. It doesn't style anything itself.
      'react/forbid-dom-props': ['error', { forbid: ['style', 'className'] }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...genericFolderPatterns,
            {
              group: ['**/design-system/*/**', '**/*.css'],
              message:
                'A feature uses a component only through its React component, from design-system/design-system.',
            },
            {
              group: ['../*', 'node:*'],
              message: 'The browser page only imports its own files.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/browser-page/design-system/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...genericFolderPatterns,
            {
              group: ['../**/*.css'],
              message:
                'A component only imports its own CSS. Use the React component of another component.',
            },
            {
              group: ['../../../*', '../../design-system'],
              message: 'A component of the design system never imports the code of a feature.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.stories.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'variable', modifiers: ['const'], format: ['camelCase', 'PascalCase'] },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
      },
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
