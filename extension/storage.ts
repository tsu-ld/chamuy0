import type { TrainingExample } from '../core/examples'
import type { HideSettings } from '../core/hide'
import { textKey } from '../core/hash'
import { parseHide } from '../core/hide'
import { isMediaKind, isPostKind, postKey } from '../core/post'
import { isVerdict } from '../core/rubric'
import { extensionApi, onLocalChange } from './api'

const API_KEY_FIELD = 'apiKey'
const TRAINING_FIELD = 'trainingExamples'
const HIDE_FIELD = 'hide'
const SKIP_MEDIA_FIELD = 'skipMedia'

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
  return value.filter(isTrainingExample).map(withCurrentId)
}

function withCurrentId(entry: TrainingExample): TrainingExample {
  const id = textKey(postKey({
    kind: entry.kind ?? 'post',
    media: entry.media ?? 'none',
    mediaLabel: '',
    text: entry.text,
  }))
  return id === entry.id ? entry : { ...entry, id }
}

function isTrainingExample(entry: unknown): entry is TrainingExample {
  if (typeof entry !== 'object' || entry === null) return false
  const candidate = entry as Partial<TrainingExample>
  return typeof candidate.id === 'string'
    && typeof candidate.text === 'string'
    && isVerdict(candidate.label)
    && (candidate.kind === undefined || isPostKind(candidate.kind))
    && (candidate.media === undefined || isMediaKind(candidate.media))
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

export async function readSkipMedia(): Promise<boolean> {
  const stored = await extensionApi.storage.local.get(SKIP_MEDIA_FIELD)
  return stored[SKIP_MEDIA_FIELD] === true
}

export async function writeSkipMedia(skipMedia: boolean): Promise<void> {
  await extensionApi.storage.local.set({ [SKIP_MEDIA_FIELD]: skipMedia })
}

export function onSkipMediaChange(listener: (skipMedia: boolean) => void): void {
  onLocalChange(SKIP_MEDIA_FIELD, value => listener(value === true))
}
