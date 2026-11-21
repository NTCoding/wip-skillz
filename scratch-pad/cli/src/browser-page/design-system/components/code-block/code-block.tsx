import { useEffect, useState } from 'react'
import { FullSizeView } from '../full-size-view/full-size-view'
import { IconButton } from '../icon-button/icon-button'
import { syntaxLines, syntaxTokens } from './syntax-tokens'
import './code-block.css'

interface CodeBlockProps {
  readonly code: string
  readonly language: string | undefined
}

type CopyState = 'ready' | 'copied' | 'failed'

const copyLabels: Readonly<Record<CopyState, string>> = {
  ready: 'Copy',
  copied: 'Copied',
  failed: "Couldn't copy",
}

const copiedMilliseconds = 2000

function CodeLines({ code, language }: CodeBlockProps) {
  const lines = syntaxLines(syntaxTokens(code.replace(/\n$/, ''), language))
  return (
    <pre className="code-block__pre">
      <code className="code-block__code">
        {lines.map((tokens, line) => (
          <span className="code-block__line" key={line}>
            {tokens.map((token, index) =>
              token.kind === 'plain' ? (
                token.text
              ) : (
                <span className={`syntax-${token.kind}`} key={index}>
                  {token.text}
                </span>
              ),
            )}
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  )
}

function CopyButton({ code }: { readonly code: string }) {
  const [state, setState] = useState<CopyState>('ready')
  useEffect(() => {
    if (state === 'ready') {
      return undefined
    }
    const timer = setTimeout(() => setState('ready'), copiedMilliseconds)
    return () => clearTimeout(timer)
  }, [state])
  const copy = (): void => {
    navigator.clipboard.writeText(code).then(
      () => setState('copied'),
      () => setState('failed'),
    )
  }
  return (
    <button type="button" className="code-block__copy" onClick={copy} aria-live="polite">
      {copyLabels[state]}
    </button>
  )
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const label = language === undefined ? 'code block' : `${language} code block`
  return (
    <FullSizeView label={label}>
      {({ open, openFullSize }) => (
        <figure className={open ? 'code-block code-block--full-size' : 'code-block'}>
          <figcaption className="code-block__bar">
            <span className="code-block__language">{language ?? 'code'}</span>
            <CopyButton code={code} />
            <span className="code-block__full-size">
              <IconButton
                icon="full-size"
                tone="code"
                label={`Open the ${label} at full size`}
                onClick={openFullSize}
              />
            </span>
          </figcaption>
          <CodeLines code={code} language={language} />
        </figure>
      )}
    </FullSizeView>
  )
}
