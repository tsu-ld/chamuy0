import { describe, expect, test } from 'bun:test'
import { parseHide, shouldHide } from './hide'
import { SLOP_MIN_SCORE } from './rubric'

const GARBAGE_SCORE = 5
const THRESHOLD = 6.5
const BELOW_THRESHOLD = 6
const ABOVE_THRESHOLD = 9.8
const UNDER_SHOT = -3
const OVER_SHOT = 99
const BAND_MIN = 0
const BAND_MAX = 10
const SAVED_THRESHOLD = 7.5

describe('hide', () => {
  test('parses garbage and missing values into defaults', () => {
    for (const garbage of [undefined, null, GARBAGE_SCORE, 'hide', [], true]) {
      expect(parseHide(garbage)).toEqual({ enabled: false, threshold: SLOP_MIN_SCORE })
    }
    expect(parseHide({})).toEqual({ enabled: false, threshold: SLOP_MIN_SCORE })
    expect(parseHide({ enabled: 'yes', threshold: 'high' })).toEqual({ enabled: true, threshold: SLOP_MIN_SCORE })
  })

  test('clamps the threshold to the 0 to 10 band', () => {
    expect(parseHide({ enabled: true, threshold: UNDER_SHOT }).threshold).toBe(BAND_MIN)
    expect(parseHide({ enabled: true, threshold: OVER_SHOT }).threshold).toBe(BAND_MAX)
    expect(parseHide({ enabled: true, threshold: Number.NaN }).threshold).toBe(SLOP_MIN_SCORE)
    expect(parseHide({ enabled: true, threshold: SAVED_THRESHOLD }).threshold).toBe(SAVED_THRESHOLD)
  })

  test('hides at or above the threshold, never below', () => {
    const settings = { enabled: true, threshold: THRESHOLD }
    expect(shouldHide(THRESHOLD, settings)).toBe(true)
    expect(shouldHide(ABOVE_THRESHOLD, settings)).toBe(true)
    expect(shouldHide(BELOW_THRESHOLD, settings)).toBe(false)
    expect(shouldHide(BAND_MIN, settings)).toBe(false)
  })

  test('hides nothing while disabled, whatever the score', () => {
    const settings = { enabled: false, threshold: BAND_MIN }
    expect(shouldHide(BAND_MAX, settings)).toBe(false)
  })
})
