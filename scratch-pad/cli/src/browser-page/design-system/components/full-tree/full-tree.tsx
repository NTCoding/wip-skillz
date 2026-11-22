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

function nodesUnder(nodes: readonly FullTreeNode[]): FullTreeNode[] {
  return nodes.flatMap((node) => [node, ...nodesUnder(node.children)])
}

// The counts only include the nodes that the tree shows. A page on the top level counts as a page.
// A page under another node counts as a sub page.
function countsText(nodes: readonly FullTreeNode[]): string {
  const below = nodes.flatMap((node) => nodesUnder(node.children))
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

interface TreeNodeProps {
  readonly node: FullTreeNode
  readonly level: number
  readonly collapsed: ReadonlySet<string>
  readonly onToggle: (href: string) => void
  readonly onNavigate: Navigate
}

function TreeNode({ node, level, collapsed, onToggle, onNavigate }: TreeNodeProps) {
  const open = !collapsed.has(node.href)
  const withChildren = node.children.length > 0
  const toggleLabel = `${open ? 'Collapse' : 'Expand'} ${node.title}`
  return (
    <li className="full-tree__node" data-level={level} data-kind={node.kind}>
      <div className="full-tree__row">
        {withChildren ? (
          <button
            type="button"
            className="full-tree__chevron"
            aria-expanded={open}
            aria-label={toggleLabel}
            title={toggleLabel}
            onClick={() => onToggle(node.href)}
          >
            <Icon name="chevron" />
          </button>
        ) : (
          <span className="full-tree__spacer" />
        )}
        <a
          className="full-tree__link"
          href={node.href}
          onClick={navigationClick(node.href, onNavigate)}
        >
          {node.kind === 'page' && <Icon name="page" />}
          <span>{node.title}</span>
        </a>
      </div>
      {withChildren && open && (
        <ul className="full-tree__children">
          {node.children.map((child) => (
            <TreeNode
              key={child.href}
              node={child}
              level={level + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// The whole tree starts collapsed. Each branch will stay open until Nick collapses that branch.
export function FullTree({ label, nodes, onNavigate }: FullTreeProps) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  if (nodes.length === 0) {
    return null
  }
  const toggle = (href: string) =>
    setCollapsed((current) =>
      current.has(href)
        ? new Set([...current].filter((each) => each !== href))
        : new Set([...current, href]),
    )
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
            <TreeNode
              key={node.href}
              node={node}
              level={1}
              collapsed={collapsed}
              onToggle={toggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
