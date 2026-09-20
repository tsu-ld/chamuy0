import type { TrainingExample } from '../core/examples'
import type { JevOptions } from '../core/jev'
import type { Verdict } from '../core/rubric'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { buildState } from '../core/examples'
import { textKey } from '../core/hash'
import { askJev, DEFAULT_MODEL } from '../core/jev'
import { buildQuestions, toVerdict } from '../core/rubric'

interface FixturePost {
  id: string
  lang: string
  label: Verdict
  text: string
}

interface FixtureFile {
  note: string
  posts: FixturePost[]
}

interface Row {
  expected: Verdict
  got: Verdict
}

const FIXTURES_PATH = new URL('../fixtures/posts.json', import.meta.url)
const TRAINING_PATH = new URL('../training/examples.json', import.meta.url)
const ID_WIDTH = 24
const COLUMN_WIDTH = 10

async function main(): Promise<void> {
  const useCalibration = !process.argv.includes('--plain')
  const pool = useCalibration ? await readJson<TrainingExample[]>(TRAINING_PATH) : []
  const fixtures = await readJson<FixtureFile>(FIXTURES_PATH)
  const model = process.env.JEV_MODEL ?? DEFAULT_MODEL
  const rows = await classifyAll(fixtures.posts, pool, { apiKey: readApiKey(), model })
  printSummary(rows, pool.length)
}

async function classifyAll(posts: FixturePost[], pool: TrainingExample[], options: JevOptions): Promise<Row[]> {
  const poolKeys = new Set(pool.map(entry => textKey(entry.text)))
  const rows: Row[] = []
  for (const post of posts) {
    if (poolKeys.has(textKey(post.text))) {
      console.info(`${post.id.padEnd(ID_WIDTH)} in calibration pool, skipped`)
      continue
    }
    rows.push(await classifyOne(post, pool, options))
  }
  return rows
}

async function classifyOne(post: FixturePost, pool: TrainingExample[], options: JevOptions): Promise<Row> {
  const response = await askJev(buildQuestions(), buildState(post.text, pool), options)
  const verdict = toVerdict(response.answers)
  const active = verdict.signals.filter(signal => signal.on).map(signal => signal.key).join(',') || 'none'
  const line = `${post.id.padEnd(ID_WIDTH)} expected=${post.label.padEnd(COLUMN_WIDTH)} got=${verdict.verdict.padEnd(COLUMN_WIDTH)} score=${verdict.score.toFixed(1)} signals=${active}`
  console.info(line)
  if (process.argv.includes('--debug')) {
    const detail = verdict.signals.map(signal => `${signal.key}=${signal.probability.toFixed(2)}`).join(' ')
    console.info(`${''.padEnd(ID_WIDTH)} ${detail} choice=${String(response.answers.verdict_choice?.choice)}`)
  }
  return { expected: post.label, got: verdict.verdict }
}

function printSummary(rows: Row[], poolSize: number): void {
  const exact = rows.filter(row => row.expected === row.got).length
  const slopMatches = rows.filter(row => (row.got === 'slop') === (row.expected === 'slop')).length
  console.info(`\nAgreement: exact ${exact}/${rows.length}, slop-vs-rest ${slopMatches}/${rows.length} (calibration pool: ${poolSize})`)
}

function readApiKey(): string {
  const apiKey = process.env.TYPESAFE_API_KEY
  if (!apiKey) throw new Error('Set TYPESAFE_API_KEY in .env (see .env.example) before running eval')
  return apiKey
}

async function readJson<Shape>(path: URL): Promise<Shape> {
  return JSON.parse(await readFile(path, 'utf8')) as Shape
}

void main()
