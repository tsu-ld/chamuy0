import type { JevAnswers, ScoreQuestion } from './rubric'
import { describe, expect, test } from 'bun:test'
import { buildQuestions, SCORE_QUESTION_KEY, SLOP_MIN_SCORE, toVerdict } from './rubric'

const SLOP_RAW_SCORE = 7.3
const SLOP_DISPLAY_SCORE = 8.1
const EXPECTED_SIGNAL_COUNT = 10
const SCORE_LEVEL_COUNT = 10
const BORDERLINE_RAW_SCORE = 3.6
const SLOP_BOUNDARY_RAW_SCORE = 4.5
const CLEAN_EDGE_RAW_SCORE = 2.25
const CLEAN_RAW_SCORE = 1.1
const FALLBACK_RAW_SCORE = 6

const REASON_QUESTION_KEY = 'main_reason'

function answersWith(score: number, reason: string, noul = 0.05): JevAnswers {
  const answers: JevAnswers = {
    [SCORE_QUESTION_KEY]: { type: 'score', score, legend: {}, probabilities: {}, confidence: 0.9 },
    [REASON_QUESTION_KEY]: { type: 'choice', choice: reason, probabilities: {}, confidence: 0.9 },
  }
  for (const key of Object.keys(buildQuestions())) {
    if (key !== SCORE_QUESTION_KEY && key !== REASON_QUESTION_KEY) answers[key] = { type: 'noul', noul }
  }
  return answers
}

function slopAnswers(): JevAnswers {
  const answers = answersWith(SLOP_RAW_SCORE, 'engagement_bait')
  for (const answer of Object.values(answers)) {
    if (answer.type === 'noul') answer.noul = 0.9
  }
  return answers
}

describe('toVerdict', () => {
  test('maps slop answers to score, verdict, reason and signals', () => {
    const verdict = toVerdict(slopAnswers())
    expect(verdict.verdict).toBe('slop')
    expect(verdict.score).toBe(SLOP_DISPLAY_SCORE)
    expect(verdict.reason.label).toBe('Engagement bait')
    expect(verdict.signals.filter(signal => signal.on)).toHaveLength(EXPECTED_SIGNAL_COUNT)
    const scoreQuestion = buildQuestions()[SCORE_QUESTION_KEY] as ScoreQuestion
    expect(scoreQuestion.criteria).toHaveLength(SCORE_LEVEL_COUNT)
  })

  test('maps the borderline and clean bands from the score alone', () => {
    expect(toVerdict(answersWith(BORDERLINE_RAW_SCORE, 'low_value')).verdict).toBe('borderline')
    expect(toVerdict(answersWith(CLEAN_EDGE_RAW_SCORE, 'none')).verdict).toBe('borderline')
    expect(toVerdict(answersWith(CLEAN_RAW_SCORE, 'none')).verdict).toBe('clean')
    expect(toVerdict(answersWith(SLOP_BOUNDARY_RAW_SCORE, 'none')).verdict).toBe('slop')
  })

  test('rejects an answer set with a missing signal or reason', () => {
    const incomplete = slopAnswers()
    delete incomplete.buzzwords
    expect(() => toVerdict(incomplete)).toThrow()
    const reasonless = slopAnswers()
    delete reasonless[REASON_QUESTION_KEY]
    expect(() => toVerdict(reasonless)).toThrow()
  })
})

describe('toVerdict reason', () => {
  test('always names a reason once the score leaves the clean band', () => {
    expect(toVerdict(answersWith(CLEAN_RAW_SCORE, 'none')).reason.key).toBe('none')
    expect(toVerdict(answersWith(FALLBACK_RAW_SCORE, 'none')).reason.key).toBe('low_value')
    const withSignal = answersWith(FALLBACK_RAW_SCORE, 'none')
    withSignal.engagement_bait = { type: 'noul', noul: 0.8 }
    expect(toVerdict(withSignal).reason.key).toBe('engagement_bait')
  })

  test('floors a sponsored or hot-take reason into the slop band', () => {
    const hotTake = toVerdict(answersWith(CLEAN_RAW_SCORE, 'hot_take'))
    expect(hotTake.verdict).toBe('slop')
    expect(hotTake.score).toBe(SLOP_MIN_SCORE)
    expect(toVerdict(answersWith(CLEAN_RAW_SCORE, 'sponsored')).verdict).toBe('slop')
    expect(toVerdict(answersWith(CLEAN_RAW_SCORE, 'broetry')).verdict).toBe('clean')
  })

  test('never names a bait reason on a clean score', () => {
    const clean = toVerdict(answersWith(CLEAN_RAW_SCORE, 'engagement_bait'))
    expect(clean.verdict).toBe('clean')
    expect(clean.reason.key).toBe('none')
    expect(toVerdict(answersWith(BORDERLINE_RAW_SCORE, 'none')).reason.key).toBe('low_value')
  })

  test('rejects bad reasons and out-of-range probabilities', () => {
    expect(() => toVerdict(answersWith(CLEAN_RAW_SCORE, 'banana'))).toThrow()
    const wild = answersWith(CLEAN_RAW_SCORE, 'none')
    wild.engagement_bait = { type: 'noul', noul: 1.5 }
    expect(() => toVerdict(wild)).toThrow()
  })
})
