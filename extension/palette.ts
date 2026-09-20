export interface HostPalette {
  ink: string
  inkSoft: string
  surface: string
  hairline: string
  hairlineSoft: string
  hover: string
  positive: string
  caution: string
  negative: string
  shadow: string
}

const LIGHT_SIGNALS = { positive: '#057642', caution: '#915907', negative: '#b24020' }
const DARK_SIGNALS = { positive: '#7cc9a2', caution: '#d9ab63', negative: '#e08a6e' }

const TOKEN_NAMES: Array<[keyof HostPalette, string]> = [
  ['ink', '--lnslop-ink'],
  ['inkSoft', '--lnslop-ink-soft'],
  ['surface', '--lnslop-surface'],
  ['hairline', '--lnslop-hairline'],
  ['hairlineSoft', '--lnslop-hairline-soft'],
  ['hover', '--lnslop-hover'],
  ['positive', '--lnslop-positive'],
  ['caution', '--lnslop-caution'],
  ['negative', '--lnslop-negative'],
  ['shadow', '--lnslop-shadow'],
]

const MAX_CHANNEL = 255
const LUMA_RED = 0.2126
const LUMA_GREEN = 0.7152
const LUMA_BLUE = 0.0722
const DARK_THRESHOLD = 0.4
const INK_SOFT_PERCENT = 62
const HAIRLINE_PERCENT = 15
const HAIRLINE_SOFT_PERCENT = 8
const HOVER_PERCENT = 8

export function readHostPalette(anchor: HTMLElement): HostPalette {
  const ink = getComputedStyle(anchor).color
  const surface = findSurface(anchor)
  const dark = isDark(surface)
  const signals = dark ? DARK_SIGNALS : LIGHT_SIGNALS
  return {
    ink,
    inkSoft: mix(ink, INK_SOFT_PERCENT),
    surface,
    hairline: mix(ink, HAIRLINE_PERCENT),
    hairlineSoft: mix(ink, HAIRLINE_SOFT_PERCENT),
    hover: mix(ink, HOVER_PERCENT),
    ...signals,
    shadow: dark ? '0 4px 12px rgba(0, 0, 0, .45)' : '0 4px 12px rgba(0, 0, 0, .15)',
  }
}

export function applyPalette(element: HTMLElement, palette: HostPalette): void {
  for (const [key, name] of TOKEN_NAMES) element.style.setProperty(name, palette[key])
}

function mix(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

function findSurface(element: HTMLElement): string {
  let node: HTMLElement | null = element
  while (node) {
    const background = getComputedStyle(node).backgroundColor
    if (!isTransparent(background)) return background
    node = node.parentElement
  }
  return '#fff'
}

function isTransparent(color: string): boolean {
  return color === 'transparent' || color === 'rgba(0, 0, 0, 0)'
}

function isDark(color: string): boolean {
  const channels = (color.match(/[\d.]+/g) ?? []).map(channel => Number(channel))
  const [red = MAX_CHANNEL, green = MAX_CHANNEL, blue = MAX_CHANNEL] = channels
  const luminance = (LUMA_RED * red + LUMA_GREEN * green + LUMA_BLUE * blue) / MAX_CHANNEL
  return luminance < DARK_THRESHOLD
}
