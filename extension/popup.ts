import type { TrainingExample } from '../core/examples'
import type { HideSettings } from '../core/hide'
import type { PublicPlan } from './entitlement'
import type { AccessReply, AccessState, CancelReply, SubscribeReply } from './protocol'
import { parseHide } from '../core/hide'
import { extensionApi } from './api'
import { isPlanActive } from './entitlement'
import { readApiKey, readHide, readSkipMedia, readTraining, writeApiKey, writeHide, writeSkipMedia } from './storage'

const EXCERPT_LIMIT = 140
const SHOWN_LIMIT = 4
const SCORE_DECIMALS = 1
const MS_PER_HOUR = 1000 * 60 * 60
const POLL_MS = 2 * 1000
const POLL_ATTEMPTS = 60
const CONFIRM_MS = 7 * 1000
const CANCEL_LABEL = 'Cancel subscription'
const CONFIRM_LABEL = 'Confirm cancellation'
let cancelArmed = false

const keyInput = mustFind<HTMLInputElement>('#api-key')
const keyForm = mustFind<HTMLFormElement>('#key-form')
const keyStatus = mustFind<HTMLElement>('#key-status')
const trainingCount = mustFind<HTMLElement>('#training-count')
const trainingList = mustFind<HTMLUListElement>('#training-list')
const hideEnabled = mustFind<HTMLInputElement>('#hide-enabled')
const hideThreshold = mustFind<HTMLInputElement>('#hide-threshold')
const hideValue = mustFind<HTMLOutputElement>('#hide-value')
const hideStatus = mustFind<HTMLElement>('#hide-status')
const skipMedia = mustFind<HTMLInputElement>('#skip-media')
const planStatus = mustFind<HTMLElement>('#plan-status')
const planDetail = mustFind<HTMLElement>('#plan-detail')
const planSubscribe = mustFind<HTMLButtonElement>('#plan-subscribe')
const planSubscribeYear = mustFind<HTMLButtonElement>('#plan-subscribe-year')
const planManage = mustFind<HTMLButtonElement>('#plan-manage')
const planNote = mustFind<HTMLElement>('#plan-note')
const planError = mustFind<HTMLElement>('#plan-error')

async function start(): Promise<void> {
  keyInput.value = await readApiKey()
  renderHide(await readHide())
  skipMedia.checked = await readSkipMedia()
  await renderTraining()
  await renderPlan()
  keyForm.addEventListener('submit', (event) => {
    event.preventDefault()
    void saveKey()
  })
  planSubscribe.addEventListener('click', () => {
    void startCheckout('monthly')
  })
  planSubscribeYear.addEventListener('click', () => {
    void startCheckout('yearly')
  })
  planManage.addEventListener('click', () => {
    void cancelSubscription()
  })
  skipMedia.addEventListener('change', () => {
    void writeSkipMedia(skipMedia.checked)
  })
  hideEnabled.addEventListener('change', () => {
    void saveHide()
  })
  hideThreshold.addEventListener('input', () => {
    renderHide(readHideForm())
  })
  hideThreshold.addEventListener('change', () => {
    void saveHide()
  })
}

async function renderPlan(reportError = true): Promise<boolean> {
  const reply = await readPlanReply()
  if (!reply.ok) {
    if (reportError) showPlanError(reply.error)
    return false
  }
  applyPlan(reply.state)
  return isPlanActive(reply.state, Date.now())
}

async function readPlanReply(): Promise<AccessReply> {
  try {
    return await extensionApi.runtime.sendMessage({ type: 'access' }) as AccessReply
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

function applyPlan(state: AccessState): void {
  const usingPlan = state.source === 'plan'
  const canSubscribe = state.source !== 'key' && (state.plan !== 'sub' || !state.renews)
  const monthly = state.plans.find(plan => plan.period === 'month')
  const yearly = state.plans.find(plan => plan.period === 'year')
  planStatus.textContent = statusText(state)
  planDetail.textContent = detailText(state)
  planSubscribe.hidden = !canSubscribe || !monthly
  planSubscribeYear.hidden = !canSubscribe || !yearly
  if (monthly) planSubscribe.textContent = `Subscribe ${planLabel(monthly)}`
  if (yearly) planSubscribeYear.textContent = `or ${planLabel(yearly)}`
  planManage.hidden = !(usingPlan && state.plan === 'sub' && state.renews)
  planNote.hidden = state.source !== 'none'
  planError.hidden = true
}

function planLabel(plan: PublicPlan): string {
  return `$${plan.usd}/${plan.period}`
}

function statusText(state: AccessState): string {
  if (state.source === 'key') return 'Using your own key'
  if (state.plan === 'sub' && !state.renews) return 'Cancelled'
  if (state.plan === 'sub') return 'Subscribed'
  if (state.plan === 'trial') return 'Free trial'
  return 'No plan'
}

function detailText(state: AccessState): string {
  if (state.source === 'key') return 'Free forever. No plan needed.'
  if (state.plan === 'sub' && !state.renews) return `Access until ${formatDate(state.until)}.`
  if (state.plan === 'sub') return `Renews ${formatDate(state.until)}.`
  if (state.plan === 'trial') return `${hoursLeft(state.until)} left. Using our key, nothing to set up.`
  return 'Your trial ended.'
}

function hoursLeft(until: number): string {
  const hours = Math.max(1, Math.ceil((until - Date.now()) / MS_PER_HOUR))
  return hours === 1 ? '1 hour' : `${hours} hours`
}

function formatDate(until: number): string {
  return new Date(until).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

async function startCheckout(plan: string): Promise<void> {
  const reply = await extensionApi.runtime.sendMessage({ type: 'subscribe', plan }) as SubscribeReply
  if (!reply.ok) {
    showPlanError(reply.error)
    return
  }
  await extensionApi.tabs.create({ url: reply.url })
  pollPlan()
}

async function cancelSubscription(): Promise<void> {
  if (!cancelArmed) {
    cancelArmed = true
    planManage.textContent = CONFIRM_LABEL
    window.setTimeout(() => {
      cancelArmed = false
      planManage.textContent = CANCEL_LABEL
    }, CONFIRM_MS)
    return
  }
  cancelArmed = false
  planManage.textContent = CANCEL_LABEL
  const reply = await extensionApi.runtime.sendMessage({ type: 'cancel' }) as CancelReply
  if (!reply.ok) {
    showPlanError(reply.error)
    return
  }
  await renderPlan()
}

function pollPlan(): void {
  let attempts = 0
  const timer = window.setInterval(() => {
    attempts += 1
    void renderPlan(false).then((active) => {
      if (active || attempts >= POLL_ATTEMPTS) window.clearInterval(timer)
    })
  }, POLL_MS)
}

function showPlanError(message: string): void {
  planError.textContent = message
  planError.hidden = false
}

async function saveKey(): Promise<void> {
  const apiKey = keyInput.value.trim()
  if (!apiKey) {
    keyStatus.textContent = 'Enter a key first.'
    return
  }
  await writeApiKey(apiKey)
  keyStatus.textContent = 'Saved. Open or reload linkedin.com to classify with it.'
}

function readHideForm(): HideSettings {
  return { enabled: hideEnabled.checked, threshold: Number(hideThreshold.value) }
}

function renderHide(settings: HideSettings): void {
  hideEnabled.checked = settings.enabled
  hideThreshold.value = String(settings.threshold)
  hideValue.value = settings.threshold.toFixed(SCORE_DECIMALS)
  hideStatus.textContent = settings.enabled
    ? `Reads like: at or above ${settings.threshold.toFixed(SCORE_DECIMALS)}, the post collapses to a marker. Show brings it back.`
    : 'Reads like: off. Every post stays in the feed.'
}

async function saveHide(): Promise<void> {
  const settings = readHideForm()
  await writeHide(settings)
  renderHide(parseHide(settings))
}

async function renderTraining(): Promise<void> {
  const pool = await readTraining()
  trainingCount.textContent = pool.length === 0
    ? 'No examples yet.'
    : `${pool.length} examples stored, newest first.`
  const shown = pool.slice(-SHOWN_LIMIT).reverse()
  trainingList.replaceChildren(...shown.map(buildExampleRow))
}

function buildExampleRow(example: TrainingExample): HTMLLIElement {
  const row = document.createElement('li')
  row.className = 'lnslop-example'
  const tag = document.createElement('span')
  tag.className = `lnslop-tag lnslop-tag-${example.label}`
  tag.textContent = example.label
  const text = document.createElement('span')
  text.className = 'lnslop-example-text'
  text.textContent = excerpt(example.text)
  row.append(tag, text)
  return row
}

function excerpt(text: string): string {
  if (text.length <= EXCERPT_LIMIT) return text
  return `${text.slice(0, EXCERPT_LIMIT)}...`
}

function mustFind<ElementType extends Element>(selector: string): ElementType {
  const node = document.querySelector<ElementType>(selector)
  if (!node) throw new Error(`Missing element ${selector}`)
  return node
}

void start()
