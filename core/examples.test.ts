import { describe, expect, test } from 'bun:test'
import { addExample, buildState } from './examples'

describe('calibration pool', () => {
  test('upserts by text and builds the few-shot state', () => {
    let pool = addExample([], 'first post', 'clean')
    pool = addExample(pool, 'second post', 'slop')
    pool = addExample(pool, 'first post', 'slop')

    expect(pool).toHaveLength(2)
    expect(pool.at(-1)?.label).toBe('slop')
    expect(buildState('post to classify', [])).toBe('post to classify')

    const state = buildState('post to classify', pool)
    expect(state).toContain('[slop]')
    expect(state).toContain('post to classify')
  })
})
