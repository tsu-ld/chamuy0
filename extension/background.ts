import type { Verdict } from '../core/rubric'
import type { ClassifyReply } from './protocol'
import { addExample, buildState } from '../core/examples'
import { API_ORIGIN, askJev, DEFAULT_MODEL } from '../core/jev'
import { buildQuestions, isVerdict, toVerdict } from '../core/rubric'
import { extensionApi } from './api'
import { readApiKey, readTraining, writeTraining } from './storage'

const MIN_TEXT_LENGTH = 20
const MAX_TEXT_LENGTH = 8000

interface ClassifyMessage {
  type: 'classify'
  text: string
}

interface LabelMessage {
  type: 'label'
  text: string
  label: Verdict
}

interface OpenOptionsMessage {
  type: 'openOptions'
}

type ExtensionMessage = ClassifyMessage | LabelMessage | OpenOptionsMessage

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
      return classify(message.text)
    case 'label':
      return label(message)
    default:
      extensionApi.runtime.openOptionsPage()
      return { ok: true }
  }
}

function readMessage(raw: unknown): ExtensionMessage {
  if (typeof raw !== 'object' || raw === null || !('type' in raw)) {
    throw new Error('Malformed extension message')
  }
  const candidate = raw as { type: unknown, text?: unknown, label?: unknown }
  if (candidate.type === 'classify') return { type: 'classify', text: readText(candidate.text) }
  if (candidate.type === 'label') {
    if (!isVerdict(candidate.label)) throw new Error('Unknown training label')
    return { type: 'label', text: readText(candidate.text), label: candidate.label }
  }
  if (candidate.type === 'openOptions') return { type: 'openOptions' }
  throw new Error(`Unknown message type: ${String(candidate.type)}`)
}

function readText(value: unknown): string {
  if (typeof value !== 'string' || value.length < MIN_TEXT_LENGTH || value.length > MAX_TEXT_LENGTH) {
    throw new Error('Invalid post text')
  }
  return value
}

async function classify(text: string): Promise<ClassifyReply> {
  const apiKey = await readApiKey()
  if (!apiKey) return { ok: false, code: 'no-key', error: 'TypeSafe API key not set' }
  if (!(await hasApiAccess())) {
    return { ok: false, code: 'no-access', error: 'Access to TypeSafe was not granted' }
  }
  try {
    const pool = await readTraining()
    const response = await askJev(buildQuestions(), buildState(text, pool), { apiKey })
    return {
      ok: true,
      verdict: toVerdict(response.answers),
      model: response.model ?? DEFAULT_MODEL,
      trainedOn: pool.length,
    }
  } catch (error) {
    return { ok: false, code: 'request', error: messageOf(error) }
  }
}

async function label(message: LabelMessage): Promise<{ ok: true, count: number }> {
  const pool = await readTraining()
  const updated = addExample(pool, message.text, message.label)
  await writeTraining(updated)
  return { ok: true, count: updated.length }
}

async function hasApiAccess(): Promise<boolean> {
  return hasAccess([API_ORIGIN])
}

async function hasAccess(origins: string[]): Promise<boolean> {
  return extensionApi.permissions.contains({ origins })
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
