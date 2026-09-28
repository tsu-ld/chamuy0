import type { PostContext } from '../core/post'
import type { Verdict } from '../core/rubric'
import type { PublicPlan } from './entitlement'
import type { AccessReply, CancelReply, ClassifyReply, SubscribeReply } from './protocol'
import type { StoredAccess } from './storage'
import { addExample, buildState } from '../core/examples'
import { askJev, DEFAULT_MODEL, JevError } from '../core/jev'
import { parsePostContext } from '../core/post'
import { buildQuestions, isVerdict, toVerdict } from '../core/rubric'
import { extensionApi } from './api'
import { askPlan, cancelPlan, currentPlan, isPlanActive, readPlans, requestSubscribe } from './entitlement'
import { readAccess, readApiKey, readTraining, writeTraining } from './storage'

const HTTP_UNAUTHORIZED = 401
const HTTP_PAYMENT_REQUIRED = 402
const HTTP_TOO_MANY_REQUESTS = 429

interface ClassifyMessage {
  type: 'classify'
  context: PostContext
}

interface LabelMessage {
  type: 'label'
  context: PostContext
  label: Verdict
}

interface OpenOptionsMessage {
  type: 'openOptions'
}

interface AccessMessage {
  type: 'access'
}

interface SubscribeMessage {
  type: 'subscribe'
  plan: string
}

interface CancelMessage {
  type: 'cancel'
}

type ExtensionMessage = ClassifyMessage | LabelMessage | OpenOptionsMessage | AccessMessage | SubscribeMessage | CancelMessage

extensionApi.runtime.onMessage.addListener((raw: unknown, _sender, sendResponse) => {
  void respond(raw, sendResponse)
  return true
})

extensionApi.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') extensionApi.runtime.openOptionsPage()
})

async function respond(raw: unknown, sendResponse: (reply: unknown) => void): Promise<void> {
  try {
    sendResponse(await route(readMessage(raw)))
  } catch (error) {
    sendResponse({ ok: false, code: 'request', error: messageOf(error) })
  }
}

async function route(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case 'classify':
      return classify(message.context)
    case 'label':
      return label(message)
    case 'access':
      return access()
    case 'subscribe':
      return subscribe(message.plan)
    case 'cancel':
      return cancel()
    default:
      extensionApi.runtime.openOptionsPage()
      return { ok: true }
  }
}

function readMessage(raw: unknown): ExtensionMessage {
  if (typeof raw !== 'object' || raw === null || !('type' in raw)) {
    throw new Error('Malformed extension message')
  }
  const candidate = raw as { type: unknown, context?: unknown, label?: unknown, plan?: unknown }
  switch (candidate.type) {
    case 'classify':
      return { type: 'classify', context: readContext(candidate.context) }
    case 'label':
      return readLabel(candidate)
    case 'openOptions':
      return { type: 'openOptions' }
    case 'access':
      return { type: 'access' }
    case 'subscribe':
      return readSubscribe(candidate)
    case 'cancel':
      return { type: 'cancel' }
    default:
      throw new Error(`Unknown message type: ${String(candidate.type)}`)
  }
}

function readLabel(candidate: { context?: unknown, label?: unknown }): ExtensionMessage {
  if (!isVerdict(candidate.label)) throw new Error('Unknown training label')
  return { type: 'label', context: readContext(candidate.context), label: candidate.label }
}

function readSubscribe(candidate: { plan?: unknown }): ExtensionMessage {
  if (typeof candidate.plan !== 'string') throw new Error('Unknown plan')
  return { type: 'subscribe', plan: candidate.plan }
}

function readContext(value: unknown): PostContext {
  const context = parsePostContext(value)
  if (!context) throw new Error('Invalid post context')
  return context
}

type Source = { kind: 'plan' } | { kind: 'key', apiKey: string } | { kind: 'none' }

async function classify(context: PostContext): Promise<ClassifyReply> {
  const pool = await readTraining()
  try {
    const source = await pickSource()
    if (source.kind === 'none') return noAccessReply()
    const questions = buildQuestions()
    const state = buildState(context, pool)
    const response = source.kind === 'plan'
      ? await askPlan(questions, state)
      : await askJev(questions, state, { apiKey: source.apiKey })
    return {
      ok: true,
      verdict: toVerdict(response.answers),
      model: response.model ?? DEFAULT_MODEL,
      trainedOn: pool.length,
    }
  } catch (error) {
    return failureReply(error)
  }
}

async function pickSource(): Promise<Source> {
  const access = await readAccess()
  if (isPlanActive(access, Date.now())) return { kind: 'plan' }
  const apiKey = await readApiKey()
  if (apiKey) return { kind: 'key', apiKey }
  const plan = await currentPlan()
  return isPlanActive(plan, Date.now()) ? { kind: 'plan' } : { kind: 'none' }
}

async function access(): Promise<AccessReply> {
  try {
    const plan = await currentPlan()
    const apiKey = await readApiKey()
    const state = { ...plan, source: sourceOf(plan, apiKey), plans: await optionalPlans() }
    return { ok: true, state }
  } catch (error) {
    return { ok: false, error: messageOf(error) }
  }
}

async function optionalPlans(): Promise<PublicPlan[]> {
  try {
    return await readPlans()
  } catch {
    return []
  }
}

async function subscribe(plan: string): Promise<SubscribeReply> {
  try {
    return { ok: true, url: await requestSubscribe(plan) }
  } catch (error) {
    return { ok: false, error: messageOf(error) }
  }
}

async function cancel(): Promise<CancelReply> {
  try {
    await cancelPlan()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: messageOf(error) }
  }
}

function sourceOf(plan: StoredAccess, apiKey: string): 'plan' | 'key' | 'none' {
  if (isPlanActive(plan, Date.now())) return 'plan'
  return apiKey ? 'key' : 'none'
}

function failureReply(error: unknown): ClassifyReply {
  if (!(error instanceof JevError)) return { ok: false, code: 'request', error: messageOf(error) }
  if (error.status === HTTP_UNAUTHORIZED || error.status === HTTP_PAYMENT_REQUIRED) return noAccessReply()
  if (error.status === HTTP_TOO_MANY_REQUESTS && error.message === 'quota') return quotaReply()
  return { ok: false, code: 'request', error: messageOf(error) }
}

function quotaReply(): ClassifyReply {
  return { ok: false, code: 'quota', error: 'Daily limit reached. Try again tomorrow.' }
}

function noAccessReply(): ClassifyReply {
  return { ok: false, code: 'no-access', error: 'Free trial ended. Subscribe or add your own TypeSafe key.' }
}

async function label(message: LabelMessage): Promise<{ ok: true, count: number }> {
  const pool = await readTraining()
  const updated = addExample(pool, message.context, message.label)
  await writeTraining(updated)
  return { ok: true, count: updated.length }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
