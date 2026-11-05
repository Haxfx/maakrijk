/**
 * Talks to one game instance. The server decides everything; this only sends
 * commands and keeps the latest answer.
 *
 * Every command gets a fresh id once. When the network fails, the same command
 * is retried with the same id, so the server applies it at most once
 * (contract 0.2 §3). A refusal (422) is final and is not retried.
 */
import { ApiError, api } from '~/utils/api'

export interface GameEvent {
  type: string
  at: string
  data: unknown
}

export interface GameState<V> {
  id: string
  profileId: string
  scenarioId: string
  revision: number
  coins: number
  serverNow: string
  view: V
  events: GameEvent[]
}

export interface SendOptions {
  /** Waits between retries, in ms. The default gives about 7 s in total. */
  backoff?: number[]
  newId?: () => string
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Errors worth retrying with the same id: no answer, or a server hiccup. */
export function isRetryable(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 0 || e.status >= 500)
}

export function loadGame<V>(gameId: string): Promise<GameState<V>> {
  return api<GameState<V>>(`/games/${gameId}`)
}

export async function sendCommand<V>(gameId: string, command: object, opts: SendOptions = {}): Promise<GameState<V>> {
  const id = (opts.newId ?? (() => crypto.randomUUID()))()
  const backoff = opts.backoff ?? [300, 800, 1500, 2500, 2000]
  const sleep = opts.sleep ?? defaultSleep
  for (let attempt = 0; ; attempt++) {
    try {
      return await api<GameState<V>>(`/games/${gameId}/commands`, {
        method: 'POST',
        body: { commandId: id, command },
      })
    } catch (e) {
      const wait = backoff[attempt]
      if (!isRetryable(e) || wait === undefined) throw e
      await sleep(wait)
    }
  }
}

/** Difference between server time and this device, from a response. */
export function clockOffset(serverNow: string, receivedAt = Date.now()): number {
  return Date.parse(serverNow) - receivedAt
}
