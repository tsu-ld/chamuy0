import type { PostContext } from '../core/post'
import { MAX_TEXT_LENGTH } from '../core/post'
import { readKind, readMedia } from './media'

const LEGACY_TEXT_SELECTORS = [
  '.update-components-text',
  '.feed-shared-update-v2__commentary',
  '.feed-shared-text',
]
const MIN_POST_LENGTH = 40
const MIN_CAPTION_LENGTH = 10

export function extractPost(card: HTMLElement, anchor: HTMLElement | null): PostContext | null {
  const { media, mediaLabel } = readMedia(card)
  const minimum = media === 'none' ? MIN_POST_LENGTH : MIN_CAPTION_LENGTH
  for (const candidate of textCandidates(card, anchor)) {
    const text = normalize(candidate).slice(0, MAX_TEXT_LENGTH)
    if (text.length >= minimum) return { kind: readKind(card), media, mediaLabel, text }
  }
  return null
}

function textCandidates(card: HTMLElement, anchor: HTMLElement | null): string[] {
  const candidates: string[] = anchor ? [readAnchor(anchor)] : []
  for (const selector of LEGACY_TEXT_SELECTORS) {
    const node = card.querySelector<HTMLElement>(selector)
    if (node) candidates.push(node.textContent ?? '')
  }
  return candidates
}

function readAnchor(anchor: HTMLElement): string {
  const clone = anchor.cloneNode(true) as HTMLElement
  for (const button of clone.querySelectorAll('button')) button.remove()
  return clone.textContent ?? ''
}

function normalize(raw: string): string {
  return raw.replaceAll(/[\u200B\u200C\u200D]/g, '').replace(/\s+/g, ' ').trim()
}
