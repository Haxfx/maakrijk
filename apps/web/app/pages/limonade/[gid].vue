<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { ScreenRect } from '~/components/game/WorldHotspot.vue'
import type { GameState } from '~/game/client'
import type { Stage } from '~/game/stage'
import type { LemonadeView, UpgradeId } from '~/game/lemonade/types'
import { jugsForTaps, useLemonade } from '~/game/lemonade/useLemonade'
import { LEMONADE_ART, LEMONADE_BACKGROUND, LEMONADE_BOUNDS, LEMONADE_PROJECTION, LemonadeWorld, type SpotId } from '~/game/lemonade/world'
import { t } from '~/locales/nl'
import { useHouseholdStore } from '~/stores/household'

// A clicker: tap the press to sell lemonade. Improvements are bought by
// tapping their object (arrow on the press, the help-wanted sign, the sprout);
// the till shows what you earned. No buttons under the world (D12, D13).

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
  world.value.update(g.view)
}

const { game, view, coins, loadError, busy, notice, away, pendingTaps, refresh, tap, buy } = useLemonade(gameId, show)

/** Tap targets in screen pixels, moved after every drawn frame. */
const spots = shallowRef<{ id: SpotId; rect: ScreenRect }[]>([])

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

const UPGRADE_OF: Partial<Record<SpotId, UpgradeId>> = { 'press-up': 'press', helper: 'helper', tree: 'tree' }
const PICTURE: Record<UpgradeId, string> = {
  press: LEMONADE_ART.press.url,
  helper: LEMONADE_ART.helpSign.url,
  tree: LEMONADE_ART.lemonTree.url,
}

function upgradeOf(id: UpgradeId) {
  return view.value?.upgrades.find((u) => u.id === id) ?? null
}
/** Affordable now, so the object gets a golden arrow. */
function canBuy(id: UpgradeId): boolean {
  const u = upgradeOf(id)
  return !!u && u.nextPrice !== null && coins.value >= u.nextPrice
}

const hintId = computed<SpotId | null>(() => {
  const v = view.value
  if (!v) return null
  if (v.nextStep === 'tap') return v.stats.cupsSold < v.cupsPerJug ? 'press' : null
  const id = v.nextStep.slice(8) as UpgradeId
  return id === 'press' ? 'press-up' : id
})
const goal = computed(() => (view.value?.nextStep.startsWith('upgrade') ? t.lemonade.goal.upgrade : t.lemonade.goal.tap))

/** Floating "+2" texts over the press; purely decoration. */
const floats = ref<{ id: number; text: string; x: number; cost?: boolean }[]>([])
let floatId = 0
function float(text: string, cost = false) {
  const id = ++floatId
  floats.value = [...floats.value.slice(-6), { id, text, cost, x: cost ? 0 : Math.round(Math.random() * 40 - 20) }]
  setTimeout(() => (floats.value = floats.value.filter((f) => f.id !== id)), cost ? 1400 : 900)
}

const shaking = ref<SpotId | null>(null)
let shakeTimer: ReturnType<typeof setTimeout> | undefined
function shake(id: SpotId) {
  shaking.value = id
  world.value?.shake(id)
  clearTimeout(shakeTimer)
  shakeTimer = setTimeout(() => (shaking.value = null), 450)
}

const card = ref<UpgradeId | null>(null)
const statsOpen = ref(false)

function onTap(id: SpotId) {
  const v = view.value
  if (!v) return
  if (id === 'press') {
    // The first cup of a new jug pays for its ingredients: show why coins dip.
    const p = pendingTaps.value
    if (jugsForTaps(v, p + 1) > jugsForTaps(v, p)) float(t.lemonade.ingredients(v.jugCost), true)
    tap()
    world.value?.tapped()
    float(t.lemonade.earned(v.cupsPerTap * v.cupPrice))
  } else if (id === 'till') statsOpen.value = true
  else if (UPGRADE_OF[id]) card.value = UPGRADE_OF[id]!
}

async function buyCard() {
  const id = card.value
  if (!id) return
  if (await buy(id)) card.value = null
  else {
    card.value = null
    shake(id === 'press' ? 'press-up' : id)
  }
}

function label(id: SpotId, v: LemonadeView): string {
  if (id === 'press') return t.lemonade.tap.press(v.cupsPerTap, v.cupPrice)
  if (id === 'till') return t.lemonade.tap.till
  if (id === 'jug') return t.lemonade.jug(v.jugLeft)
  return t.lemonade.tap.upgrade(t.upgrades[UPGRADE_OF[id]!].name)
}
</script>

<template>
  <div class="flex h-dvh flex-col">
    <AppHeader :title="household.selected ? t.lemonade.title(household.selected.nickname) : t.lemonade.name" back="/start">
      <template #right>
        <span class="flex flex-col items-end leading-tight">
          <span class="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-extrabold" data-testid="coins">
            <span class="size-5 rounded-full bg-gold ring-2 ring-[#d99a1e]" aria-hidden="true" />
            {{ t.lemonade.coins(coins) }}
          </span>
          <span v-if="view && view.perMinute > 0" class="px-3 text-sm font-bold text-gold" data-testid="per-minute">{{ t.lemonade.perMinute(view.perMinute) }}</span>
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
          :class="{ 'pointer-events-auto': s.id !== 'jug', 'z-10': s.id === 'press-up' }"
          :rect="s.rect"
          :label="label(s.id, view)"
          :hint="hintId === s.id"
          :shaking="shaking === s.id"
          :passive="s.id === 'jug'"
          :data-testid="`spot-${s.id}`"
          @tap="onTap(s.id)"
        >
          <template #badge>
            <!-- Upgrade arrow with price: gold when you can afford it. -->
            <span
              v-if="UPGRADE_OF[s.id] && upgradeOf(UPGRADE_OF[s.id]!)?.nextPrice != null"
              class="badge absolute left-1/2 -translate-x-1/2"
              :class="[s.id === 'press-up' ? 'top-1/2 -translate-y-1/2' : '-top-4', canBuy(UPGRADE_OF[s.id]!) ? 'bg-gold!' : 'opacity-80']"
              :data-testid="`up-${UPGRADE_OF[s.id]}`"
              aria-hidden="true"
            >
              <svg width="14" height="16" viewBox="0 0 14 16"><path d="M7 1 L13 8 L9.5 8 L9.5 15 L4.5 15 L4.5 8 L1 8 Z" fill="#167d8d" /></svg>
              {{ upgradeOf(UPGRADE_OF[s.id]!)?.nextPrice }}
            </span>
            <span v-if="s.id === 'jug' && view.jugLeft > 0" class="badge absolute -top-3 -right-4" data-testid="jug-count" role="status" :aria-label="t.lemonade.jug(view.jugLeft)">
              <img :src="LEMONADE_ART.cup.url" alt="" class="h-5 w-auto" />
              {{ view.jugLeft }}
            </span>
            <template v-if="s.id === 'press'">
              <span
                v-for="f in floats"
                :key="f.id"
                class="float pointer-events-none absolute left-1/2 top-0 font-extrabold"
                :class="f.cost ? 'cost text-base text-white' : 'text-2xl text-gold'"
                :data-testid="f.cost ? 'float-cost' : undefined"
                :style="{ marginLeft: `${f.x}px` }"
                aria-hidden="true"
              >{{ f.text }}</span>
            </template>
          </template>
        </WorldHotspot>
      </div>

      <div
        class="pointer-events-none absolute top-2 left-2 max-w-[75%] rounded-2xl bg-ivory/95 px-4 py-2 shadow short:py-1"
        data-testid="goal"
        aria-live="polite"
      >
        <p class="font-extrabold">{{ goal }}</p>
      </div>
      <p
        v-if="notice"
        role="alert"
        class="absolute inset-x-4 bottom-3 mx-auto max-w-md rounded-2xl bg-coral px-4 py-3 text-center font-bold text-white shadow-lg"
      >
        {{ notice }}
      </p>

      <UpgradeCard
        v-if="card && upgradeOf(card)"
        :upgrade="upgradeOf(card)!"
        :coins="coins"
        :picture="PICTURE[card]"
        :busy="busy"
        @buy="buyCard"
        @close="card = null"
      />
      <StatsSheet v-if="statsOpen" :view="view" @close="statsOpen = false" />
      <UiDialog v-if="away" :open="true" :title="t.away.title" @close="away = null">
        <div data-testid="away">
          <p class="text-lg">{{ t.away.sold(away.cups) }}</p>
          <p class="text-lg font-extrabold">{{ t.away.earned(away.revenue - away.materials) }}</p>
          <p v-if="away.capped" class="mt-2 text-ink-soft">{{ t.away.capped }}</p>
        </div>
        <button
          type="button"
          class="mt-5 min-h-14 w-full rounded-full bg-teal px-5 text-lg font-extrabold text-white shadow-sm hover:bg-teal-dark"
          autofocus
          @click="away = null"
        >
          {{ t.away.ok }}
        </button>
      </UiDialog>
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
.float {
  transform: translateX(-50%);
  text-shadow: 0 2px 0 #5b3a24;
  white-space: nowrap;
  animation: rise 0.9s ease-out forwards;
}
.float.cost {
  top: auto;
  bottom: -1.5rem;
  border-radius: 9999px;
  background: var(--color-coral);
  padding: 0.125rem 0.5rem;
  text-shadow: none;
  animation-duration: 1.4s;
}
@keyframes rise {
  from {
    opacity: 1;
    translate: 0 0;
  }
  to {
    opacity: 0;
    translate: 0 -60px;
  }
}
</style>
