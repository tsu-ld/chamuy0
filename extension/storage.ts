import type { TrainingExample } from '../core/examples'
import type { HideSettings } from '../core/hide'
import { parseHide } from '../core/hide'
import { isVerdict } from '../core/rubric'
import { extensionApi, onLocalChange } from './api'

const API_KEY_FIELD = 'apiKey'
const TRAINING_FIELD = 'trainingExamples'
const HIDE_FIELD = 'hide'

export async function readApiKey(): Promise<string> {
  const stored = await extensionApi.storage.local.get(API_KEY_FIELD)
  const value = stored[API_KEY_FIELD]
  return typeof value === 'string' ? value : ''
}

export async function writeApiKey(apiKey: string): Promise<void> {
  await extensionApi.storage.local.set({ [API_KEY_FIELD]: apiKey })
}

export async function readTraining(): Promise<TrainingExample[]> {
  const stored = await extensionApi.storage.local.get(TRAINING_FIELD)
  const value: unknown = stored[TRAINING_FIELD]
  if (!Array.isArray(value)) return []
  return value.filter(isTrainingExample)
}

function isTrainingExample(entry: unknown): entry is TrainingExample {
  if (typeof entry !== 'object' || entry === null) return false
  const candidate = entry as Partial<TrainingExample>
  return typeof candidate.id === 'string'
    && typeof candidate.text === 'string'
    && isVerdict(candidate.label)
}

export async function writeTraining(pool: TrainingExample[]): Promise<void> {
  await extensionApi.storage.local.set({ [TRAINING_FIELD]: pool })
}

export async function readHide(): Promise<HideSettings> {
  const stored = await extensionApi.storage.local.get(HIDE_FIELD)
  return parseHide(stored[HIDE_FIELD])
}

export async function writeHide(settings: HideSettings): Promise<void> {
  await extensionApi.storage.local.set({ [HIDE_FIELD]: settings })
}

export function onHideChange(listener: (settings: HideSettings) => void): void {
  onLocalChange(HIDE_FIELD, value => listener(parseHide(value)))
}
