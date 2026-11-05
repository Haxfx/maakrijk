import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { type GameState, loadGame, sendCommand } from '~/game/client'
import { errorText } from '~/locales/nl'
import { ApiError } from '~/utils/api'
import type { AwayData, LemonadeCommand, LemonadeView, UpgradeId } from './types'

/** Taps are collected this long and sent as one command. */
const TAP_BATCH_MS = 350
/** The server takes at most this many taps per command. */
const MAX_TAPS = 100
/** While helpers work: read the stand this often (nothing is written)… */
const HELPER_POLL_MS = 3000
/** …and book their sales this often, so the away cap never hits a watching child. */
const COLLECT_MS = 60_000

/**
 * Coins after `taps` more taps, the way the server will count them: every cup
 * earns the cup price, every new jug costs its ingredients. Only for display
 * until the server answers.
 */
export function coinsAfterTaps(v: LemonadeView, coins: number, taps: number): number {
  const cups = taps * v.cupsPerTap
  const newJugs = cups > v.jugLeft ? Math.ceil((cups - v.jugLeft) / v.cupsPerJug) : 0
  return coins + cups * v.cupPrice - newJugs * v.jugCost
}

/**
 * Lemonade clicker state for one page. Taps count locally at once and go to
 * the server in batches; the server decides what they are worth. Commands run
 * one after another, never in parallel.
 */
export function useLemonade(gameId: string, onAnswer: (g: GameState<LemonadeView>) => void) {
  const game = shallowRef<GameState<LemonadeView> | null>(null)
  const loadError = ref<string | null>(null)
  const notice = ref<string | null>(null)
  /** Helper sales while the child was away, shown once on arrival. */
  const away = ref<AwayData | null>(null)
  const inFlight = ref(0)
  /** Taps not yet answered by the server (waiting or on their way). */
  const pendingTaps = ref(0)
  let sentTaps = 0
  let chain: Promise<unknown> = Promise.resolve()
  let batchTimer: ReturnType<typeof setTimeout> | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let lastCommandAt = Date.now()
  let first = true
  let stopped = false

  const view = computed(() => game.value?.view ?? null)
  const busy = computed(() => inFlight.value > 0)
  /** Coins on screen: the server's, plus taps it has not answered yet. */
  const coins = computed(() => {
    const g = game.value
    if (!g) return 0
    return coinsAfterTaps(g.view, g.coins, pendingTaps.value)
  })

  function accept(g: GameState<LemonadeView>) {
    // Ignore an older answer that arrives late.
    if (game.value && g.revision < game.value.revision) return
    if (first) {
      first = false
      const e = g.events.find((x) => x.type === 'AwayEarnings')
      if (e) away.value = e.data as AwayData
    }
    game.value = g
    onAnswer(g)
  }

  async function refresh() {
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

  function poll() {
    const v = view.value
    if (stopped || document.hidden || !v || v.helperMilliCupsPerSecond === 0 || busy.value) return
    if (Date.now() - lastCommandAt > COLLECT_MS) void enqueue(() => run({ type: 'collect' }, true))
    else void refresh()
  }

  function onVisible() {
    if (!document.hidden) void refresh()
    else flushTaps()
  }

  document.addEventListener('visibilitychange', onVisible)
  pollTimer = setInterval(poll, HELPER_POLL_MS)

  onBeforeUnmount(() => {
    stopped = true
    flushTaps()
    clearTimeout(noticeTimer)
    clearInterval(pollTimer)
    document.removeEventListener('visibilitychange', onVisible)
  })

  return { game, view, coins, loadError, busy, notice, away, pendingTaps, refresh, tap, buy }
}
