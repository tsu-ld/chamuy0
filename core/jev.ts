import type { JevAnswers, JevQuestions } from './rubric'

export const DEFAULT_MODEL = 'jev-1.13.0'

const BASE_URL = 'https://api.typesafe.ai/v1/systemone'

const MAX_RETRIES = 2
const BACKOFF_MS = 500
const JITTER_RATIO = 0.25
const TIMEOUT_MS = 10_000
const MS_PER_SECOND = 1000
const MAX_RETRY_AFTER_MS = 2000
const ERROR_EXCERPT_LENGTH = 200
const HTTP_REQUEST_TIMEOUT = 408
const HTTP_UNPROCESSABLE = 422
const HTTP_RATE_LIMIT = 429
const HTTP_SERVER_ERROR_FLOOR = 500
const NETWORK_FAILURE = 0

export interface JevOptions {
  apiKey: string
  model?: string
}

export interface JevResponse {
  answers: JevAnswers
  model?: string
}

class JevError extends Error {
  readonly status: number

  readonly retryAfterMs: number

  constructor(message: string, status: number, retryAfterMs = 0) {
    super(message)
    this.name = 'JevError'
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

export async function askJev(
  questions: JevQuestions,
  state: string,
  options: JevOptions,
): Promise<JevResponse> {
  const resolved = { apiKey: options.apiKey, model: options.model ?? DEFAULT_MODEL }

  async function attempt(retriesLeft: number): Promise<JevResponse> {
    try {
      return await postOnce(questions, state, resolved)
    } catch (error) {
      const failure = toJevError(error)
      if (retriesLeft === 0 || !isRetryable(failure.status)) throw failure
      await pause(failure.retryAfterMs, MAX_RETRIES - retriesLeft)
      return attempt(retriesLeft - 1)
    }
  }

  return attempt(MAX_RETRIES)
}

interface ResolvedOptions {
  apiKey: string
  model: string
}

async function postOnce(questions: JevQuestions, state: string, options: ResolvedOptions): Promise<JevResponse> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: options.model, questions, state }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw await responseFailure(response)
  const payload: unknown = await response.json()
  return readResponse(payload)
}

function readResponse(payload: unknown): JevResponse {
  if (typeof payload !== 'object' || payload === null) {
    throw new JevError('Jev returned a non-object payload', HTTP_UNPROCESSABLE)
  }
  const candidate = payload as Partial<JevResponse>
  if (typeof candidate.answers !== 'object' || candidate.answers === null) {
    throw new JevError('Jev payload is missing answers', HTTP_UNPROCESSABLE)
  }
  return {
    answers: candidate.answers,
    model: typeof candidate.model === 'string' ? candidate.model : undefined,
  }
}

async function responseFailure(response: Response): Promise<JevError> {
  const detail = await response.text()
  const excerpt = detail.slice(0, ERROR_EXCERPT_LENGTH)
  return new JevError(
    `Jev responded ${response.status}: ${excerpt}`,
    response.status,
    readRetryAfterMs(response),
  )
}

function readRetryAfterMs(response: Response): number {
  const milliseconds = response.headers.get('retry-after-ms')
  if (milliseconds) {
    const parsed = Number(milliseconds)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }
  const seconds = response.headers.get('retry-after')
  if (!seconds) return 0
  const parsed = Number(seconds)
  return Number.isFinite(parsed) && parsed > 0 ? parsed * MS_PER_SECOND : 0
}

async function pause(retryAfterMs: number, attemptNumber: number): Promise<void> {
  const backoff = BACKOFF_MS * 2 ** attemptNumber
  const jitter = BACKOFF_MS * JITTER_RATIO * Math.random()
  const waitMs = Math.max(Math.min(retryAfterMs, MAX_RETRY_AFTER_MS), backoff + jitter)
  await new Promise((resolve) => {
    setTimeout(resolve, waitMs)
  })
}

function isRetryable(status: number): boolean {
  if (status === NETWORK_FAILURE || status === HTTP_REQUEST_TIMEOUT || status === HTTP_RATE_LIMIT) {
    return true
  }
  return status >= HTTP_SERVER_ERROR_FLOOR
}

function toJevError(error: unknown): JevError {
  if (error instanceof JevError) return error
  const message = error instanceof Error ? error.message : 'Jev request failed'
  return new JevError(message, NETWORK_FAILURE)
}
