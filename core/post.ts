export type PostKind = 'post' | 'comment'
export type MediaKind = 'none' | 'image' | 'video' | 'document'

export interface PostContext {
  kind: PostKind
  media: MediaKind
  mediaLabel: string
  text: string
}

const POST_KINDS: PostKind[] = ['post', 'comment']
const MEDIA_KINDS: MediaKind[] = ['none', 'image', 'video', 'document']
export const MAX_MEDIA_LABEL_LENGTH = 200
const MIN_TEXT_LENGTH = 10
export const MAX_TEXT_LENGTH = 8000

export function isPostKind(value: unknown): value is PostKind {
  return POST_KINDS.includes(value as PostKind)
}

export function isMediaKind(value: unknown): value is MediaKind {
  return MEDIA_KINDS.includes(value as MediaKind)
}

export function parsePostContext(value: unknown): PostContext | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Partial<PostContext>
  if (!isPostKind(candidate.kind)) return null
  if (!isMediaKind(candidate.media)) return null
  if (typeof candidate.mediaLabel !== 'string') return null
  if (typeof candidate.text !== 'string') return null
  const text = candidate.text.slice(0, MAX_TEXT_LENGTH)
  if (text.length < MIN_TEXT_LENGTH) return null
  return {
    kind: candidate.kind as PostKind,
    media: candidate.media as MediaKind,
    mediaLabel: candidate.mediaLabel.slice(0, MAX_MEDIA_LABEL_LENGTH),
    text,
  }
}

export function postKey(context: PostContext): string {
  return `${context.kind}|${context.media}|${context.mediaLabel}|${context.text}`
}
