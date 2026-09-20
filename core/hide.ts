import { SLOP_MIN_SCORE } from './rubric'

export interface HideSettings {
  enabled: boolean
  threshold: number
}

const MIN_THRESHOLD = 0
const MAX_THRESHOLD = 10

export function parseHide(value: unknown): HideSettings {
  if (typeof value !== 'object' || value === null) {
    return { enabled: false, threshold: SLOP_MIN_SCORE }
  }
  const candidate = value as Partial<HideSettings>
  return {
    enabled: Boolean(candidate.enabled),
    threshold: clampThreshold(candidate.threshold),
  }
}

function clampThreshold(threshold: unknown): number {
  if (typeof threshold !== 'number' || !Number.isFinite(threshold)) return SLOP_MIN_SCORE
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, threshold))
}

export function shouldHide(score: number, settings: HideSettings): boolean {
  return settings.enabled && score >= settings.threshold
}
