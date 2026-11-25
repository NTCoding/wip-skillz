import { describe, expect, it } from 'vitest'
import { exportPad } from './browser-page-fixtures'
import { decisionsOfPad } from './decision-fixtures'
import { scratchPadConnection } from './scratch-pad-connection'
import { networkReturning, networkWith } from './scratch-pad-connection-fixtures'

const api = `/api/scratch-pads/${exportPad}`

describe('scratchPadConnection for the decisions', () => {
  it('posts the page and the reason to the address that asks for changes', async () => {
    const network = networkWith({ decision: { id: 'd-1' } })
    const connection = scratchPadConnection(exportPad, network)
    await connection.requestDecisionChanges('d-1', 'pages/index.md', 'Who is the team?')
    expect(network.sent).toStrictEqual([
      {
        url: `${api}/decisions/d-1/request-changes`,
        method: 'POST',
        body: '{"page":"pages/index.md","reason":"Who is the team?"}',
      },
    ])
  })

  it('reads the open decisions and the reviews with null turned into undefined', async () => {
    const body = JSON.stringify(decisionsOfPad, (_key, value: unknown) => value ?? null)
    const network = networkReturning(new Response(body))
    await expect(scratchPadConnection(exportPad, network).decisions()).resolves.toStrictEqual(
      decisionsOfPad,
    )
    expect(network.fetched).toStrictEqual([`${api}/decisions`])
  })
})
