import { describe, expect, it } from 'vitest'
import { nodeVersionProblem } from './node-version'

describe('nodeVersionProblem', () => {
  it.each(['24.0.0', '24.19.0', '25.2.1'])(
    'returns undefined when the version is %s',
    (version) => {
      expect(nodeVersionProblem(version)).toBeUndefined()
    },
  )

  it('asks for Node 24 when the version is 20.20.2', () => {
    expect(nodeVersionProblem('20.20.2')).toBe(
      'scratch-pad needs Node 24, but this is Node 20.20.2. Run the command again with Node 24.',
    )
  })
})
