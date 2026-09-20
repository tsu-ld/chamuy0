import type { SlopVerdict } from '../core/rubric'
import { isVerdict } from '../core/rubric'

export interface SlopReply {
  ok: true
  verdict: SlopVerdict
  model: string
  trainedOn: number
}

interface FailureReply {
  ok: false
  code: 'no-key' | 'no-access' | 'request'
  error: string
}

export type ClassifyReply = SlopReply | FailureReply

export function isSlopReply(value: unknown): value is SlopReply {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<SlopReply>
  return candidate.ok === true
    && typeof candidate.model === 'string'
    && typeof candidate.trainedOn === 'number'
    && hasSlopVerdict(candidate.verdict)
}

function hasSlopVerdict(value: unknown): value is SlopVerdict {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<SlopVerdict>
  return isVerdict(candidate.verdict)
    && typeof candidate.score === 'number'
    && Array.isArray(candidate.signals)
}
