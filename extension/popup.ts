import type { TrainingExample } from '../core/examples'
import type { HideSettings } from '../core/hide'
import { parseHide } from '../core/hide'
import { readApiKey, readHide, readTraining, writeApiKey, writeHide } from './storage'

const EXCERPT_LIMIT = 140
const SHOWN_LIMIT = 4
const SCORE_DECIMALS = 1

const keyInput = mustFind<HTMLInputElement>('#api-key')
const keyForm = mustFind<HTMLFormElement>('#key-form')
const keyStatus = mustFind<HTMLElement>('#key-status')
const trainingCount = mustFind<HTMLElement>('#training-count')
const trainingList = mustFind<HTMLUListElement>('#training-list')
const hideEnabled = mustFind<HTMLInputElement>('#hide-enabled')
const hideThreshold = mustFind<HTMLInputElement>('#hide-threshold')
const hideValue = mustFind<HTMLOutputElement>('#hide-value')
const hideStatus = mustFind<HTMLElement>('#hide-status')

async function start(): Promise<void> {
  keyInput.value = await readApiKey()
  renderHide(await readHide())
  await renderTraining()
  keyForm.addEventListener('submit', (event) => {
    event.preventDefault()
    void saveKey()
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
