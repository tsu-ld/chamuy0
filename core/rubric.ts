export const SCORE_QUESTION_KEY = 'slop_score'

export type Verdict = 'clean' | 'borderline' | 'slop'

export const VERDICTS: Verdict[] = ['clean', 'borderline', 'slop']

interface SlopSignal {
  key: string
  label: string
  probability: number
  on: boolean
}

export interface SlopVerdict {
  score: number
  verdict: Verdict
  signals: SlopSignal[]
}

interface NoulQuestion {
  type: 'noul'
  instructions: string
  criteria: { true: string, false: string }
}

export interface ScoreQuestion {
  type: 'score'
  instructions: string
  criteria: string[]
}

interface ChoiceQuestion {
  type: 'choice'
  instructions: string
  criteria: Record<string, string | null>
}

type JevQuestion = NoulQuestion | ScoreQuestion | ChoiceQuestion
export type JevQuestions = Record<string, JevQuestion>

interface JevAnswer {
  type?: string
  noul?: number
  score?: number
  choice?: string
  legend?: Record<string, string>
  probabilities?: Record<string, number>
  confidence?: number
}

export type JevAnswers = Record<string, JevAnswer>

interface SignalDefinition {
  key: string
  label: string
  instructions: string
  criteria: { true: string, false: string }
}

const SCORE_INSTRUCTIONS = 'Rate how much this LinkedIn post is slop: engagement bait, broetry (dramatic one-line paragraphs), manufactured hype, empty corporate jargon, generic AI-written text, or a fabricated story with a forced moral. Judge content and style, regardless of the post language. A post can cite numbers and still be slop when it wraps them in hype or reads like a content-farm summary. A first-person story that quotes a boss, recruiter or colleague word for word and ends with a tidy lesson is usually fabricated bait; a messy, offhand anecdote without a tidy lesson is not. The first level is a plain, concrete post with real information or a genuine personal anecdote; the last level is pure bait that asks for interaction while adding nothing.'

const SCORE_CRITERIA = [
  'Plain, concrete, verifiable information or a real specific personal experience, written without hype.',
  'Real substance with a touch of hype or formatting.',
  'Real information wrapped in hype, emoji bullets or manufactured excitement.',
  'Content-farm texture: recycled news, breathless tone, little of the author in it.',
  'Vague or promotional, with some real substance.',
  'Half substance, half filler or self-promotion.',
  'Filler dominates, with very little information.',
  'A story engineered as bait: fake vulnerability, quoted dialogue, tidy moral; or promotion disguised as advice.',
  'Classic bait: broetry formatting, jargon, forced moral.',
  'Pure engagement bait: asks for likes, comments or reposts while adding nothing.',
]

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    key: 'engagement_bait',
    label: 'Engagement bait',
    instructions: 'Explicitly asks for interaction (like, comment, tag, repost) or closes with empty questions such as "agree?".',
    criteria: {
      true: 'Explicitly asks for interaction or closes with an empty question.',
      false: 'Does not ask for interaction or close with an empty question.',
    },
  },
  {
    key: 'humblebrag',
    label: 'Humblebrag',
    instructions: 'Shows off an achievement, success or virtue disguised as humility, vulnerability or advice.',
    criteria: {
      true: 'Brags about a success or virtue through a humble or vulnerable framing.',
      false: 'Does not brag through a humble or vulnerable framing.',
    },
  },
  {
    key: 'ai_generic',
    label: 'AI generic',
    instructions: 'Reads like AI-generated or content-farm text: predictable template, filler phrases, emoji bullet lists, breathless hype, no personal voice and no concrete details.',
    criteria: {
      true: 'Reads like AI-generated or content-farm text with template structure and no personal voice.',
      false: 'Reads like text written by a person about something specific.',
    },
  },
  {
    key: 'buzzwords',
    label: 'Corporate buzzwords',
    instructions: 'High density of empty corporate or fashion jargon (synergy, mindset, disruptive, leadership, "the future of work").',
    criteria: {
      true: 'Heavy use of empty corporate or fashion jargon.',
      false: 'Little or no empty corporate jargon.',
    },
  },
  {
    key: 'broetry',
    label: 'Broetry',
    instructions: 'Uses one-sentence-per-line dramatic formatting: stacked short lines and pauses that manufacture emotion or suspense.',
    criteria: {
      true: 'Built from dramatic one-line paragraphs and manufactured pauses.',
      false: 'Uses normal paragraph structure.',
    },
  },
  {
    key: 'fake_story',
    label: 'Fabricated story',
    instructions: 'Tells a convenient anecdote with quoted dialogue and a tidy lesson, as if fabricated or polished for virality.',
    criteria: {
      true: 'Convenient anecdote with quoted dialogue and a tidy, viral-ready lesson.',
      false: 'No convenient anecdote with quoted dialogue and a tidy lesson.',
    },
  },
]

const CLEAN_MAX_SCORE = 2.5
const SLOP_MIN_SCORE = 5
const SIGNAL_ON_THRESHOLD = 0.5
const SCORE_PRECISION = 10
const SCORE_RAW_MIN = 0
const SCORE_RAW_MAX = SCORE_CRITERIA.length - 1
const SCORE_DISPLAY_MAX = 10
const SCORE_DISPLAY_FACTOR = SCORE_DISPLAY_MAX / SCORE_RAW_MAX
const VERDICT_QUESTION_KEY = 'verdict_choice'
const AMBIGUITY_MARGIN = 0.6
const VERDICT_INSTRUCTIONS = 'Decide the final verdict for this post: clean (a reader gets real value), borderline (mixed: real substance with promotional or hype framing), or slop (low-value bait a careful reader should skip).'
const VERDICT_OPTIONS: Record<string, string | null> = {
  clean: 'Concrete information or a genuine anecdote, no sales or virality agenda.',
  borderline: 'Real substance mixed with promotion, hype or bait framing.',
  slop: 'Engagement farming, broetry, manufactured hype or generic filler.',
}

export function buildQuestions(): JevQuestions {
  const questions: JevQuestions = {
    [SCORE_QUESTION_KEY]: { type: 'score', instructions: SCORE_INSTRUCTIONS, criteria: SCORE_CRITERIA },
    [VERDICT_QUESTION_KEY]: { type: 'choice', instructions: VERDICT_INSTRUCTIONS, criteria: VERDICT_OPTIONS },
  }
  for (const definition of SIGNAL_DEFINITIONS) {
    questions[definition.key] = {
      type: 'noul',
      instructions: definition.instructions,
      criteria: definition.criteria,
    }
  }
  return questions
}

export function isVerdict(value: unknown): value is Verdict {
  return typeof value === 'string' && VERDICTS.includes(value as Verdict)
}

export function toVerdict(answers: JevAnswers): SlopVerdict {
  const rawScore = readScore(answers, SCORE_QUESTION_KEY)
  const score = roundScore(rawScore * SCORE_DISPLAY_FACTOR)
  const signals = SIGNAL_DEFINITIONS.map((definition) => {
    const probability = readProbability(answers, definition.key)
    return {
      key: definition.key,
      label: definition.label,
      probability,
      on: probability > SIGNAL_ON_THRESHOLD,
    }
  })
  return { score, verdict: resolveVerdict(score, readChoice(answers)), signals }
}

function resolveVerdict(score: number, choice: Verdict): Verdict {
  if (isNearBoundary(score)) return choice
  return verdictFor(score)
}

function isNearBoundary(score: number): boolean {
  const nearClean = Math.abs(score - CLEAN_MAX_SCORE) <= AMBIGUITY_MARGIN
  const nearSlop = Math.abs(score - SLOP_MIN_SCORE) <= AMBIGUITY_MARGIN
  return nearClean || nearSlop
}

function readChoice(answers: JevAnswers): Verdict {
  const answer = answers[VERDICT_QUESTION_KEY]
  if (!answer || !isVerdict(answer.choice)) {
    throw new Error(`Jev answer "${VERDICT_QUESTION_KEY}" must contain a valid verdict`)
  }
  return answer.choice
}

function readScore(answers: JevAnswers, key: string): number {
  const answer = answers[key]
  if (!answer || typeof answer.score !== 'number' || !Number.isFinite(answer.score)) {
    throw new Error(`Jev answer "${key}" must contain a finite score`)
  }
  if (answer.score < SCORE_RAW_MIN || answer.score > SCORE_RAW_MAX) {
    throw new Error(`Jev score "${key}" is out of the expected level range`)
  }
  return answer.score
}

function readProbability(answers: JevAnswers, key: string): number {
  const answer = answers[key]
  if (!answer || typeof answer.noul !== 'number' || !Number.isFinite(answer.noul)) {
    throw new Error(`Jev answer "${key}" must contain a finite probability`)
  }
  if (answer.noul < SCORE_RAW_MIN || answer.noul > 1) {
    throw new Error(`Jev probability "${key}" is out of the 0 to 1 range`)
  }
  return answer.noul
}

function roundScore(score: number): number {
  return Math.round(score * SCORE_PRECISION) / SCORE_PRECISION
}

function verdictFor(score: number): Verdict {
  if (score >= SLOP_MIN_SCORE) return 'slop'
  if (score < CLEAN_MAX_SCORE) return 'clean'
  return 'borderline'
}
