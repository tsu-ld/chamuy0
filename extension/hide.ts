import type { HideSettings } from '../core/hide'
import type { SlopReply } from './protocol'
import { textKey } from '../core/hash'
import { shouldHide } from '../core/hide'

const CARD_CLASS = 'lnslop-host'
const CHIP_CLASS = 'lnslop-chip'
const HIDDEN_CLASS = 'lnslop-hidden'
const BANISH_CLASS = 'lnslop-banish'
const FALL_CLASS = 'lnslop-fall'
const SEVERE_CLASS = 'lnslop-severe'
const TOMB_CLASS = 'lnslop-tomb'
const TEXT_CLASS = 'lnslop-tomb-text'
const SHOW_CLASS = 'lnslop-show'
const LIVE_CLASS = 'lnslop-live'
const TOMB_SELECTOR = `.${TOMB_CLASS}`
const TOMB_HEIGHT = '2.75rem'
const SCORE_DECIMALS = 1
const SEVERE_SCORE = 9
const FINISH_MS = 460
const MAX_TRACKED_KEYS = 400

interface HidePlan {
  animated: boolean
  focus: boolean
}

export class HideDeck {
  private readonly hidden = new Set<string>()
  private readonly revealed = new Set<string>()
  private readonly timers = new Map<HTMLElement, number>()
  private readonly frames = new Map<HTMLElement, number>()
  private announcer: HTMLElement | null = null

  note(chip: HTMLButtonElement, reply: SlopReply, settings: HideSettings): void {
    const card = chip.closest<HTMLElement>(`.${CARD_CLASS}`)
    if (!card) return
    const key = textKey(chip.dataset.lnslopText ?? '')
    card.dataset.lnslopScore = String(reply.verdict.score)
    card.dataset.lnslopKey = key
    if (!shouldHide(reply.verdict.score, settings)) return
    this.apply(card, key, reply.verdict.score)
  }

  sync(root: ParentNode, settings: HideSettings): void {
    for (const card of root.querySelectorAll<HTMLElement>(`.${CARD_CLASS}[data-lnslop-key]`)) {
      this.reconcile(card, settings)
    }
  }

  private reconcile(card: HTMLElement, settings: HideSettings): void {
    const key = card.dataset.lnslopKey
    if (!key) return
    const score = Number(card.dataset.lnslopScore)
    if (Number.isFinite(score) && shouldHide(score, settings)) {
      this.apply(card, key, score)
      return
    }
    this.restore(card, key)
  }

  apply(card: HTMLElement, key: string, score: number): void {
    if (this.revealed.has(key)) return
    const tomb = card.querySelector<HTMLElement>(TOMB_SELECTOR)
    if (this.hidden.has(key) && tomb !== null) return
    const fresh = !this.hidden.has(key)
    remember(this.hidden, key)
    const bar = tomb ?? buildTomb(card.ownerDocument, score, () => this.reveal(card, key))
    if (tomb === null) card.append(bar)
    if (fresh && score >= SEVERE_SCORE) card.classList.add(SEVERE_CLASS)
    this.place(card, bar, fresh)
    if (fresh) this.announce(card, `Post hidden. Slop score ${score.toFixed(SCORE_DECIMALS)} of 10.`)
  }

  private reveal(card: HTMLElement, key: string): void {
    this.hidden.delete(key)
    remember(this.revealed, key)
    this.clear(card)
    card.querySelector(TOMB_SELECTOR)?.remove()
    card.querySelector<HTMLButtonElement>(`.${CHIP_CLASS}`)?.focus()
    this.announce(card, 'Post restored.')
  }

  private restore(card: HTMLElement, key: string): void {
    if (!this.hidden.has(key)) return
    this.hidden.delete(key)
    const focus = tombHasFocus(card)
    this.clear(card)
    card.querySelector(TOMB_SELECTOR)?.remove()
    if (focus) card.querySelector<HTMLButtonElement>(`.${CHIP_CLASS}`)?.focus()
  }

  private clear(card: HTMLElement): void {
    const frame = this.frames.get(card)
    if (frame !== undefined) cancelAnimationFrame(frame)
    this.frames.delete(card)
    const timer = this.timers.get(card)
    if (timer !== undefined) window.clearTimeout(timer)
    this.timers.delete(card)
    card.classList.remove(HIDDEN_CLASS, BANISH_CLASS, FALL_CLASS, SEVERE_CLASS)
    card.style.height = ''
  }

  private place(card: HTMLElement, bar: HTMLElement, fresh: boolean): void {
    const plan = planHide(card)
    if (fresh && plan.animated) {
      this.placeAnimated(card, bar, plan.focus)
      return
    }
    this.placeInstant(card, bar, plan.focus)
  }

  private placeInstant(card: HTMLElement, bar: HTMLElement, focus: boolean): void {
    card.classList.add(HIDDEN_CLASS)
    if (focus) focusShow(bar)
  }

  private placeAnimated(card: HTMLElement, bar: HTMLElement, focus: boolean): void {
    card.style.height = `${card.getBoundingClientRect().height}px`
    card.classList.add(BANISH_CLASS)
    this.frames.set(card, requestAnimationFrame(() => {
      this.frames.delete(card)
      card.classList.add(FALL_CLASS)
      card.style.height = TOMB_HEIGHT
      this.timers.set(card, window.setTimeout(() => this.finishCollapse(card, bar, focus), FINISH_MS))
    }))
  }

  private finishCollapse(card: HTMLElement, bar: HTMLElement, focus: boolean): void {
    this.timers.delete(card)
    card.classList.remove(BANISH_CLASS, FALL_CLASS, SEVERE_CLASS)
    card.style.height = ''
    if (!bar.isConnected) return
    card.classList.add(HIDDEN_CLASS)
    if (focus) focusShow(bar)
  }

  private announce(card: HTMLElement, message: string): void {
    if (!this.announcer) this.announcer = createAnnouncer(card.ownerDocument)
    const region = this.announcer
    region.textContent = ''
    requestAnimationFrame(() => {
      region.textContent = message
    })
  }
}

function planHide(card: HTMLElement): HidePlan {
  const rect = card.getBoundingClientRect()
  const focus = hasFocusWithin(card)
  if (prefersReducedMotion()) return { animated: false, focus }
  const viewport = card.ownerDocument.defaultView?.innerHeight ?? 0
  return { animated: rect.top < viewport && rect.bottom > 0, focus }
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function hasFocusWithin(card: HTMLElement): boolean {
  const active = card.ownerDocument.activeElement
  return active !== null && card.contains(active)
}

function tombHasFocus(card: HTMLElement): boolean {
  const tomb = card.querySelector(TOMB_SELECTOR)
  const active = card.ownerDocument.activeElement
  return tomb !== null && active !== null && tomb.contains(active)
}

function remember(set: Set<string>, key: string): void {
  set.add(key)
  if (set.size <= MAX_TRACKED_KEYS) return
  const oldest = set.keys().next().value
  if (oldest !== undefined) set.delete(oldest)
}

function focusShow(bar: HTMLElement): void {
  bar.querySelector<HTMLButtonElement>(`.${SHOW_CLASS}`)?.focus()
}

function buildTomb(doc: Document, score: number, onShow: () => void): HTMLElement {
  const bar = doc.createElement('div')
  bar.className = TOMB_CLASS
  bar.setAttribute('role', 'group')
  bar.setAttribute('aria-label', `Post hidden. Slop score ${score.toFixed(SCORE_DECIMALS)} of 10.`)
  const text = doc.createElement('span')
  text.className = TEXT_CLASS
  text.textContent = `Slop ${score.toFixed(SCORE_DECIMALS)} · hidden`
  const show = doc.createElement('button')
  show.type = 'button'
  show.className = SHOW_CLASS
  show.textContent = 'Show'
  show.addEventListener('click', onShow)
  bar.append(text, show)
  return bar
}

function createAnnouncer(doc: Document): HTMLElement {
  const region = doc.createElement('div')
  region.className = LIVE_CLASS
  region.setAttribute('aria-live', 'polite')
  doc.body.append(region)
  return region
}
