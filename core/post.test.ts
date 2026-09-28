import type { PostContext } from './post'
import { describe, expect, test } from 'bun:test'
import { parsePostContext, postKey } from './post'

const VALID: PostContext = { kind: 'comment', media: 'video', mediaLabel: 'a cat', text: 'hello there' }
const TEXT_LIMIT = 8000
const MEDIA_LABEL_LIMIT = 200

describe('parsePostContext', () => {
  test('accepts a well-formed context', () => {
    expect(parsePostContext(VALID)).toEqual(VALID)
  })

  test('rejects malformed contexts', () => {
    expect(parsePostContext(null)).toBeNull()
    expect(parsePostContext({ ...VALID, kind: 'reply' })).toBeNull()
    expect(parsePostContext({ ...VALID, media: 'gif' })).toBeNull()
    expect(parsePostContext({ ...VALID, mediaLabel: 7 })).toBeNull()
    expect(parsePostContext({ ...VALID, text: '' })).toBeNull()
    expect(parsePostContext({ ...VALID, text: 'short' })).toBeNull()
  })

  test('clamps long text and media labels', () => {
    const parsed = parsePostContext({ ...VALID, text: 'x'.repeat(TEXT_LIMIT + 1000), mediaLabel: 'y'.repeat(MEDIA_LABEL_LIMIT + 100) })
    expect(parsed?.text).toHaveLength(TEXT_LIMIT)
    expect(parsed?.mediaLabel).toHaveLength(MEDIA_LABEL_LIMIT)
  })

  test('postKey separates the same text in different contexts', () => {
    expect(postKey({ ...VALID, kind: 'post' })).not.toBe(postKey(VALID))
    expect(postKey({ ...VALID, media: 'none' })).not.toBe(postKey(VALID))
    expect(postKey({ ...VALID, mediaLabel: 'a dog' })).not.toBe(postKey(VALID))
  })
})
