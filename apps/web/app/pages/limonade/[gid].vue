<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { ScreenRect } from '~/components/game/WorldHotspot.vue'
import type { GameState } from '~/game/client'
import type { Stage } from '~/game/stage'
import type { LemonadeCommand, LemonadeView } from '~/game/lemonade/types'
import { useLemonade } from '~/game/lemonade/useLemonade'
import { LEMONADE_ART, LEMONADE_BACKGROUND, LEMONADE_BOUNDS, LEMONADE_PROJECTION, LemonadeWorld } from '~/game/lemonade/world'
import { t } from '~/locales/nl'
import { useHouseholdStore } from '~/stores/household'

// Every action happens in the world: tap the crate, the sugar pot, the press,
// the board or a customer. The DOM buttons lie over the drawn objects.

const route = useRoute()
const router = useRouter()
const household = useHouseholdStore()
const gameId = String(route.params.gid)
const world = shallowRef<LemonadeWorld>()
let pending: GameState<LemonadeView> | null = null
let stopRender: (() => void) | undefined

function show(g: GameState<LemonadeView>) {
  if (!world.value) {
    pending = g
    return
  }
  world.value.play(g.events)
  world.value.update(g.view)
}

const { game, view, loadError, busy, notice, now, refresh, send } = useLemonade(gameId, show)

/** Tap targets in screen pixels, moved after every drawn frame. */
const spots = shallowRef<{ id: string; rect: ScreenRect }[]>([])

function placeSpots(stage: Stage) {
  const w = world.value
  if (!w) return
  spots.value = w.spots().map((s) => {
    const tl = stage.toScreen(s.x - s.w / 2, s.y + s.h, 0)
    const br = stage.toScreen(s.x + s.w / 2, s.y, 0)
    return { id: s.id, rect: { left: tl.x, top: tl.y, width: br.x - tl.x, height: br.y - tl.y } }
  })
}

function onStage(stage: Stage) {
  world.value = new LemonadeWorld(stage)
  stopRender = stage.onRender(() => placeSpots(stage))
  if (useRuntimeConfig().public.build.target === 'e2e') (window as unknown as { __mkStage: Stage }).__mkStage = stage
  if (pending) {
    world.value.update(pending.view)
    pending = null
  }
}

onMounted(async () => {
  if (!household.ready) await household.init()
  if (household.ready && !household.selected) return void router.replace('/')
  await refresh()
})
onBeforeUnmount(() => stopRender?.())

const coins = computed(() => game.value?.coins ?? 0)
const making = computed(() => view.value?.jug.making ?? null)
const makeProgress = computed(() => {
  const m = making.value
  if (!m) return 0
  const start = Date.parse(m.startedAt)
  const end = Date.parse(m.doneAt)
  return Math.min(1, Math.max(0, (now.value - start) / (end - start)))
})
const waiting = computed(() => view.value?.round?.customers.filter((c) => c.state === 'waiting') ?? [])
const goal = computed(() => {
  const v = view.value
  if (!v) return ''
  if (v.nextStep === 'wait') return making.value && v.jug.cups === 0 ? t.lemonade.goal.waitJug : t.lemonade.goal.waitCustomer
  return t.lemonade.goal[v.nextStep]
})

/** Which object to point at: the next step the server reports. */
const hintId = computed(() => {
  const v = view.value
  if (!v || busy.value) return null
  switch (v.nextStep) {
    case 'buy':
      return v.stock.lemons < v.recipe.lemons ? 'lemons' : 'sugar'
    case 'make':
      return 'press'
    case 'open':
      return 'board'
    case 'serve':
      return waiting.value[0] ? `customer:${waiting.value[0].id}` : null
    default:
      return null
  }
})

const shaking = ref<string | null>(null)
let shakeTimer: ReturnType<typeof setTimeout> | undefined

function commandFor(id: string, v: LemonadeView): LemonadeCommand | null {
  if (id === 'lemons') return { type: 'buyStock', lemons: 1, sugar: 0 }
  if (id === 'sugar') return { type: 'buyStock', lemons: 0, sugar: 1 }
  if (id === 'press') return { type: 'makeJug' }
  if (id === 'board') return v.round ? { type: 'closeRound' } : { type: 'openStand' }
  if (id.startsWith('customer:')) return { type: 'serveCustomer', customerId: Number(id.slice(9)) }
  return null
}

async function tap(id: string) {
  const v = view.value
  const cmd = v && commandFor(id, v)
  if (!cmd) return
  const ok = await send(cmd)
  if (!ok && notice.value) {
    // Refused: the object says "no" and the reason is shown.
    shaking.value = id
    world.value?.shake(id)
    clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => (shaking.value = null), 450)
  }
}

function label(id: string, v: LemonadeView): string {
  if (id === 'lemons') return `${t.lemonade.tap.lemon(v.prices.lemon)}. ${t.lemonade.have.lemons(v.stock.lemons)}`
  if (id === 'sugar') return `${t.lemonade.tap.sugar(v.prices.sugar)}. ${t.lemonade.have.sugar(v.stock.sugar)}`
  if (id === 'press') return making.value ? t.lemonade.making : t.lemonade.tap.press
  if (id === 'board') return v.round ? t.lemonade.tap.close : t.lemonade.tap.open
  if (id === 'jug') return t.lemonade.jug(v.jug.cups)
  return t.lemonade.tap.serve(Number(id.slice(9)))
}

function testId(id: string): string {
  if (id.startsWith('customer:')) return id === `customer:${waiting.value[0]?.id}` ? 'serve' : `customer-${id.slice(9)}`
  return `spot-${id}`
}
</script>

<template>
  <div class="flex h-dvh flex-col">
    <AppHeader :title="household.selected ? t.lemonade.title(household.selected.nickname) : t.lemonade.name" back="/start">
      <template #right>
        <span class="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-extrabold" data-testid="coins">
          <span class="size-5 rounded-full bg-gold ring-2 ring-[#d99a1e]" aria-hidden="true" />
          {{ t.lemonade.coins(coins) }}
        </span>
      </template>
    </AppHeader>

    <LoadState v-if="!game" class="m-4" :error="loadError" @retry="refresh()" />
    <main v-else-if="view" class="relative min-h-0 flex-1" style="padding-bottom: env(safe-area-inset-bottom)">
      <GameStage :bounds="LEMONADE_BOUNDS" :background="LEMONADE_BACKGROUND" :projection="LEMONADE_PROJECTION" @ready="onStage" />

      <!-- Tappable objects, lying over the drawing. -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden" data-testid="world-actions">
        <WorldHotspot
          v-for="s in spots"
          :key="s.id"
          :class="{ 'pointer-events-auto': s.id !== 'jug' }"
          :rect="s.rect"
          :label="label(s.id, view)"
          :hint="hintId === s.id"
          :shaking="shaking === s.id"
          :disabled="busy || view.nextStep === 'summary'"
          :passive="s.id === 'jug'"
          :data-testid="testId(s.id)"
          @tap="tap(s.id)"
        >
          <template #badge>
            <!-- Counts on the objects themselves: lemons, sugar, cups. -->
            <span
              v-if="s.id === 'lemons' || s.id === 'sugar'"
              class="badge absolute -top-3 -right-3"
              :data-testid="`${s.id}-count`"
              aria-hidden="true"
            >
              <img :src="s.id === 'lemons' ? LEMONADE_ART.lemon.url : LEMONADE_ART.sugar.url" alt="" class="h-4 w-auto" />
              {{ s.id === 'lemons' ? view.stock.lemons : view.stock.sugar }}
            </span>
            <span
              v-if="(s.id === 'lemons' || s.id === 'sugar') && hintId === s.id"
              class="badge absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gold!"
              aria-hidden="true"
            >
              <span class="size-3.5 rounded-full bg-[#fff6c2] ring-2 ring-[#d99a1e]" />
              {{ s.id === 'lemons' ? view.prices.lemon : view.prices.sugar }}
            </span>
            <span v-if="s.id === 'jug'" class="badge absolute -top-3 -right-4" data-testid="jug-count" role="status" :aria-label="t.lemonade.jug(view.jug.cups)">
              <img :src="LEMONADE_ART.cup.url" alt="" class="h-5 w-auto" />
              {{ view.jug.cups }}
            </span>
            <span v-if="s.id === 'press' && making" class="absolute -top-4 left-1/2 w-20 -translate-x-1/2" data-testid="making">
              <span
                class="block h-3 overflow-hidden rounded-full bg-ivory ring-2 ring-[#5b3a24]"
                role="progressbar"
                :aria-label="t.lemonade.making"
                :aria-valuenow="Math.round(makeProgress * 100)"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <span class="block h-full rounded-full bg-leaf" :style="{ width: `${makeProgress * 100}%` }" />
              </span>
            </span>
          </template>
        </WorldHotspot>
      </div>

      <div
        class="pointer-events-none absolute top-2 left-2 max-w-[75%] rounded-2xl bg-ivory/95 px-4 py-2 shadow short:py-1"
        data-testid="goal"
        aria-live="polite"
      >
        <p class="font-extrabold">{{ goal }}</p>
        <p v-if="view.nextStep === 'buy'" class="text-sm text-ink-soft">{{ t.lemonade.recipe(view.recipe.lemons, view.recipe.sugar, view.recipe.cups) }}</p>
        <p v-if="view.round" class="text-sm text-ink-soft">{{ t.lemonade.customers(view.round.served, view.round.demand) }}</p>
      </div>
      <p
        v-if="notice"
        role="alert"
        class="absolute inset-x-4 bottom-3 mx-auto max-w-md rounded-2xl bg-coral px-4 py-3 text-center font-bold text-white shadow-lg"
      >
        {{ notice }}
      </p>

      <RoundSummary v-if="view.nextStep === 'summary' && view.lastRound" :summary="view.lastRound" :busy="busy" @next="send({ type: 'seenRound', roundId: view.lastRound.roundId })" />
    </main>
  </div>
</template>

<style scoped>
.badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  background: var(--color-ivory);
  padding: 0.125rem 0.5rem;
  font-weight: 800;
  font-size: 1rem;
  line-height: 1.25rem;
  color: var(--color-ink);
  box-shadow: 0 0 0 2px #5b3a24;
  white-space: nowrap;
}
</style>
