import type { Verdict } from '../core/rubric'
import type { SlopReply } from './protocol'
import { textKey } from '../core/hash'
import { parseHide } from '../core/hide'
import { extensionApi } from './api'
import { applyFailure, applyPending, applyVerdict, buildPopover } from './badge'
import { readFailureCode, requestVerdict } from './classify'
import { HideDeck } from './hide'
import { applyPalette, readHostPalette } from './palette'
import { onHideChange, readHide } from './storage'

const TEXT_ANCHOR_SELECTOR = '[data-testid="expandable-text-box"]'
const LEGACY_CARD_SELECTOR = '[data-urn^="urn:li:activity"], [data-id^="urn:li:activity"]'
const LEGACY_TEXT_SELECTORS = [
  '.update-components-text',
  '.feed-shared-update-v2__commentary',
  '.feed-shared-text',
]
const SOCIAL_BAR_SELECTOR = 'svg#comment-small, svg#repost-small, svg#thumbs-up-outline-small, [aria-label^="Reaction button state"]'
const COMMENT_ICON = 'svg#comment-small'
const REPOST_ICON = 'svg#repost-small'
const CHIP_CLASS = 'lnslop-chip'
const HOST_CLASS = 'lnslop-host'
const CARD_MARKER = 'lnslopCard'
const MIN_POST_LENGTH = 40
const SCAN_DEBOUNCE_MS = 400
const MAX_CONCURRENT = 2
const MAX_CACHED_VERDICTS = 200
const MAX_CARD_WALK = 20

interface Task {
  chip: HTMLButtonElement
  text: string
}

const verdicts = new Map<string, SlopReply>()
const deck = new HideDeck()
const queue: Task[] = []
let inFlight = 0
let openPopover: HTMLElement | null = null
let openChip: HTMLButtonElement | null = null
let scanTimer: number | undefined
let lastCardCount = -1
let hideSettings = parseHide(null)

async function start(): Promise<void> {
  console.info('[lnslop] watching the feed')
  hideSettings = await readHide()
  onHideChange((next) => {
    hideSettings = next
    deck.sync(document, next)
  })
  const observer = new MutationObserver(scheduleScan)
  observer.observe(document.body, { childList: true, subtree: true })
  scan()
}

function scheduleScan(): void {
  clearTimeout(scanTimer)
  scanTimer = window.setTimeout(scan, SCAN_DEBOUNCE_MS)
}

function scan(): void {
  const cards = collectCards()
  if (cards.length !== lastCardCount) {
    console.info(`[lnslop] ${cards.length} posts found`)
    lastCardCount = cards.length
  }
  for (const card of cards) {
    if (card.dataset[CARD_MARKER] && card.querySelector(`.${CHIP_CLASS}`)) continue
    attach(card)
  }
}

function collectCards(): HTMLElement[] {
  const cards: HTMLElement[] = []
  const seen = new Set<HTMLElement>()
  const push = (card: HTMLElement | null): void => {
    if (!card || seen.has(card)) return
    seen.add(card)
    cards.push(card)
  }
  for (const anchor of document.querySelectorAll<HTMLElement>(TEXT_ANCHOR_SELECTOR)) {
    push(closestPostCard(anchor))
  }
  for (const legacy of document.querySelectorAll<HTMLElement>(LEGACY_CARD_SELECTOR)) {
    push(legacy)
  }
  return cards.filter(card => !hasCardAncestor(card, seen))
}

function closestPostCard(anchor: HTMLElement): HTMLElement | null {
  let node = anchor.parentElement
  for (let depth = 0; node && depth < MAX_CARD_WALK; depth += 1) {
    if (node.querySelector(SOCIAL_BAR_SELECTOR)) return realBox(node)
    node = node.parentElement
  }
  return null
}

function realBox(node: HTMLElement): HTMLElement {
  let current = node
  while (current.parentElement && getComputedStyle(current).display === 'contents') {
    current = current.parentElement
  }
  return current
}

function hasCardAncestor(card: HTMLElement, cards: Set<HTMLElement>): boolean {
  let node = card.parentElement
  while (node) {
    if (cards.has(node)) return true
    node = node.parentElement
  }
  return false
}

function attach(card: HTMLElement): void {
  const text = extractText(card, findCommentaryAnchor(card))
  if (!text) return
  card.dataset[CARD_MARKER] = '1'
  const chip = createChip(card)
  chip.dataset.lnslopText = text
  const cached = verdicts.get(textKey(text))
  if (cached) {
    applyVerdict(chip, cached)
    deck.note(chip, cached, hideSettings)
    return
  }
  queue.push({ chip, text })
  pump()
}

function extractText(card: HTMLElement, anchor: HTMLElement | null): string | null {
  const anchored = anchor ? normalize(readAnchor(anchor)) : ''
  if (anchored.length >= MIN_POST_LENGTH) return anchored
  for (const selector of LEGACY_TEXT_SELECTORS) {
    const node = card.querySelector<HTMLElement>(selector)
    const text = normalize(node?.textContent ?? '')
    if (text.length >= MIN_POST_LENGTH) return text
  }
  return null
}

function findCommentaryAnchor(card: HTMLElement): HTMLElement | null {
  const bar = card.querySelector(SOCIAL_BAR_SELECTOR)
  for (const anchor of card.querySelectorAll<HTMLElement>(TEXT_ANCHOR_SELECTOR)) {
    if (!bar) return anchor
    if (anchor.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING) return anchor
  }
  return null
}

function readAnchor(anchor: HTMLElement): string {
  const clone = anchor.cloneNode(true) as HTMLElement
  for (const button of clone.querySelectorAll('button')) button.remove()
  return clone.textContent ?? ''
}

function normalize(raw: string): string {
  return raw.replaceAll(/[\u200B\u200C\u200D]/g, '').replace(/\s+/g, ' ').trim()
}

function createChip(card: HTMLElement): HTMLButtonElement {
  const chip = document.createElement('button')
  chip.type = 'button'
  applyPending(chip)
  applyPalette(chip, readHostPalette(findCommentaryAnchor(card) ?? card))
  chip.addEventListener('click', () => handleChipClick(chip))
  card.classList.add(HOST_CLASS)
  const bar = findActionBar(card)
  if (bar) {
    bar.append(chip)
  } else {
    chip.dataset.lnslopFloating = 'true'
    card.append(chip)
  }
  return chip
}

function findActionBar(card: HTMLElement): HTMLElement | null {
  let node = card.querySelector<HTMLElement>(COMMENT_ICON)?.parentElement ?? null
  while (node && node !== card) {
    if (node.querySelector(REPOST_ICON)) return node
    node = node.parentElement
  }
  return null
}

function handleChipClick(chip: HTMLButtonElement): void {
  if (chip.dataset.lnslopCode === 'no-key') {
    const text = chip.dataset.lnslopText ?? ''
    delete chip.dataset.lnslopCode
    applyPending(chip)
    queue.push({ chip, text })
    pump()
    void extensionApi.runtime.sendMessage({ type: 'openOptions' })
    return
  }
  if (chip.classList.contains('lnslop-error')) {
    applyPending(chip)
    const text = chip.dataset.lnslopText ?? ''
    queue.push({ chip, text })
    pump()
    return
  }
  togglePopover(chip)
}

function togglePopover(chip: HTMLButtonElement): void {
  if (openChip === chip) {
    closePopover(true)
    return
  }
  closePopover(false)
  const text = chip.dataset.lnslopText ?? ''
  const reply = verdicts.get(textKey(text))
  if (!reply) return
  const host = chip.closest<HTMLElement>(`.${HOST_CLASS}`)
  if (!host) return
  const popover = buildCardPopover(chip, text, reply)
  host.append(popover)
  chip.setAttribute('aria-expanded', 'true')
  openPopover = popover
  openChip = chip
  popover.querySelector<HTMLButtonElement>('.lnslop-close')?.focus()
}

function buildCardPopover(chip: HTMLButtonElement, text: string, reply: SlopReply): HTMLElement {
  const popover = buildPopover(reply, (label) => {
    void saveLabel(chip, text, label)
  })
  const host = chip.closest<HTMLElement>(`.${HOST_CLASS}`)
  if (host) applyPalette(popover, readHostPalette(findCommentaryAnchor(host) ?? host))
  popover.querySelector('.lnslop-close')?.addEventListener('click', () => closePopover(true))
  return popover
}

function closePopover(refocus: boolean): void {
  if (openPopover) openPopover.remove()
  if (openChip) openChip.setAttribute('aria-expanded', 'false')
  if (refocus && openChip) openChip.focus()
  openPopover = null
  openChip = null
}

async function saveLabel(chip: HTMLButtonElement, text: string, label: Verdict): Promise<void> {
  try {
    await extensionApi.runtime.sendMessage({ type: 'label', text, label })
    verdicts.delete(textKey(text))
    applyPending(chip)
    closePopover(false)
    queue.push({ chip, text })
    pump()
  } catch {
    closePopover(false)
    chip.dataset.lnslopCode = 'request'
    applyFailure(chip)
  }
}

function pump(): void {
  while (inFlight < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift()
    if (!task) return
    inFlight += 1
    void run(task)
  }
}

async function run(task: Task): Promise<void> {
  try {
    const reply = await requestVerdict(task.text)
    rememberVerdict(textKey(task.text), reply)
    delete task.chip.dataset.lnslopCode
    applyVerdict(task.chip, reply)
    deck.note(task.chip, reply, hideSettings)
  } catch (error) {
    task.chip.dataset.lnslopCode = readFailureCode(error)
    applyFailure(task.chip)
  } finally {
    inFlight -= 1
    pump()
  }
}

function rememberVerdict(key: string, reply: SlopReply): void {
  verdicts.set(key, reply)
  if (verdicts.size <= MAX_CACHED_VERDICTS) return
  const oldest = verdicts.keys().next().value
  if (oldest !== undefined) verdicts.delete(oldest)
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closePopover(true)
})

document.addEventListener('click', (event) => {
  if (!openPopover || !openChip) return
  const target = event.target as Node
  if (openPopover.contains(target) || openChip.contains(target)) return
  closePopover(false)
})

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void start())
else void start()
