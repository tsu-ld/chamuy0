import type { SlopVerdict } from '../core/rubric'
import type { PublicPlan } from './entitlement'
import type { Plan } from './storage'
import { isVerdict } from '../core/rubric'

export interface SlopReply {
  ok: true
  verdict: SlopVerdict
  model: string
  trainedOn: number
}

export type FailureCode = 'no-access' | 'quota' | 'request'

interface FailureReply {
  ok: false
  code: FailureCode
  error: string
}

export type ClassifyReply = SlopReply | FailureReply

export interface AccessState {
  token: string
  plan: Plan
  until: number
  renews: boolean
  source: 'plan' | 'key' | 'none'
  plans: PublicPlan[]
}

export type AccessReply = { ok: true, state: AccessState } | { ok: false, error: string }

export type SubscribeReply = { ok: true, url: string } | { ok: false, error: string }

export type CancelReply = { ok: true } | { ok: false, error: string }

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
    && hasReason(candidate.reason)
}

function hasReason(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { key?: unknown, label?: unknown }
  return typeof candidate.key === 'string' && typeof candidate.label === 'string'
}
