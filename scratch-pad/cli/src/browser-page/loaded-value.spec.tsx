import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrowserPageError } from './browser-page-error'
import { useLoadedValue } from './loaded-value'

describe('useLoadedValue', () => {
  it('returns loading and then the value when the value is loaded', async () => {
    const load = (subject: string) => Promise.resolve(`page ${subject}`)
    const { result } = renderHook(() => useLoadedValue('index.md', 0, load))
    expect(result.current).toStrictEqual({ status: 'loading' })
    await waitFor(() =>
      expect(result.current).toStrictEqual({ status: 'loaded', value: 'page index.md' }),
    )
  })

  it('returns the message of the error when the load fails with an error', async () => {
    const load = () => Promise.reject(new BrowserPageError('The server is down.'))
    const { result } = renderHook(() => useLoadedValue('index.md', 0, load))
    await waitFor(() =>
      expect(result.current).toStrictEqual({ status: 'failed', message: 'The server is down.' }),
    )
  })

  it('returns the text of the reason when the load fails with something else', async () => {
    const load = () => Promise.reject(new DOMException('offline').name)
    const { result } = renderHook(() => useLoadedValue('index.md', 0, load))
    await waitFor(() =>
      expect(result.current).toStrictEqual({ status: 'failed', message: 'Error' }),
    )
  })

  it('returns the old value while a new revision of the same subject is loaded', async () => {
    const pending = Promise.withResolvers<string>()
    const loads = [Promise.resolve('first'), pending.promise]
    const load = () => loads.shift() ?? pending.promise
    const { result, rerender } = renderHook(
      ({ revision }) => useLoadedValue('index.md', revision, load),
      {
        initialProps: { revision: 0 },
      },
    )
    await waitFor(() => expect(result.current).toStrictEqual({ status: 'loaded', value: 'first' }))
    rerender({ revision: 1 })
    expect(result.current).toStrictEqual({ status: 'loaded', value: 'first' })
  })

  it('drops a value for a subject that isn’t wanted any more', async () => {
    const pending = {
      first: Promise.withResolvers<string>(),
      second: Promise.withResolvers<string>(),
    }
    const load = (subject: string) =>
      subject === 'a' ? pending.first.promise : pending.second.promise
    const { result, rerender } = renderHook(({ subject }) => useLoadedValue(subject, 0, load), {
      initialProps: { subject: 'a' },
    })
    rerender({ subject: 'b' })
    await act(async () => {
      pending.first.resolve('page a')
      pending.second.reject(new BrowserPageError('b is gone'))
      await pending.first.promise
    })
    await waitFor(() =>
      expect(result.current).toStrictEqual({ status: 'failed', message: 'b is gone' }),
    )
  })

  it('drops a failure for a subject that isn’t wanted any more', async () => {
    const pending = Promise.withResolvers<string>()
    const load = (subject: string) =>
      subject === 'a' ? pending.promise : Promise.resolve('page b')
    const { result, rerender } = renderHook(({ subject }) => useLoadedValue(subject, 0, load), {
      initialProps: { subject: 'a' },
    })
    rerender({ subject: 'b' })
    await act(async () => {
      pending.reject(new BrowserPageError('a is gone'))
      await pending.promise.catch(() => undefined)
    })
    await waitFor(() => expect(result.current).toStrictEqual({ status: 'loaded', value: 'page b' }))
  })
})
