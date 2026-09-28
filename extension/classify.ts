import type { PostContext } from '../core/post'
import type { ClassifyReply, FailureCode, SlopReply } from './protocol'
import { extensionApi } from './api'
import { isSlopReply } from './protocol'

const REPLY_TIMEOUT_MS = 35000

interface ReplyFailure extends Error {
  code: FailureCode
}

export async function requestVerdict(context: PostContext): Promise<SlopReply> {
  const request = extensionApi.runtime.sendMessage({ type: 'classify', context }) as Promise<ClassifyReply>
  const reply = await withTimeout(request, REPLY_TIMEOUT_MS)
  if (isSlopReply(reply)) return reply
  if (!reply.ok) {
    const failure = new Error(reply.error) as ReplyFailure
    failure.code = reply.code
    throw failure
  }
  throw new Error('Malformed classifier reply')
}

export function readFailureCode(error: unknown): FailureCode {
  const code = (error as ReplyFailure).code
  return code === 'no-access' || code === 'quota' ? code : 'request'
}

function withTimeout<Value>(promise: Promise<Value>, milliseconds: number): Promise<Value> {
  let timer = 0
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Classifier timed out')), milliseconds)
  })
  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timer)
  })
}
