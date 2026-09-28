import type { PostContext } from './post'
import { describe, expect, test } from 'bun:test'
import { addExample, buildState } from './examples'

const POST: PostContext = { kind: 'post', media: 'none', mediaLabel: '', text: 'post to classify' }

describe('calibration pool', () => {
  test('upserts by text and builds the few-shot state', () => {
    let pool = addExample([], { ...POST, text: 'first post' }, 'clean')
    pool = addExample(pool, { ...POST, text: 'second post' }, 'slop')
    pool = addExample(pool, { ...POST, text: 'first post' }, 'slop')

    expect(pool).toHaveLength(2)
    expect(pool.at(-1)?.label).toBe('slop')

    expect(buildState(POST, [])).toContain('Post to classify.\nKind: post.\nMedia: none.')
    const state = buildState(POST, pool)
    expect(state).toContain('[slop · post · none]')
    expect(state).toContain('Post to classify.')
  })

  test('keeps the same text as separate examples per context', () => {
    const pool = addExample(addExample([], POST, 'clean'), { ...POST, kind: 'comment' }, 'slop')
    expect(pool).toHaveLength(2)
  })

  test('carries comment and media context into the state', () => {
    const context: PostContext = { kind: 'comment', media: 'video', mediaLabel: 'a dog stealing a churro', text: 'short caption' }
    const state = buildState(context, [])
    expect(state).toContain('Kind: comment.')
    expect(state).toContain('Media: video.')
    expect(state).toContain('Media label: "a dog stealing a churro".')
  })
})
