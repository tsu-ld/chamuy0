export const SCORE_QUESTION_KEY = 'slop_score'

export type Verdict = 'clean' | 'borderline' | 'slop'

export const VERDICTS: Verdict[] = ['clean', 'borderline', 'slop']

interface SlopSignal {
  key: string
  label: string
  probability: number
  on: boolean
}

interface SlopReason {
  key: string
  label: string
}

export interface SlopVerdict {
  score: number
  verdict: Verdict
  reason: SlopReason
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

const SCORE_INSTRUCTIONS = 'Score how much this post is slop: engagement bait, rage bait, broetry, manufactured hooks, hype, empty jargon, generic AI or content-farm prose, a fabricated story with a forced lesson, or promotion dressed as content. Judge content and style, whatever the language. The state says whether this is a feed post or a comment and whether media is attached. A comment is conversation: a short reply, joke or reaction is normal and not slop. But a comment that asserts a provocative claim, dunks on an easy target or reports outrage with nothing behind it is a hot take, not conversation, and a hot take belongs at level 5 or higher. When media is attached the text is a caption: a short caption that leans on the image or video is not bait by itself, and media never rescues a sponsored, promotional or engagement-farming post. Paid, gifted or affiliate promotion presented through a lesson, story or testimonial makes the post promotional packaging: put it at level 5 or higher even when the details are technical, unless the sponsorship is a minor aside in an otherwise useful first-person account. A bare hot take also puts the post at level 5 or higher. Concrete substance anchors the score: a named tool, real numbers or a genuine offhand anecdote keeps a plainly reported post low even when it is polished or lightly hyped. But first-person detail does not lower a post whose point is a hardship or victim story engineered as a hook, a hot take, broetry, a forced lesson or a paid placement. Reserve the fabricated-story reading for a parable: a stranger, boss or client delivering a tidy lesson that ends in a pitch. A first-person work story, or a comic anecdote told for its own sake, is not a parable. A post that adds nothing, like a greeting or a one-line reaction, is low-value rather than pure bait. Level 0 is plain and concrete; level 9 is pure interaction bait, a fully fabricated story, or content whose only purpose is promotion.'

const SCORE_CRITERIA = [
  'Plain, concrete and specific. Real information or a genuine, offhand anecdote, no hype.',
  'Real substance with a little polish or hype; still worth reading.',
  'Real information wrapped in a template or emoji bullets, but the substance survives: names, numbers or dated events are present. A friendly reply or joke that stays conversational also sits here; a take that asserts rather than informs does not.',
  'Content-farm texture: generic advice with a thin concrete core, a mild brag, or a flat low-value take.',
  'Vague or promotional, with some real substance left. A sparse but provocative claim lands here too.',
  'Half substance, half filler: the point is thin and the packaging does the work, or a bold claim with nothing behind it.',
  'Filler dominates: stock phrases, hype or formatting carry a nearly empty post.',
  'A story engineered as bait: convenient anecdote, quoted dialogue, tidy lesson.',
  'Classic bait: broetry formatting, jargon, manufactured hook, forced moral; or a sponsored lesson where the promotion drives the post.',
  'Pure engagement bait: asks for interaction, adds nothing, is fully fabricated, or sells through a story with no value outside the pitch.',
]

const SIGNAL_DEFINITIONS = [
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
    key: 'sponsored',
    label: 'Sponsored or collab',
    instructions: 'Carries a paid partnership, gift or affiliate promotion presented as content: "#ad", "sponsored", "thanks to X for collaborating with me on this post", "my partner", "they sent me this", a referral push, or a third-party brand woven into a lesson or testimonial. Announcing your own product, event or service plainly is not sponsorship.',
    criteria: {
      true: 'Presents a paid partnership, gift, affiliate or third-party promotion as content.',
      false: 'No paid partnership, gift or affiliate promotion.',
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
    instructions: 'A convenient anecdote polished for virality: word-for-word dialogue with a stranger, boss or janitor, mirrored-date turnarounds, a reversal, and a tidy lesson that usually ends in a pitch. Not a self-deprecating or comic anecdote that ends on a punchline.',
    criteria: {
      true: 'Convenient anecdote with quoted dialogue and a tidy lesson or pitch.',
      false: 'No convenient anecdote with a tidy lesson or pitch; a comic anecdote is not one.',
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
  {
    key: 'hot_take',
    label: 'Hot take',
    instructions: 'States a bold or provocative claim as if it were a finding, with no source, evidence or firsthand experience: a dunk, a sweeping "the industry is rotten" one-liner, or a controversy framed for argument. A claim backed by a source, numbers or firsthand work is not a hot take.',
    criteria: {
      true: 'Bold claim with no source, evidence or firsthand experience behind it.',
      false: 'Backs its claims, or makes no provocative claim.',
    },
  },
] as const satisfies readonly SignalDefinition[]

type SignalKey = typeof SIGNAL_DEFINITIONS[number]['key']

type ReasonKey = SignalKey | 'none' | 'low_value'

const REASON_QUESTION_KEY = 'main_reason'

const REASON_INSTRUCTIONS = 'Name the single trait that most drives the score. Use none only when the post is plain or an ordinary conversational reply, and low_value when it adds nothing but is not bait. When the score is 5 or higher, choose the flaw that drives it, not none.'

const REASON_LABELS: Record<string, string> = {
  none: 'Reads human',
  low_value: 'Low-value filler',
  ...Object.fromEntries(SIGNAL_DEFINITIONS.map(definition => [definition.key, definition.label])),
}

const CLEAN_MAX_SCORE = 2.5
export const SLOP_MIN_SCORE = 5
const SIGNAL_ON_THRESHOLD = 0.5
const SCORE_PRECISION = 10
const SCORE_RAW_MIN = 0
const SCORE_RAW_MAX = SCORE_CRITERIA.length - 1
const SCORE_DISPLAY_MAX = 10
const SCORE_DISPLAY_FACTOR = SCORE_DISPLAY_MAX / SCORE_RAW_MAX

export function buildQuestions(): JevQuestions {
  const questions: JevQuestions = {
    [SCORE_QUESTION_KEY]: { type: 'score', instructions: SCORE_INSTRUCTIONS, criteria: SCORE_CRITERIA },
    [REASON_QUESTION_KEY]: { type: 'choice', instructions: REASON_INSTRUCTIONS, criteria: buildReasonOptions() },
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

function buildReasonOptions(): Record<string, string> {
  const options: Record<string, string> = {
    none: 'Plain, concrete, or an ordinary conversational reply: no bait.',
    low_value: 'Adds nothing specific, but is not farming engagement.',
  }
  for (const definition of SIGNAL_DEFINITIONS) options[definition.key] = definition.criteria.true
  return options
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
  const stated = readReason(answers)
  const floored = applyFloors(score, stated)
  return { score: floored, verdict: verdictFor(floored), reason: resolveReason(stated, floored, signals), signals }
}

function applyFloors(score: number, stated: ReasonKey): number {
  if (stated !== 'sponsored' && stated !== 'hot_take') return score
  return Math.max(score, SLOP_MIN_SCORE)
}

function verdictFor(score: number): Verdict {
  if (score >= SLOP_MIN_SCORE) return 'slop'
  if (score < CLEAN_MAX_SCORE) return 'clean'
  return 'borderline'
}

function resolveReason(key: ReasonKey, score: number, signals: SlopSignal[]): SlopReason {
  if (score < CLEAN_MAX_SCORE) return reasonFor('none')
  if (key !== 'none') return reasonFor(key)
  const top = signals.reduce((best, signal) => (signal.probability > best.probability ? signal : best))
  if (top.on) return { key: top.key, label: top.label }
  return reasonFor('low_value')
}

function reasonFor(key: ReasonKey): SlopReason {
  return { key, label: REASON_LABELS[key] }
}

function readReason(answers: JevAnswers): ReasonKey {
  const answer = answers[REASON_QUESTION_KEY]
  if (!answer || typeof answer.choice !== 'string' || !(answer.choice in REASON_LABELS)) {
    throw new Error(`Jev answer "${REASON_QUESTION_KEY}" must contain a valid reason`)
  }
  return answer.choice as ReasonKey
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
