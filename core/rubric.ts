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

const SCORE_INSTRUCTIONS = 'Score how much this post is slop: engagement bait, rage bait, broetry, manufactured hooks, hype, empty jargon, generic AI or content-farm prose, or a fabricated story with a forced lesson. Judge content and style, whatever the language. Concrete substance anchors the score: a named tool, real numbers, a dated first-person failure or a genuine offhand anecdote keeps a post low even when it is polished or lightly hyped; but concreteness does not rescue a post whose point is hype, a manufactured hook, broetry or a forced lesson. Reserve the fabricated-story reading for a parable: a stranger, boss or client delivering a tidy lesson that ends in a pitch, not any first-person work story. Level 0 is plain and concrete; level 9 is pure interaction bait that adds nothing.'

const SCORE_CRITERIA = [
  'Plain, concrete and specific. Real information or a genuine, offhand anecdote, no hype.',
  'Real substance with a little polish or hype; still worth reading.',
  'Real information wrapped in a template or emoji bullets, but the substance survives: names, numbers or dated events are present.',
  'Content-farm texture: generic advice with a thin concrete core, or a mild brag.',
  'Vague or promotional, with some real substance left.',
  'Half substance, half filler: the point is thin and the packaging does the work.',
  'Filler dominates: stock phrases, hype or formatting carry a nearly empty post.',
  'A story engineered as bait: convenient anecdote, quoted dialogue, tidy lesson.',
  'Classic bait: broetry formatting, jargon, manufactured hook, forced moral.',
  'Pure engagement bait: asks for interaction, adds nothing, or is fully fabricated.',
]

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    key: 'engagement_bait',
    label: 'Engagement bait',
    instructions: 'Asks for interaction or gates value behind it: like, comment, tag, repost or follow requests; "comment X and I\'ll DM"; link in comments; tag-piggybacking; false scarcity; "agree?"; empty closer questions.',
    criteria: {
      true: 'Asks for interaction or gates value behind engagement.',
      false: 'Does not ask for interaction or gate value behind engagement.',
    },
  },
  {
    key: 'humblebrag',
    label: 'Humblebrag',
    instructions: 'Shows off a success, status or virtue through complaint, humility, vulnerability or advice: "Humbled to announce", "So tired from my keynote", "Rejected 100 times", credential title stacks.',
    criteria: {
      true: 'Brags about success, status or virtue through a humble or vulnerable framing.',
      false: 'Does not brag through a humble or vulnerable framing.',
    },
  },
  {
    key: 'ai_generic',
    label: 'AI generic',
    instructions: 'Reads machine- or content-farm-written: templates, LLM lexis (delve, tapestry, pivotal), translated calques ("en el vertiginoso mundo actual", "cabe destacar"), -ing analysis, negative parallelism, rule of three, connector chains, vague attribution, generic opens or closes, emoji bullets, markdown leakage, flat rhythm.',
    criteria: {
      true: 'Reads like generated or content-farm text, not a person writing about something specific.',
      false: 'Reads like a person writing about something specific.',
    },
  },
  {
    key: 'buzzwords',
    label: 'Corporate buzzwords',
    instructions: 'Dense empty corporate or fashion jargon: synergy, mindset, disruptive, thought leadership, growth mindset, relentless execution, personal brand, the future of work, at scale, 10x, rockstar, we\'re like a family, competitive salary.',
    criteria: {
      true: 'Heavy use of empty corporate or fashion jargon.',
      false: 'Little or no empty corporate jargon.',
    },
  },
  {
    key: 'broetry',
    label: 'Broetry',
    instructions: 'One sentence per line formatting: stacked short paragraphs, blank-line pauses, single-line suspense fragments and cliffhangers that manufacture drama.',
    criteria: {
      true: 'Built from dramatic one-line paragraphs and manufactured pauses.',
      false: 'Uses normal paragraph structure.',
    },
  },
  {
    key: 'fake_story',
    label: 'Fabricated story',
    instructions: 'A convenient anecdote polished for virality: word-for-word dialogue with a stranger, boss or janitor, mirrored-date turnarounds, a reversal, and a tidy lesson that usually ends in a pitch.',
    criteria: {
      true: 'Convenient anecdote with quoted dialogue and a tidy, viral-ready lesson.',
      false: 'No convenient anecdote with quoted dialogue and a tidy lesson.',
    },
  },
  {
    key: 'template_hook',
    label: 'Manufactured hook',
    instructions: 'Opens with an engineered hook instead of the point: curiosity gap, an eavesdrop quote ("\'You\'re too expensive.\' I hear this every week"), "After N years...", "Everyone told me...", "I was wrong about...", "This changed everything", "Here\'s what nobody tells you", "The result?", or a life event forced into a business lesson.',
    criteria: {
      true: 'Opens with an engineered hook or forced lesson frame.',
      false: 'Opens with a plain statement or the actual point.',
    },
  },
  {
    key: 'rage_bait',
    label: 'Rage bait',
    instructions: 'Frames outrage or moral emotion as the point: accusatory "you" blame, absolutist always/never/everyone claims, moral-emotional stacking, or a strawman the post invites readers to fight.',
    criteria: {
      true: 'Frames outrage or moral emotion to provoke reaction rather than inform.',
      false: 'Informs or opines without outrage framing or accusatory blame.',
    },
  },
]

const CLEAN_MAX_SCORE = 2.5
export const SLOP_MIN_SCORE = 5
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
