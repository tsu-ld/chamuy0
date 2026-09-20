import type { TrainingExample } from '../core/examples'
import { isVerdict } from '../core/rubric'
import { extensionApi } from './api'

const API_KEY_FIELD = 'apiKey'
const TRAINING_FIELD = 'trainingExamples'

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
