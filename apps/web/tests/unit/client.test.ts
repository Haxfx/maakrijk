import { afterEach, describe, expect, it, vi } from 'vitest'
import { clockOffset, isRetryable, sendCommand } from '~/game/client'
import { ApiError } from '~/utils/api'

function reply(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

afterEach(() => vi.unstubAllGlobals())

describe('sendCommand', () => {
  it('retries a lost request with the same command id', async () => {
    const ids: string[] = []
    let calls = 0
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      ids.push(JSON.parse(init.body as string).commandId)
      calls++
      if (calls === 1) return Promise.reject(new TypeError('network'))
      if (calls === 2) return reply(503, { code: 'unavailable' })
      return reply(200, { revision: 3 })
    })
    const r = await sendCommand<unknown>('g1', { type: 'makeJug' }, { newId: () => 'fixed-id', sleep: async () => {} })
    expect(r.revision).toBe(3)
    expect(ids).toEqual(['fixed-id', 'fixed-id', 'fixed-id'])
  })

  it('does not retry a refusal', async () => {
    let calls = 0
    vi.stubGlobal('fetch', () => {
      calls++
      return reply(422, { code: 'not_enough_coins' })
    })
    await expect(sendCommand('g1', { type: 'makeJug' }, { sleep: async () => {} })).rejects.toMatchObject({ code: 'not_enough_coins' })
    expect(calls).toBe(1)
  })

  it('gives up after the last backoff', async () => {
    let calls = 0
    vi.stubGlobal('fetch', () => {
      calls++
      return Promise.reject(new TypeError('network'))
    })
    await expect(sendCommand('g1', {}, { backoff: [1, 1], sleep: async () => {} })).rejects.toMatchObject({ code: 'offline' })
    expect(calls).toBe(3)
  })
})

describe('helpers', () => {
  it('knows what to retry', () => {
    expect(isRetryable(new ApiError(0, 'offline'))).toBe(true)
    expect(isRetryable(new ApiError(500, 'internal'))).toBe(true)
    expect(isRetryable(new ApiError(422, 'no_cups'))).toBe(false)
    expect(isRetryable(new ApiError(409, 'command_conflict'))).toBe(false)
  })

  it('measures the server clock offset', () => {
    expect(clockOffset('2026-11-05T10:00:05.000Z', Date.parse('2026-11-05T10:00:00.000Z'))).toBe(5000)
  })
})
