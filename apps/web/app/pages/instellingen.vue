<script setup lang="ts">
import { useSettingsStore } from '~/stores/settings'
import { t } from '~/locales/nl'

const settings = useSettingsStore()
const router = useRouter()

const rows = [
  { key: 'reduceMotion', label: t.settings.reduceMotion },
  { key: 'bigText', label: t.settings.bigText },
] as const

function done() {
  // Only go back when the previous page is part of this app; otherwise
  // (opened directly) go to the start, never out of the app (RC1 F2).
  // vue-router keeps the previous in-app path in history.state.back.
  if ((window.history.state as { back?: string | null } | null)?.back) router.back()
  else void router.push('/')
}
</script>

<template>
  <div class="min-h-dvh">
    <AppHeader :title="t.settings.title" back="/" />
    <main class="mx-auto max-w-xl px-4 pb-10 pt-6">
      <ul class="divide-y divide-sand rounded-[var(--radius-card)] bg-ivory shadow-sm">
        <li v-for="row in rows" :key="row.key">
          <label class="flex min-h-16 cursor-pointer items-center justify-between gap-4 px-5 text-lg font-bold">
            {{ row.label }}
            <span class="relative inline-flex">
              <input
                type="checkbox"
                role="switch"
                class="peer sr-only"
                :checked="settings[row.key]"
                :data-testid="`setting-${row.key}`"
                @change="settings.set(row.key, ($event.target as HTMLInputElement).checked)"
              />
              <span
                class="block h-8 w-14 rounded-full bg-[#a8987a] transition-colors peer-checked:bg-teal peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-gold"
                aria-hidden="true"
              />
              <span
                class="absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6"
                aria-hidden="true"
              />
            </span>
          </label>
        </li>
      </ul>
      <p class="mt-3 text-ink-soft">{{ t.settings.note }}</p>
      <button type="button" class="mt-6 min-h-12 w-full rounded-full bg-teal font-bold text-white" @click="done">
        {{ t.settings.done }}
      </button>
    </main>
  </div>
</template>
