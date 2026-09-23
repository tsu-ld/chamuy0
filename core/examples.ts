import type { MediaKind, PostContext, PostKind } from './post'
import type { Verdict } from './rubric'
import { textKey } from './hash'
import { postKey } from './post'
import { VERDICTS } from './rubric'

export interface TrainingExample {
  id: string
  label: Verdict
  text: string
  kind?: PostKind
  media?: MediaKind
}

const MAX_PER_LABEL = 2
const EXCERPT_LENGTH = 600

export function addExample(pool: TrainingExample[], context: PostContext, label: Verdict): TrainingExample[] {
  const id = textKey(postKey(context))
  const rest = pool.filter(entry => entry.id !== id)
  return [...rest, { id, label, text: context.text, kind: context.kind, media: context.media }]
}

export function buildState(context: PostContext, pool: TrainingExample[]): string {
  const samples = pickSamples(pool)
  const post = `Post to classify.\nKind: ${context.kind}.\nMedia: ${context.media}.${mediaLine(context)}\n\n${context.text}`
  if (samples.length === 0) return post
  const blocks = samples.map(entry => `[${referenceTag(entry)}]\n${excerpt(entry.text)}`)
  return `Labeled reference posts:\n\n${blocks.join('\n\n')}\n\n${post}`
}

function mediaLine(context: PostContext): string {
  return context.mediaLabel ? `\nMedia label: "${context.mediaLabel}".` : ''
}

function referenceTag(entry: TrainingExample): string {
  return `${entry.label} · ${entry.kind ?? 'post'} · ${entry.media ?? 'none'}`
}

function pickSamples(pool: TrainingExample[]): TrainingExample[] {
  return VERDICTS.flatMap(label => pool.filter(entry => entry.label === label).slice(-MAX_PER_LABEL))
}

function excerpt(text: string): string {
  if (text.length <= EXCERPT_LENGTH) return text
  return `${text.slice(0, EXCERPT_LENGTH)}...`
}
