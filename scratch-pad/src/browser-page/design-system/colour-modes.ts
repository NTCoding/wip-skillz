export const colourModes = ['light', 'dark'] as const

export type ColourMode = (typeof colourModes)[number]

export function isColourMode(value: unknown): value is ColourMode {
  return colourModes.some((mode) => mode === value)
}
