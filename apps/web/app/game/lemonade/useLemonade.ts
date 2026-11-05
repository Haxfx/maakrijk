import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { type GameState, clockOffset, loadGame, sendCommand } from '~/game/client'
import { errorText } from '~/locales/nl'
import { ApiError } from '~/utils/api'
import type { LemonadeCommand, LemonadeView } from './types'

/**
 * Lemonade game state for one page. Holds the latest server answer, sends
 * commands, and asks the server again when something is due (jug ready,
 * next customer), so the screen follows server time without guessing.
 */
export function useLemonade(gameId: string, onAnswer: (g: GameState<LemonadeView>) => void) {
  const game = shallowRef<GameState<LemonadeView> | null>(null)
  const loadError = ref<string | null>(null)
  const busy = ref(false)
  const notice = ref<string | null>(null)
  /** Server time estimate, ticking for progress bars. */
  const now = ref(Date.now())
  let offset = 0
  let dueTimer: ReturnType<typeof setTimeout> | undefined
  let tickTimer: ReturnType<typeof setInterval> | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  let stopped = false

  const view = computed(() => game.value?.view ?? null)

  function accept(g: GameState<LemonadeView>) {
    // Ignore an older answer that arrives late.
    if (game.value && g.revision < game.value.revision) return
    offset = clockOffset(g.serverNow)
    game.value = g
    onAnswer(g)
    scheduleDue(g.view)
  }

  function serverNow() {
    return Date.now() + offset
  }

  /** Ask the server again just after the next moment something changes. */
  function scheduleDue(v: LemonadeView) {
    clearTimeout(dueTimer)
    const moments: number[] = []
    if (v.jug.making) moments.push(Date.parse(v.jug.making.doneAt))
    for (const c of v.round?.customers ?? []) if (c.state === 'coming') moments.push(Date.parse(c.arrivesAt))
    const next = Math.min(...moments.filter((m) => m > serverNow() - 60_000))
    if (!Number.isFinite(next) || stopped) return
    dueTimer = setTimeout(() => void refresh(), Math.max(50, next - serverNow() + 80))
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

  async function send(cmd: LemonadeCommand) {
    if (busy.value) return
    busy.value = true
    notice.value = null
    try {
      accept(await sendCommand<LemonadeView>(gameId, cmd))
    } catch (e) {
      say(e instanceof ApiError ? e.code : 'unknown')
      // Time may have moved on; show the server's current state.
      await refresh()
    } finally {
      busy.value = false
    }
  }

  function onVisible() {
    if (!document.hidden) void refresh()
  }

  document.addEventListener('visibilitychange', onVisible)
  tickTimer = setInterval(() => (now.value = serverNow()), 200)

  onBeforeUnmount(() => {
    stopped = true
    clearTimeout(dueTimer)
    clearTimeout(noticeTimer)
    clearInterval(tickTimer)
    document.removeEventListener('visibilitychange', onVisible)
  })

  return { game, view, loadError, busy, notice, now, refresh, send }
}
