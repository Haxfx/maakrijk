<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import type { GameState } from '~/game/client'
import type { Stage } from '~/game/stage'
import type { LemonadeView } from '~/game/lemonade/types'
import { useLemonade } from '~/game/lemonade/useLemonade'
import { LEMONADE_BACKGROUND, LEMONADE_BOUNDS, LemonadeWorld } from '~/game/lemonade/world'
import { t } from '~/locales/nl'
import { useHouseholdStore } from '~/stores/household'

const route = useRoute()
const router = useRouter()
const household = useHouseholdStore()
const gameId = String(route.params.gid)
const world = shallowRef<LemonadeWorld>()
let pending: GameState<LemonadeView> | null = null

function show(g: GameState<LemonadeView>) {
  if (!world.value) {
    pending = g
    return
  }
  world.value.play(g.events)
  world.value.update(g.view)
}

const { game, view, loadError, busy, notice, now, refresh, send } = useLemonade(gameId, show)

function onStage(stage: Stage) {
  world.value = new LemonadeWorld(stage)
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

const coins = computed(() => game.value?.coins ?? 0)
const making = computed(() => view.value?.jug.making ?? null)
const makeProgress = computed(() => {
  const m = making.value
  if (!m) return 0
  const start = Date.parse(m.startedAt)
  const end = Date.parse(m.doneAt)
  return Math.min(1, Math.max(0, (now.value - start) / (end - start)))
})
const waitingCustomer = computed(() => view.value?.round?.customers.find((c) => c.state === 'waiting') ?? null)
const goal = computed(() => {
  const v = view.value
  if (!v) return ''
  if (v.nextStep === 'wait') return making.value && v.jug.cups === 0 ? t.lemonade.goal.waitJug : t.lemonade.goal.waitCustomer
  return t.lemonade.goal[v.nextStep]
})
const buyCost = computed(() => {
  const v = view.value
  return v ? v.forOneJug.lemons * v.prices.lemon + v.forOneJug.sugar * v.prices.sugar : 0
})
const canMake = computed(() => {
  const v = view.value
  return !!v && !making.value && v.stock.lemons >= v.recipe.lemons && v.stock.sugar >= v.recipe.sugar && v.jug.cups + v.recipe.cups <= v.capacity.jugCups
})
/** Buying is offered when there is no full jug ready and none on the way. */
const showBuy = computed(() => {
  const v = view.value
  return !!v && v.jug.cups === 0 && !making.value && !canMake.value
})

function buyForJug() {
  const v = view.value
  if (v) void send({ type: 'buyStock', lemons: v.forOneJug.lemons, sugar: v.forOneJug.sugar })
}
function serve() {
  if (waitingCustomer.value) void send({ type: 'serveCustomer', customerId: waitingCustomer.value.id })
}
function seen() {
  const r = view.value?.lastRound
  if (r) void send({ type: 'seenRound', roundId: r.roundId })
}

const btn = 'min-h-14 rounded-full px-5 text-lg font-extrabold shadow-sm disabled:opacity-50'
const primary = `${btn} bg-teal text-white hover:bg-teal-dark`
const secondary = `${btn} bg-ivory text-teal-dark ring-2 ring-teal/40`
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
    <template v-else-if="view">
      <main class="relative min-h-0 flex-1">
        <GameStage :bounds="LEMONADE_BOUNDS" :background="LEMONADE_BACKGROUND" @ready="onStage" />
        <div
          class="pointer-events-none absolute top-2 left-2 max-w-[70%] rounded-2xl bg-ivory/95 px-4 py-2 shadow short:py-1"
          data-testid="goal"
          aria-live="polite"
        >
          <p class="font-extrabold">{{ goal }}</p>
          <p v-if="view.round" class="text-sm text-ink-soft">{{ t.lemonade.customers(view.round.served, view.round.demand) }}</p>
        </div>
        <p
          v-if="notice"
          role="alert"
          class="absolute inset-x-4 bottom-3 mx-auto max-w-md rounded-2xl bg-coral px-4 py-3 text-center font-bold text-white shadow-lg"
        >
          {{ notice }}
        </p>
      </main>

      <RoundSummary v-if="view.nextStep === 'summary' && view.lastRound" :summary="view.lastRound" :busy="busy" @next="seen" />

      <section
        class="border-t-4 border-sand bg-ivory px-4 py-3 short:py-2"
        style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
        data-testid="panel"
      >
        <div class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 short:flex-nowrap">
          <!-- Stock and jug -->
          <div class="flex items-center gap-4 text-base font-bold">
            <div data-testid="stock">
              <p class="text-xs font-extrabold tracking-wide text-ink-soft uppercase">{{ t.lemonade.stock }}</p>
              <p>{{ t.lemonade.lemons }} {{ view.stock.lemons }} · {{ t.lemonade.sugar }} {{ view.stock.sugar }}</p>
            </div>
            <div data-testid="jug">
              <p class="text-xs font-extrabold tracking-wide text-ink-soft uppercase">{{ t.lemonade.inJug }}</p>
              <p>{{ t.lemonade.cups(view.jug.cups) }}</p>
            </div>
          </div>

          <!-- Actions, depending on the next step -->
          <div class="flex flex-wrap items-center justify-end gap-2">
            <template v-if="view.nextStep !== 'summary'">
              <div v-if="making" class="flex min-w-40 flex-col gap-1" data-testid="making">
                <p class="text-sm font-bold">{{ t.lemonade.making }}</p>
                <div class="h-3 overflow-hidden rounded-full bg-sand" role="progressbar" :aria-valuenow="Math.round(makeProgress * 100)" aria-valuemin="0" aria-valuemax="100">
                  <div class="h-full rounded-full bg-leaf" :style="{ width: `${makeProgress * 100}%` }" />
                </div>
              </div>
              <template v-if="showBuy">
                <span class="hidden text-sm text-ink-soft sm:inline">{{ t.lemonade.recipe(view.recipe.lemons, view.recipe.sugar, view.recipe.cups) }}</span>
                <button type="button" :class="secondary" :disabled="busy" @click="send({ type: 'buyStock', lemons: 1, sugar: 0 })">
                  {{ t.lemonade.buyOneLemon }}
                </button>
                <button type="button" :class="secondary" :disabled="busy" @click="send({ type: 'buyStock', lemons: 0, sugar: 1 })">
                  {{ t.lemonade.buyOneSugar }}
                </button>
                <button type="button" :class="primary" :disabled="busy || buyCost === 0" @click="buyForJug">
                  {{ t.lemonade.buyForJug(buyCost) }}
                </button>
              </template>
              <button v-else-if="canMake && view.jug.cups === 0" type="button" :class="primary" :disabled="busy" @click="send({ type: 'makeJug' })">
                {{ t.lemonade.make }}
              </button>
              <button v-if="!view.round && (view.jug.cups > 0 || making)" type="button" :class="primary" :disabled="busy" @click="send({ type: 'openStand' })">
                {{ t.lemonade.open }}
              </button>
              <template v-if="view.round">
                <button type="button" :class="secondary" :disabled="busy" @click="send({ type: 'closeRound' })">{{ t.lemonade.close }}</button>
                <button
                  type="button"
                  :class="primary"
                  :disabled="busy || !waitingCustomer || view.jug.cups === 0"
                  data-testid="serve"
                  @click="serve"
                >
                  {{ t.lemonade.serve }}
                </button>
              </template>
            </template>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
