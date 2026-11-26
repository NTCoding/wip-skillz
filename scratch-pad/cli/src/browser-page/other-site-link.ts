const linkSchemes = new Set(['http:', 'https:', 'mailto:'])

// A link to another site opens in a new tab. URL turns the scheme into lower case so that
// HTTPS://a.dev is a link to another site too.
export function opensAnotherSite(href: string): boolean {
  return (
    URL.canParse(href, document.baseURI) &&
    linkSchemes.has(new URL(href, document.baseURI).protocol)
  )
}
