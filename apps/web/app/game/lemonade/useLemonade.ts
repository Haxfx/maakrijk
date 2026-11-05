import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { type GameState, clockOffset, loadGame, sendCommand } from '~/game/client'
import { errorText } from '~/locales/nl'
import { ApiError } from '~/utils/api'
import type { AwayData, LemonadeCommand, LemonadeView, UpgradeId } from './types'

/** Taps are collected this long and sent as one command. */
const TAP_BATCH_MS = 350
/** The server takes at most this many taps per command. */
const MAX_TAPS = 100
/** Read the stand this often to stay in step with the server (nothing is written)… */
const POLL_MS = 10_000
/** …and book what it sold by itself this often, so the away cap never hits a watching child. */
const COLLECT_MS = 60_000
/** The screen updates this often. */
const TICK_MS = 100

/** New jugs (each paid for its ingredients) needed to sell `cups` more cups. */
export function jugsFor(v: Pick<LemonadeView, 'cupsPerJug'>, jugLeft: number, cups: number): number {
  return cups > jugLeft ? Math.ceil((cups - jugLeft) / v.cupsPerJug) : 0
}

export interface Live {
  coins: number
  jugLeft: number
  cupsSold: number
  materials: number
  /** 0..1: how far the next cup sold by itself is. */
  progress: number
}

/**
 * What the stand looks like at `nowMs` (server time), the way the server will
 * count it: first selling by itself since `settledTo` (capped), then the taps
 * it has not answered yet. Same arithmetic as rules.rs `settle` and `sell`,
 * so the coins rise smoothly and do not jump when the server answers.
 */
export function project(v: LemonadeView, coins: number, nowMs: number, taps: number): Live {
  let jugLeft = v.jugLeft
  let cupsSold = v.stats.cupsSold
  let materials = v.stats.materials
  let progress = 0
  const sell = (cups: number) => {
    const jugs = jugsFor(v, jugLeft, cups)
    coins += cups * v.cupPrice - jugs * v.jugCost
    materials += jugs * v.jugCost
    jugLeft += jugs * v.cupsPerJug - cups
    cupsSold += cups
  }
  if (v.settledTo && v.autoMilliCupsPerSecond > 0) {
    const worked = Math.min(Math.max(0, nowMs - Date.parse(v.settledTo)), v.awayCapMs)
    const milli = v.carryMilli + Math.floor((worked * v.autoMilliCupsPerSecond) / 1000)
    sell(Math.floor(milli / 1000))
    progress = (milli % 1000) / 1000
  }
  sell(taps * v.cupsPerTap)
  return { coins, jugLeft, cupsSold, materials, progress }
}

/**
 * Lemonade state for one page. The stand sells by itself; the screen shows
 * that live from the last server answer. Taps count at once and go to the
 * server in batches. Commands run one after another, never in parallel.
 */
export function useLemonade(gameId: string, onAnswer: (g: GameState<LemonadeView>) => void) {
  const game = shallowRef<GameState<LemonadeView> | null>(null)
  const loadError = ref<string | null>(null)
  const notice = ref<string | null>(null)
  /** Sales while the child was away, shown once on arrival. */
  const away = ref<AwayData | null>(null)
  const inFlight = ref(0)
  /** Taps not yet answered by the server (waiting or on their way). */
  const pendingTaps = ref(0)
  /** Server time estimate, ticking. */
  const now = ref(Date.now())
  let offset = 0
  let sentTaps = 0
  let chain: Promise<unknown> = Promise.resolve()
  let batchTimer: ReturnType<typeof setTimeout> | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  let lastCommandAt = Date.now()
  let lastReadAt = Date.now()
  let first = true
  let stopped = false

  const view = computed(() => game.value?.view ?? null)
  const busy = computed(() => inFlight.value > 0)
  const live = computed<Live | null>(() => {
    const g = game.value
    return g ? project(g.view, g.coins, now.value, pendingTaps.value) : null
  })

  function accept(g: GameState<LemonadeView>) {
    // Ignore an older answer that arrives late.
    if (game.value && g.revision < game.value.revision) return
    offset = clockOffset(g.serverNow)
    now.value = Date.now() + offset
    if (first) {
      first = false
      const e = g.events.find((x) => x.type === 'AwayEarnings')
      if (e) away.value = e.data as AwayData
      // A new stand starts its clock with its first command.
      if (!g.view.settledTo) void enqueue(() => run({ type: 'collect' }, true))
    }
    game.value = g
    onAnswer(g)
  }

  async function refresh() {
    lastReadAt = Date.now()
    try {
      accept(await loadGame<LemonadeView>(gameId))
      loadError.value = null
    } catch (e) {
      loadError.value = e instanceof ApiError ? e.code : 'unknown'
    }
  }

  function say(code: string) {
    notice.value = errorText(code)
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => (notice.value = null), 4000)
  }

  /** Run commands one at a time, in order. */
  function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const next = chain.then(job, job)
    chain = next.catch(() => undefined)
    return next
  }

  async function run(cmd: LemonadeCommand, quiet = false): Promise<boolean> {
    inFlight.value++
    lastCommandAt = Date.now()
    try {
      accept(await sendCommand<LemonadeView>(gameId, cmd))
      return true
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'unknown'
      if (!quiet) say(code)
      await refresh()
      return false
    } finally {
      inFlight.value--
    }
  }

  function flushTaps() {
    clearTimeout(batchTimer)
    batchTimer = undefined
    const count = Math.min(MAX_TAPS, pendingTaps.value - sentTaps)
    if (count <= 0) return
    sentTaps += count
    void enqueue(async () => {
      // A fast child never sees an error for tapping too fast.
      await run({ type: 'tap', count }, true)
      sentTaps -= count
      pendingTaps.value -= count
    })
    if (pendingTaps.value - sentTaps > 0) flushTaps()
  }

  /** One tap on the press. Counted at once; sent with the next batch. */
  function tap() {
    if (!game.value) return
    pendingTaps.value++
    batchTimer ??= setTimeout(flushTaps, TAP_BATCH_MS)
  }

  /** Buy the next level of an upgrade. Waiting taps go first. */
  function buy(upgrade: UpgradeId): Promise<boolean> {
    flushTaps()
    return enqueue(() => run({ type: 'buyUpgrade', upgrade }))
  }

  function tick() {
    now.value = Date.now() + offset
    if (stopped || document.hidden || !game.value || busy.value) return
    if (Date.now() - lastCommandAt > COLLECT_MS) void enqueue(() => run({ type: 'collect' }, true))
    else if (Date.now() - lastReadAt > POLL_MS) void refresh()
  }

  function onVisible() {
    if (!document.hidden) void refresh()
    else flushTaps()
  }

  document.addEventListener('visibilitychange', onVisible)
  const tickTimer = setInterval(tick, TICK_MS)

  onBeforeUnmount(() => {
    stopped = true
    flushTaps()
    clearTimeout(noticeTimer)
    clearInterval(tickTimer)
    document.removeEventListener('visibilitychange', onVisible)
  })

  return { game, view, live, loadError, busy, notice, away, refresh, tap, buy }
}
