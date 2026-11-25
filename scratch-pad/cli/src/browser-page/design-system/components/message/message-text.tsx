import MarkdownIt from 'markdown-it'
import { Fragment } from 'react'
import { navigationClick } from '../../navigation-click'
import { useNavigate } from '../../navigation-context'

// A comment is plain text apart from its links. Both [text](address) and a bare address are links,
// whereas every other Markdown character is shown as it was written.
const linkParser = new MarkdownIt('zero', { linkify: true }).enable(['link', 'linkify'])
// A bare file name like SKILL.md isn't a link. Only an address that starts with a scheme is.
linkParser.linkify.set({ fuzzyLink: false, fuzzyEmail: false, fuzzyIP: false })

const pageSchemes = new Set(['http:', 'https:'])
const otherSiteSchemes = new Set(['http:', 'https:', 'mailto:'])

interface Piece {
  readonly href: string | null
  readonly text: string
}

interface Scan {
  readonly href: string | null
  readonly pieces: readonly Piece[]
}

function piecesOf(text: string): readonly Piece[] {
  const children = linkParser
    .parseInline(text, {})
    .map((inline) => inline.children)
    .flat()
    .filter((token) => token !== null)
  return children.reduce<Scan>(
    (scan, token) => {
      if (token.type === 'link_open') {
        return { ...scan, href: token.attrGet('href') }
      }
      if (token.type === 'link_close') {
        return { ...scan, href: null }
      }
      return { ...scan, pieces: [...scan.pieces, { href: scan.href, text: token.content }] }
    },
    { href: null, pieces: [] },
  ).pieces
}

type Destination =
  | { readonly kind: 'page'; readonly href: string }
  | { readonly kind: 'site'; readonly href: string }

// A link to the scratch pad is opened in the browser page. Only an http: or https: address with the
// same origin is a page of the scratch pad, because a mailto: address or a page that is opened from
// a file can report an origin that matches. A link to http:, https: or mailto: on another site is
// opened in a new tab. Every other address is shown as text.
function destinationOf(href: string): Destination | undefined {
  if (!URL.canParse(href, document.baseURI)) {
    return undefined
  }
  const url = new URL(href, document.baseURI)
  if (pageSchemes.has(url.protocol) && url.origin === window.location.origin) {
    return { kind: 'page', href: `${url.pathname}${url.search}${url.hash}` }
  }
  return otherSiteSchemes.has(url.protocol) ? { kind: 'site', href: url.href } : undefined
}

function Link(props: { readonly href: string; readonly text: string }) {
  const onNavigate = useNavigate()
  const destination = destinationOf(props.href)
  if (destination === undefined) {
    return props.text
  }
  if (destination.kind === 'site') {
    return (
      <a href={destination.href} target="_blank" rel="noreferrer">
        {props.text}
      </a>
    )
  }
  return onNavigate === undefined ? (
    <a href={destination.href}>{props.text}</a>
  ) : (
    <a href={destination.href} onClick={navigationClick(destination.href, onNavigate)}>
      {props.text}
    </a>
  )
}

export function MessageText({ text }: { readonly text: string }) {
  return (
    <p className="message__text">
      {piecesOf(text).map((piece, index) =>
        piece.href === null ? (
          <Fragment key={index}>{piece.text}</Fragment>
        ) : (
          <Link key={index} href={piece.href} text={piece.text} />
        ),
      )}
    </p>
  )
}
