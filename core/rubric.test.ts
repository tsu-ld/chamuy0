import type { JevAnswers, ScoreQuestion } from './rubric'
import { describe, expect, test } from 'bun:test'
import { buildQuestions, SCORE_QUESTION_KEY, toVerdict } from './rubric'

const SLOP_RAW_SCORE = 7.3
const SLOP_DISPLAY_SCORE = 8.1
const EXPECTED_SIGNAL_COUNT = 6
const SCORE_LEVEL_COUNT = 10
const BORDERLINE_RAW_SCORE = 3.6
const NEAR_BOUNDARY_RAW_SCORE = 4.6
const CLEAN_RAW_SCORE = 1.1

const SLOP_ANSWERS: JevAnswers = {
  [SCORE_QUESTION_KEY]: { type: 'score', score: SLOP_RAW_SCORE, legend: {}, probabilities: {}, confidence: 0.8 },
  verdict_choice: { type: 'choice', choice: 'slop', probabilities: {}, confidence: 0.9 },
  engagement_bait: { type: 'noul', noul: 0.9 },
  humblebrag: { type: 'noul', noul: 0.8 },
  ai_generic: { type: 'noul', noul: 0.7 },
  buzzwords: { type: 'noul', noul: 0.6 },
  broetry: { type: 'noul', noul: 0.55 },
  fake_story: { type: 'noul', noul: 0.51 },
}

function answersWithScore(score: number): JevAnswers {
  return {
    [SCORE_QUESTION_KEY]: { type: 'score', score, legend: {}, probabilities: {}, confidence: 0.9 },
    verdict_choice: { type: 'choice', choice: 'borderline', probabilities: {}, confidence: 0.9 },
    engagement_bait: { type: 'noul', noul: 0.05 },
    humblebrag: { type: 'noul', noul: 0.05 },
    ai_generic: { type: 'noul', noul: 0.05 },
    buzzwords: { type: 'noul', noul: 0.05 },
    broetry: { type: 'noul', noul: 0.05 },
    fake_story: { type: 'noul', noul: 0.05 },
  }
}

describe('toVerdict', () => {
  test('maps slop answers to score, verdict and signals', () => {
    const verdict = toVerdict(SLOP_ANSWERS)
    expect(verdict.verdict).toBe('slop')
    expect(verdict.score).toBe(SLOP_DISPLAY_SCORE)
    expect(verdict.signals.filter(signal => signal.on)).toHaveLength(EXPECTED_SIGNAL_COUNT)
    const scoreQuestion = buildQuestions()[SCORE_QUESTION_KEY] as ScoreQuestion
    expect(scoreQuestion.criteria).toHaveLength(SCORE_LEVEL_COUNT)
  })

  test('maps the borderline and clean bands', () => {
    expect(toVerdict(answersWithScore(BORDERLINE_RAW_SCORE)).verdict).toBe('borderline')
    expect(toVerdict(answersWithScore(CLEAN_RAW_SCORE)).verdict).toBe('clean')
  })

  test('uses the categorical verdict near a boundary', () => {
    const nearBoundary = answersWithScore(NEAR_BOUNDARY_RAW_SCORE)
    nearBoundary.verdict_choice = { type: 'choice', choice: 'clean', probabilities: {}, confidence: 0.8 }
    expect(toVerdict(nearBoundary).verdict).toBe('clean')
  })

  test('rejects an answer set with a missing signal', () => {
    const incomplete = { ...SLOP_ANSWERS }
    delete incomplete.buzzwords
    expect(() => toVerdict(incomplete)).toThrow()
  })
})
