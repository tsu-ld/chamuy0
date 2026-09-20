import type { Verdict } from './rubric'
import { textKey } from './hash'
import { VERDICTS } from './rubric'

export interface TrainingExample {
  id: string
  label: Verdict
  text: string
}

const MAX_PER_LABEL = 2
const EXCERPT_LENGTH = 600

export function addExample(pool: TrainingExample[], text: string, label: Verdict): TrainingExample[] {
  const id = textKey(text)
  const rest = pool.filter(entry => entry.id !== id)
  return [...rest, { id, label, text }]
}

export function buildState(post: string, pool: TrainingExample[]): string {
  const samples = pickSamples(pool)
  if (samples.length === 0) return post
  const blocks = samples.map(entry => `[${entry.label}]\n${excerpt(entry.text)}`)
  return `Labeled reference posts:\n\n${blocks.join('\n\n')}\n\nPost to classify:\n\n${post}`
}

function pickSamples(pool: TrainingExample[]): TrainingExample[] {
  return VERDICTS.flatMap(label => pool.filter(entry => entry.label === label).slice(-MAX_PER_LABEL))
}

function excerpt(text: string): string {
  if (text.length <= EXCERPT_LENGTH) return text
  return `${text.slice(0, EXCERPT_LENGTH)}...`
}
