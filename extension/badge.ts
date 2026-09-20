import type { SlopVerdict, Verdict } from '../core/rubric'
import type { SlopReply } from './protocol'
import { VERDICTS } from '../core/rubric'

const STATE_CLASS: Record<Verdict, string> = {
  clean: 'lnslop-good',
  borderline: 'lnslop-meh',
  slop: 'lnslop-bad',
}

const SCORE_DECIMALS = 1

export function applyPending(chip: HTMLButtonElement): void {
  chip.className = 'lnslop-chip lnslop-pending'
  chip.replaceChildren(makeDot(), chipPart('lnslop-word', 'Slop'), chipPart('lnslop-num', '…'))
  chip.setAttribute('aria-label', 'Analyzing post for slop')
  chip.setAttribute('aria-expanded', 'false')
  chip.setAttribute('aria-busy', 'true')
}

export function applyFailure(chip: HTMLButtonElement): void {
  chip.className = 'lnslop-chip lnslop-error'
  chip.replaceChildren(makeDot(), chipPart('lnslop-word', 'Slop'), chipPart('lnslop-num', '?'))
  chip.setAttribute('aria-expanded', 'false')
  chip.removeAttribute('aria-busy')
  chip.setAttribute('aria-label', 'Could not classify. Press to retry.')
}

export function applyVerdict(chip: HTMLButtonElement, reply: SlopReply): void {
  const { verdict, score } = reply.verdict
  chip.className = `lnslop-chip ${STATE_CLASS[verdict]}`
  chip.replaceChildren(
    makeDot(),
    chipPart('lnslop-word', 'Slop'),
    chipPart('lnslop-num', score.toFixed(SCORE_DECIMALS)),
  )
  chip.removeAttribute('aria-busy')
  chip.setAttribute('aria-label', `Slop ${score.toFixed(SCORE_DECIMALS)} of 10, ${verdict}. View detail.`)
}

function makeDot(): HTMLSpanElement {
  const dot = document.createElement('span')
  dot.className = 'lnslop-dot'
  dot.setAttribute('aria-hidden', 'true')
  return dot
}

function chipPart(className: string, text: string): HTMLSpanElement {
  const node = document.createElement('span')
  node.className = className
  node.textContent = text
  return node
}

export function buildPopover(reply: SlopReply, onLabel: (label: Verdict) => void): HTMLElement {
  const popover = document.createElement('div')
  popover.className = 'lnslop-popover'
  popover.setAttribute('role', 'dialog')
  popover.setAttribute('aria-label', 'Slop analysis')
  popover.append(
    buildHeader(reply.verdict),
    buildReason(reply.verdict),
    buildTrainRow(onLabel),
    buildMeta(reply),
  )
  return popover
}

function buildHeader(slop: SlopVerdict): HTMLElement {
  const header = document.createElement('header')
  header.className = 'lnslop-head'
  const verdict = document.createElement('strong')
  verdict.className = `lnslop-verdict ${STATE_CLASS[slop.verdict]}`
  verdict.append(makeDot(), document.createTextNode(`Slop ${slop.score.toFixed(SCORE_DECIMALS)}/10`))
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'lnslop-close'
  close.setAttribute('aria-label', 'Close')
  close.textContent = '×'
  header.append(verdict, close)
  return header
}

function buildReason(slop: SlopVerdict): HTMLElement {
  const reason = document.createElement('p')
  reason.className = 'lnslop-reason'
  const fired = slop.signals.filter((signal) => signal.on).map((signal) => signal.label)
  reason.textContent = fired.length > 0 ? `Reads like: ${fired.join(', ')}.` : 'No bait signals fired.'
  return reason
}

function buildMeta(reply: SlopReply): HTMLElement {
  const meta = document.createElement('p')
  meta.className = 'lnslop-meta'
  meta.textContent = `${reply.model} · ${reply.trainedOn} examples`
  return meta
}

function buildTrainRow(onLabel: (label: Verdict) => void): HTMLElement {
  const row = document.createElement('div')
  row.className = 'lnslop-train'
  const question = document.createElement('span')
  question.className = 'lnslop-train-label'
  question.textContent = 'Was this right?'
  row.append(question)
  for (const verdict of VERDICTS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `lnslop-vote lnslop-vote-${verdict}`
    button.textContent = verdict
    button.addEventListener('click', () => onLabel(verdict))
    row.append(button)
  }
  return row
}
