import type { MediaKind, PostKind } from '../core/post'
import { MAX_MEDIA_LABEL_LENGTH } from '../core/post'

const COMMENT_SELECTOR = '[data-urn^="urn:li:comment"], [data-testid="comments-list"], .comments-comment-entity, .comments-comment-item'
const VIDEO_SELECTOR = 'video, [data-testid="video-player"], .update-components-video'
const DOCUMENT_SELECTOR = '.update-components-document, [data-testid="document-container"]'
const DOCUMENT_TITLE_SELECTOR = '.update-components-document__title'
const IMAGE_SELECTOR = '.update-components-image__image, .update-components-image img, [data-testid="feed-images-content"] img, figure img'

export function readKind(card: HTMLElement): PostKind {
  return card.closest(COMMENT_SELECTOR) ? 'comment' : 'post'
}

export function readMedia(card: HTMLElement): { media: MediaKind, mediaLabel: string } {
  if (card.querySelector(VIDEO_SELECTOR)) return { media: 'video', mediaLabel: '' }
  const document = card.querySelector<HTMLElement>(DOCUMENT_SELECTOR)
  if (document) return { media: 'document', mediaLabel: readDocumentLabel(document) }
  const image = card.querySelector<HTMLImageElement>(IMAGE_SELECTOR)
  if (image) return { media: 'image', mediaLabel: clampLabel(image.alt) }
  return { media: 'none', mediaLabel: '' }
}

function readDocumentLabel(node: HTMLElement): string {
  const title = node.querySelector<HTMLElement>(DOCUMENT_TITLE_SELECTOR)?.textContent ?? ''
  return clampLabel(title.replace(/\s+/g, ' '))
}

function clampLabel(label: string): string {
  return label.trim().slice(0, MAX_MEDIA_LABEL_LENGTH)
}
