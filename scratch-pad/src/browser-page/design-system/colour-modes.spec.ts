import { describe, expect, it } from 'vitest'
import { colourModes, isColourMode } from './colour-modes'
import designSystemModule from './design-system.ts?raw'

const modeFiles = import.meta.glob<string>('./tokens/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const modesWithAFile = colourModes.filter((mode) => mode !== 'light')

describe('isColourMode', () => {
  it('returns true when the value is the name of a colour mode', () => {
    expect(isColourMode('dark')).toBe(true)
  })

  it('returns false when the value isn’t the name of a colour mode', () => {
    expect(isColourMode('not-a-mode')).toBe(false)
  })
})

describe('the files of the colour modes', () => {
  it.each(modesWithAFile)(
    'has tokens/%s.css with the selector of the mode when the mode is in colourModes',
    (mode) => {
      expect(String(modeFiles[`./tokens/${mode}.css`])).toContain(`[data-colour-mode='${mode}']`)
    },
  )

  it.each(modesWithAFile)(
    'imports tokens/%s.css in design-system.ts after tokens.css when the mode is in colourModes',
    (mode) => {
      const imports = designSystemModule.split('\n').filter((line) => line.startsWith('import'))
      expect(imports.indexOf(`import './tokens/${mode}.css'`)).toBeGreaterThan(
        imports.indexOf("import './tokens/tokens.css'"),
      )
    },
  )
})
