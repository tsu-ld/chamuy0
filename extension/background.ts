import type { PostContext } from '../core/post'
import type { Verdict } from '../core/rubric'
import type { ClassifyReply } from './protocol'
import { addExample, buildState } from '../core/examples'
import { askJev, DEFAULT_MODEL } from '../core/jev'
import { parsePostContext } from '../core/post'
import { buildQuestions, isVerdict, toVerdict } from '../core/rubric'
import { extensionApi } from './api'
import { readApiKey, readTraining, writeTraining } from './storage'

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
      return classify(message.context)
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
  const candidate = raw as { type: unknown, context?: unknown, label?: unknown }
  if (candidate.type === 'classify') return { type: 'classify', context: readContext(candidate.context) }
  if (candidate.type === 'label') {
    if (!isVerdict(candidate.label)) throw new Error('Unknown training label')
    return { type: 'label', context: readContext(candidate.context), label: candidate.label }
  }
  if (candidate.type === 'openOptions') return { type: 'openOptions' }
  throw new Error(`Unknown message type: ${String(candidate.type)}`)
}

function readContext(value: unknown): PostContext {
  const context = parsePostContext(value)
  if (!context) throw new Error('Invalid post context')
  return context
}

async function classify(context: PostContext): Promise<ClassifyReply> {
  const apiKey = await readApiKey()
  if (!apiKey) return { ok: false, code: 'no-key', error: 'TypeSafe API key not set' }
  try {
    const pool = await readTraining()
    const response = await askJev(buildQuestions(), buildState(context, pool), { apiKey })
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
  const updated = addExample(pool, message.context, message.label)
  await writeTraining(updated)
  return { ok: true, count: updated.length }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
