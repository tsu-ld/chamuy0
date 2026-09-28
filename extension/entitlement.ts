import type { JevResponse } from '../core/jev'
import type { JevQuestions } from '../core/rubric'
import type { Plan, StoredAccess } from './storage'
import { askJev, JevError } from '../core/jev'
import { isPlan, readAccess, writeAccess } from './storage'

const WORKER_URL = 'https://chamuy0-api.t-su.workers.dev'
const SESSION_URL = `${WORKER_URL}/session`
const CLASSIFY_URL = `${WORKER_URL}/classify`
const SUBSCRIBE_URL = `${WORKER_URL}/subscribe`
const CANCEL_URL = `${WORKER_URL}/cancel`
const PLANS_URL = `${WORKER_URL}/plans`
const SESSION_TIMEOUT_MS = 10000
const HTTP_UNAUTHORIZED = 401
const HTTP_PAYMENT_REQUIRED = 402
const HTTP_BAD_GATEWAY = 502
const HEX_RADIX = 16

interface SessionReply {
  token: string
  plan: Plan
  until: number
  renews: boolean
}

export function isPlanActive(access: StoredAccess | null, now: number): boolean {
  if (!access || access.plan === 'none') return false
  return access.until > now
}

async function startPlan(): Promise<StoredAccess> {
  return storeReply(await postSession(await deviceFingerprint()))
}

export async function currentPlan(): Promise<StoredAccess> {
  const access = await readAccess()
  if (!access) return startPlan()
  try {
    return storeReply(await getSession(access.token))
  } catch (error) {
    if (error instanceof JevError && error.status === HTTP_UNAUTHORIZED) return startPlan()
    return access
  }
}

export async function askPlan(questions: JevQuestions, state: string): Promise<JevResponse> {
  const access = await readAccess()
  if (!isPlanActive(access, Date.now()) || !access) throw new JevError('No plan', HTTP_PAYMENT_REQUIRED)
  return askJev(questions, state, { apiKey: access.token, baseUrl: CLASSIFY_URL })
}

export interface PublicPlan {
  id: string
  amount: number
  usd: number
  currency: string
  period: string
}

export async function readPlans(): Promise<PublicPlan[]> {
  const response = await fetch(PLANS_URL, { signal: AbortSignal.timeout(SESSION_TIMEOUT_MS) })
  if (!response.ok) throw await requestError(response, 'Plans request failed')
  const payload = await response.json() as { plans?: unknown }
  if (!Array.isArray(payload.plans)) throw new JevError('Malformed plans reply', HTTP_BAD_GATEWAY)
  return payload.plans.filter(isPublicPlan)
}

export async function requestSubscribe(plan: string): Promise<string> {
  const payload = await postAuthorized(SUBSCRIBE_URL, { plan }) as { url?: unknown }
  if (typeof payload.url !== 'string' || !payload.url) throw new JevError('Malformed subscribe reply', HTTP_BAD_GATEWAY)
  return payload.url
}

export async function cancelPlan(): Promise<void> {
  await postAuthorized(CANCEL_URL, {})
}

async function postAuthorized(url: string, body: unknown): Promise<unknown> {
  const access = await readAccess()
  if (!access) throw new JevError('No install token', HTTP_UNAUTHORIZED)
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${access.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  })
    if (!response.ok) throw await requestError(response, 'Request failed')
  return response.json()
}

const ERROR_TEXT: Record<string, string> = {
  'no-subscription': 'No subscription to cancel.',
  'unknown-plan': 'That plan is not available.',
  'unknown-token': 'This install is not recognized. Close and reopen the popup.',
  'no-token': 'This install is not recognized. Close and reopen the popup.',
  'no-access': 'Free trial ended. Subscribe or add your own key.',
  quota: 'Daily limit reached. Try again tomorrow.',
  'too-many-sessions': 'Too many trials from this network today.',
  'mercado-pago': 'Mercado Pago did not accept the request. Try again.',
}

async function requestError(response: Response, fallback: string): Promise<JevError> {
  const code = errorField(await response.text())
  const known = ERROR_TEXT[code]
  const message = known ? known : `${fallback}: ${response.status}`
  return new JevError(message, response.status)
}

function errorField(detail: string): string {
  try {
    const payload = JSON.parse(detail) as { error?: unknown }
    return typeof payload.error === 'string' ? payload.error : ''
  } catch {
    return ''
  }
}

function isPublicPlan(value: unknown): value is PublicPlan {
  if (typeof value !== 'object' || value === null) return false
  const plan = value as Partial<PublicPlan>
  return typeof plan.id === 'string'
    && typeof plan.amount === 'number'
    && typeof plan.usd === 'number'
    && typeof plan.currency === 'string'
    && typeof plan.period === 'string'
}

async function postSession(fingerprint: string): Promise<SessionReply> {
  const response = await fetch(SESSION_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fingerprint }),
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  })
  return readReply(response)
}

async function getSession(token: string): Promise<SessionReply> {
  const response = await fetch(SESSION_URL, {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  })
  return readReply(response)
}

async function readReply(response: Response): Promise<SessionReply> {
  if (!response.ok) throw await requestError(response, 'Session request failed')
  return parseReply(await response.json())
}

function parseReply(payload: unknown): SessionReply {
  const candidate = payload as Partial<SessionReply> | null
  if (!candidate || typeof candidate.token !== 'string' || typeof candidate.until !== 'number' || !isPlan(candidate.plan)) {
    throw new JevError('Malformed session reply', HTTP_BAD_GATEWAY)
  }
  return {
    token: candidate.token,
    plan: candidate.plan,
    until: candidate.until,
    renews: candidate.renews !== false,
  }
}

async function storeReply(reply: SessionReply): Promise<StoredAccess> {
  const access: StoredAccess = { token: reply.token, plan: reply.plan, until: reply.until, renews: reply.renews }
  await writeAccess(access)
  return access
}

async function deviceFingerprint(): Promise<string> {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const source = [
    navigator.platform,
    navigator.userAgent.replace(/[\d.]+/g, ''),
    navigator.language,
    new Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency),
    String(memory ?? ''),
  ].join('|')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return Array.from(new Uint8Array(digest), byte => byte.toString(HEX_RADIX).padStart(2, '0')).join('')
}
