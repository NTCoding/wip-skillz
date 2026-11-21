function elementsBesideTheWayUp(element: Element | null): Element[] {
  const parent = element?.parentElement ?? null
  if (parent === null) {
    return []
  }
  const besides = [...parent.children].filter((child) => child !== element)
  return [...besides, ...elementsBesideTheWayUp(parent)]
}

export function makePageBehindInert(element: Element | null): () => void {
  const madeInert = elementsBesideTheWayUp(element).filter((each) => !each.hasAttribute('inert'))
  madeInert.forEach((each) => each.toggleAttribute('inert', true))
  return () => madeInert.forEach((each) => each.removeAttribute('inert'))
}
