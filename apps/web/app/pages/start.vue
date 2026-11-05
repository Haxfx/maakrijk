<script setup lang="ts">
import { useHouseholdStore } from '~/stores/household'
import { t } from '~/locales/nl'

const household = useHouseholdStore()
const router = useRouter()

onMounted(async () => {
  if (!household.ready) await household.init()
  if (household.ready && !household.selected) void router.replace('/')
})

function switchPlayer() {
  household.select(null)
  void router.push('/')
}
</script>

<template>
  <div class="min-h-dvh">
    <AppHeader :title="household.selected ? t.start.hello(household.selected.nickname) : t.appName" :avatar="household.selected?.avatar">
      <template #right>
        <IconButton icon="swap" :label="t.players.switch" @click="switchPlayer" />
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
        <!-- Only working businesses are shown (decision C1). None exist in release 0.1. -->
        <div class="rounded-[var(--radius-card)] bg-ivory p-8 text-center shadow-sm" data-testid="no-businesses">
          <p class="text-xl font-bold text-ink-soft">{{ t.start.noBusinesses }}</p>
        </div>
      </template>
    </main>
  </div>
</template>
