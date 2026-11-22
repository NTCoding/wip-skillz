import { useState } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import { Icon } from '../icon/icon'
import './full-tree.css'

export interface FullTreeNode {
  readonly kind: 'page' | 'section'
  readonly title: string
  readonly href: string
  readonly children: readonly FullTreeNode[]
}

// The nodes on the first 2 levels start open. A node on the third level or deeper starts collapsed. While it's
// collapsed, it shows how many children it has.
const firstCollapsedLevel = 3

interface FullTreeProps {
  readonly label: string
  readonly nodes: readonly FullTreeNode[]
  readonly onNavigate: Navigate
}

function countedText(count: number, one: string, many: string): string[] {
  if (count === 0) {
    return []
  }
  return [count === 1 ? `1 ${one}` : `${count} ${many}`]
}

function nodesDownTo(nodes: readonly FullTreeNode[], level: number): FullTreeNode[] {
  return level > firstCollapsedLevel
    ? []
    : nodes.flatMap((node) => [node, ...nodesDownTo(node.children, level + 1)])
}

// The counts only include the nodes on the first 3 levels of the tree. A page on the top level counts as a page. A
// page under another node counts as a sub page.
function countsText(nodes: readonly FullTreeNode[]): string {
  const below = nodesDownTo(
    nodes.flatMap((node) => node.children),
    2,
  )
  const counts = [
    ...countedText(nodes.filter((node) => node.kind === 'page').length, 'page', 'pages'),
    ...countedText(below.filter((node) => node.kind === 'page').length, 'sub page', 'sub pages'),
    ...countedText(
      [...nodes, ...below].filter((node) => node.kind === 'section').length,
      'section',
      'sections',
    ),
  ]
  const last = counts.pop()
  return counts.length === 0 ? String(last) : `${counts.join(', ')} and ${String(last)}`
}

// The full tree has links and a chevron on each node with children. A subtree only shows the nodes, which aren't
// links. It marks the current page too.
type TreeKind =
  | {
      readonly kind: 'links'
      readonly toggled: ReadonlySet<string>
      readonly onToggle: (href: string) => void
      readonly onNavigate: Navigate
    }
  | {
      readonly kind: 'subtree'
      readonly currentHref: string
      readonly parentsOfCurrent: ReadonlySet<string>
    }

function isOpen(node: FullTreeNode, level: number, tree: TreeKind): boolean {
  const openAtFirst = level < firstCollapsedLevel
  return tree.kind === 'links'
    ? openAtFirst !== tree.toggled.has(node.href)
    : openAtFirst || tree.parentsOfCurrent.has(node.href)
}

interface TreeNodeProps {
  readonly node: FullTreeNode
  readonly level: number
  readonly tree: TreeKind
}

interface NodeLabelProps {
  readonly node: FullTreeNode
  readonly tree: TreeKind
  readonly more: boolean
}

// In the full tree, the count of the children is outside the link. In a subtree, the count is before the pill of the
// current page so that the pill stays at the end of the row.
function NodeLabel({ node, tree, more }: NodeLabelProps) {
  const count = more && <span className="full-tree__more">+{node.children.length} more</span>
  const content = (
    <>
      {node.kind === 'page' && <Icon name="page" />}
      <span>{node.title}</span>
    </>
  )
  if (tree.kind === 'links') {
    return (
      <>
        <a
          className="full-tree__link"
          href={node.href}
          onClick={navigationClick(node.href, tree.onNavigate)}
        >
          {content}
        </a>
        {count}
      </>
    )
  }
  const current = tree.currentHref === node.href
  return (
    <span className="full-tree__link" aria-current={current ? 'page' : undefined}>
      {content}
      {count}
      {current && <span className="full-tree__here">You are here</span>}
    </span>
  )
}

function TreeNode({ node, level, tree }: TreeNodeProps) {
  const withChildren = node.children.length > 0
  const open = withChildren && isOpen(node, level, tree)
  const more = withChildren && !open && level >= firstCollapsedLevel
  const toggleLabel = `${open ? 'Collapse' : 'Expand'} ${node.title}`
  return (
    <li className="full-tree__node" data-level={level} data-kind={node.kind}>
      <div className="full-tree__row">
        {tree.kind === 'links' && withChildren ? (
          <button
            type="button"
            className="full-tree__chevron"
            aria-expanded={open}
            aria-label={toggleLabel}
            title={toggleLabel}
            onClick={() => tree.onToggle(node.href)}
          >
            <Icon name="chevron" />
          </button>
        ) : (
          <span className="full-tree__spacer" />
        )}
        <NodeLabel node={node} tree={tree} more={more} />
      </div>
      {open && (
        <ul className="full-tree__children">
          {node.children.map((child) => (
            <TreeNode key={child.href} node={child} level={level + 1} tree={tree} />
          ))}
        </ul>
      )}
    </li>
  )
}

// The whole tree starts collapsed. Each branch on the first 2 levels will stay open until Nick collapses that branch.
// Each deeper branch will stay collapsed until Nick expands that branch. That's why each expand only shows one more
// level.
export function FullTree({ label, nodes, onNavigate }: FullTreeProps) {
  const [open, setOpen] = useState(false)
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set())
  if (nodes.length === 0) {
    return null
  }
  const toggle = (href: string) =>
    setToggled((current) =>
      current.has(href)
        ? new Set([...current].filter((each) => each !== href))
        : new Set([...current, href]),
    )
  const tree: TreeKind = { kind: 'links', toggled, onToggle: toggle, onNavigate }
  return (
    <div className="full-tree">
      <button
        type="button"
        className="full-tree__toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="chevron" />
        <span className="full-tree__title">{label}</span>
        <span className="full-tree__counts">{countsText(nodes)}</span>
      </button>
      {open && (
        <ul className="full-tree__root" aria-label={label}>
          {nodes.map((node) => (
            <TreeNode key={node.href} node={node} level={1} tree={tree} />
          ))}
        </ul>
      )}
    </div>
  )
}

function parentsOf(node: FullTreeNode, href: string): FullTreeNode[] | undefined {
  if (node.href === href) {
    return []
  }
  for (const child of node.children) {
    const parents = parentsOf(child, href)
    if (parents !== undefined) {
      return [node, ...parents]
    }
  }
  return undefined
}

interface SubtreeProps {
  readonly label: string
  readonly root: FullTreeNode
  readonly currentHref: string
}

// A subtree shows the same 3 levels as the full tree. The parents of the current page are open on every level so
// that the current page is always shown.
export function Subtree({ label, root, currentHref }: SubtreeProps) {
  const parents = parentsOf(root, currentHref) ?? []
  const tree: TreeKind = {
    kind: 'subtree',
    currentHref,
    parentsOfCurrent: new Set(parents.map((parent) => parent.href)),
  }
  return (
    <ul className="full-tree__root" data-subtree="" aria-label={label}>
      <TreeNode node={root} level={1} tree={tree} />
    </ul>
  )
}
