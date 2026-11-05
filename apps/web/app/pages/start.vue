<script setup lang="ts">
import { useHouseholdStore } from '~/stores/household'
import { errorText, t } from '~/locales/nl'
import { ApiError, api } from '~/utils/api'
import type { components } from '~/types/api'

type GameSummary = components['schemas']['GameSummary']

const household = useHouseholdStore()
const router = useRouter()
const games = ref<GameSummary[]>([])
const opening = ref(false)
const openError = ref<string | null>(null)

const lemonade = computed(() => games.value.find((g) => g.scenarioId === 'lemonade') ?? null)

onMounted(async () => {
  if (!household.ready) await household.init()
  if (household.ready && !household.selected) return void router.replace('/')
  if (household.selected) {
    try {
      games.value = await api<GameSummary[]>(`/profiles/${household.selected.id}/games`)
    } catch {
      // The card still works: opening starts or resumes the game.
    }
  }
})

/** Start the game, or resume it: the server returns the existing one. */
async function openLemonade() {
  const p = household.selected
  if (!p || opening.value) return
  opening.value = true
  openError.value = null
  try {
    const g = await api<{ id: string }>(`/profiles/${p.id}/games`, { method: 'POST', body: { scenarioId: 'lemonade' } })
    await router.push(`/limonade/${g.id}`)
  } catch (e) {
    openError.value = errorText(e instanceof ApiError ? e.code : 'unknown')
  } finally {
    opening.value = false
  }
}

function switchPlayer() {
  household.select(null)
  void router.push('/')
}
</script>

<template>
  <div class="min-h-dvh">
    <AppHeader :title="household.selected ? t.start.hello(household.selected.nickname) : t.appName" :avatar="household.selected?.avatar">
      <template #right>
        <IconButton icon="swap" :label="t.players.switch" show-label @click="switchPlayer" />
        <IconButton icon="gear" :label="t.common.settings" to="/instellingen" />
      </template>
    </AppHeader>

    <main class="mx-auto max-w-5xl px-4 pb-10 pt-6">
      <LoadState v-if="!household.ready" :error="household.loadError" @retry="household.init()" />
      <template v-else-if="household.selected">
        <h2 class="mb-6 flex items-center justify-center gap-3 text-center text-3xl font-extrabold text-header sm:text-4xl">
          <svg viewBox="0 0 24 24" class="size-7 text-leaf" aria-hidden="true">
            <path fill="currentColor" d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zm0 0l7-7" />
          </svg>
          {{ t.start.title }}
          <svg viewBox="0 0 24 24" class="size-7 -scale-x-100 text-leaf" aria-hidden="true">
            <path fill="currentColor" d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zm0 0l7-7" />
          </svg>
        </h2>
        <!-- Only working businesses are shown (decision C1). -->
        <div class="grid gap-4 sm:grid-cols-2">
          <article class="overflow-hidden rounded-[var(--radius-card)] bg-ivory shadow-sm" data-testid="card-lemonade">
            <div class="relative h-36 bg-gradient-to-b from-[#bfe3f2] to-[#a5d47a]" aria-hidden="true">
              <svg viewBox="0 0 200 110" class="absolute inset-x-0 bottom-0 mx-auto h-full">
                <rect x="55" y="58" width="90" height="40" rx="4" fill="#f2bb45" />
                <rect x="55" y="54" width="90" height="8" fill="#e5a52f" />
                <rect x="58" y="22" width="4" height="36" fill="#c98a3a" />
                <rect x="138" y="22" width="4" height="36" fill="#c98a3a" />
                <path d="M50 26h100l-6 12H56z" fill="#167d8d" />
                <path d="M62 26h12l-2 12H60zM86 26h12l-1 12H85zM110 26h12l1 12h-12zM134 26h12l2 12h-12z" fill="#fffcf5" />
                <rect x="88" y="40" width="14" height="16" rx="3" fill="#ffe066" stroke="#e8f6fb" stroke-width="2" />
                <ellipse cx="118" cy="50" rx="7" ry="5" fill="#ffd84a" />
                <ellipse cx="127" cy="52" rx="7" ry="5" fill="#ffd84a" />
              </svg>
            </div>
            <div class="flex items-center justify-between gap-3 p-4">
              <h3 class="text-xl font-extrabold">{{ t.lemonade.name }}</h3>
              <button
                type="button"
                class="min-h-12 rounded-full bg-teal px-6 text-lg font-extrabold text-white shadow-sm hover:bg-teal-dark disabled:opacity-60"
                :disabled="opening"
                @click="openLemonade"
              >
                {{ lemonade ? t.start_cards.open : t.start_cards.play }}
              </button>
            </div>
            <p v-if="openError" role="alert" class="px-4 pb-4 font-bold text-coral">{{ openError }}</p>
          </article>
        </div>
      </template>
    </main>
  </div>
</template>
