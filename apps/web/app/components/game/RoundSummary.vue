<script setup lang="ts">
import type { LemonadeSummary } from '~/game/lemonade/types'
import { t } from '~/locales/nl'

// "Bestelling klaar!" from design 239d…: sold / materials / left, one button.
defineProps<{ summary: LemonadeSummary; busy: boolean }>()
const emit = defineEmits<{ next: [] }>()
</script>

<template>
  <UiDialog :open="true" :title="t.summary.title" @close="emit('next')">
    <p class="mb-4 text-lg short:mb-2">{{ t.summary.cupsSold(summary.cupsSold, summary.customers) }}</p>
    <dl class="mb-3 grid grid-cols-3 divide-x-2 divide-sand rounded-2xl bg-cream py-3 text-center" data-testid="summary">
      <div v-for="item in ([['sold', summary.sold], ['materials', summary.materials], ['left', summary.left]] as const)" :key="item[0]" class="px-2">
        <dt class="font-bold text-ink-soft">{{ t.summary[item[0]] }}</dt>
        <dd class="mt-1 flex items-center justify-center gap-1.5 text-2xl font-extrabold" :data-testid="`summary-${item[0]}`">
          <span class="size-5 shrink-0 rounded-full bg-gold ring-2 ring-[#d99a1e]" aria-hidden="true" />
          {{ item[1] }}
          <span class="sr-only">{{ t.summary.coins }}</span>
        </dd>
      </div>
    </dl>
    <p class="mb-5 text-center text-ink-soft short:mb-3">{{ t.summary.explain }}</p>
    <button
      type="button"
      class="min-h-14 w-full rounded-full bg-teal px-5 text-lg font-extrabold text-white shadow-sm hover:bg-teal-dark disabled:opacity-50"
      :disabled="busy"
      autofocus
      @click="emit('next')"
    >
      {{ t.summary.next }}
    </button>
  </UiDialog>
</template>
