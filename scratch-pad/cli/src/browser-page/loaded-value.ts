import { useEffect, useState } from 'react'

export type LoadedValue<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly value: T }
  | { readonly status: 'failed'; readonly message: string }

interface LoadResult<T> {
  readonly subject: string
  readonly loaded: LoadedValue<T>
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useLoadedValue<T>(
  subject: string,
  revision: number,
  load: (subject: string) => Promise<T>,
): LoadedValue<T> {
  const [result, setResult] = useState<LoadResult<T> | undefined>(undefined)
  useEffect(() => {
    const request = { wanted: true }
    load(subject).then(
      (value) => {
        if (request.wanted) {
          setResult({ subject, loaded: { status: 'loaded', value } })
        }
      },
      (error: unknown) => {
        if (request.wanted) {
          setResult({ subject, loaded: { status: 'failed', message: messageOf(error) } })
        }
      },
    )
    return () => {
      request.wanted = false
    }
  }, [subject, revision, load])
  return result?.subject === subject ? result.loaded : { status: 'loading' }
}
