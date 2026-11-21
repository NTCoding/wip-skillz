import './icon.css'

const paths = {
  check: 'M3.5 8.5l3 3 6-7',
  comment:
    'M3 3.5h10a.5.5 0 0 1 .5.5v6.5a.5.5 0 0 1-.5.5H7l-3 2.5V11H3a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z',
  close: 'M4 4l8 8M12 4l-8 8',
  copy: 'M5.5 5.5V3.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M3.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z',
  decision: 'M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M8 8h.01',
  grammar: 'M2.5 10l3-7 3 7M3.6 7.5h3.8M8.5 13c1.2-1 2.3-1 3.5 0s2.3 1 3.5 0',
  improvement:
    'M6 12.5h4M6.5 14h3M8 2a4 4 0 0 0-2.5 7.1c.6.5 1 1.1 1 1.9h3c0-.8.4-1.4 1-1.9A4 4 0 0 0 8 2z',
  inbox: 'M2.5 9.5l1.5-6h8l1.5 6v3.5h-11zM2.5 9.5h3.5l.5 1.5h3l.5-1.5h3.5',
  'full-size': 'M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5l-4.5 4.5M2.5 13.5l4.5-4.5',
  page: 'M4.5 2.5h5l2.5 2.5v8.5h-7.5zM9.5 2.5v2.5h2.5',
  'progress-tracker': 'M2.5 4.5h1M2.5 8h1M2.5 11.5h1M6 4.5h7.5M6 8h7.5M6 11.5h7.5',
  sent: 'M2.5 7.5l11-5-4.5 11-2-4.5zM7 9l6.5-6.5',
  'sidebar-collapse': 'M2.5 3.5h11v9h-11zM6 3.5v9M10.5 6.5L9 8l1.5 1.5',
  'sidebar-expand': 'M2.5 3.5h11v9h-11zM6 3.5v9M9 6.5L10.5 8 9 9.5',
  'text-changed': 'M8 2.5l6 11H2zM8 6.5v3.5M8 12h.01',
} as const

export type IconName = keyof typeof paths

interface IconProps {
  readonly name: IconName
}

export function Icon({ name }: IconProps) {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  )
}

export const iconNames = Object.keys(paths).filter((name): name is IconName => name in paths)
