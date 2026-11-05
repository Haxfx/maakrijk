<script setup lang="ts">
import type { LemonadeView } from '~/game/lemonade/types'
import { t } from '~/locales/nl'

// Opened by tapping the till: sold / materials / left, like "Bestelling klaar!".
defineProps<{ view: LemonadeView }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <UiDialog :open="true" :title="t.stats.title" @close="emit('close')">
    <p class="text-lg">{{ t.stats.cups(view.stats.cupsSold) }}</p>
    <p v-if="view.stats.cupsByHelpers > 0" class="text-ink-soft">{{ t.stats.byHelpers(view.stats.cupsByHelpers) }}</p>
    <dl class="my-3 grid grid-cols-3 divide-x-2 divide-sand rounded-2xl bg-cream py-3 text-center" data-testid="stats">
      <div
        v-for="item in ([['sold', view.stats.revenue], ['materials', view.stats.materials], ['left', view.stats.profit]] as const)"
        :key="item[0]"
        class="px-2"
      >
        <dt class="font-bold text-ink-soft">{{ t.stats[item[0]] }}</dt>
        <dd class="mt-1 flex items-center justify-center gap-1.5 text-2xl font-extrabold" :data-testid="`stats-${item[0]}`">
          <span class="size-5 shrink-0 rounded-full bg-gold ring-2 ring-[#d99a1e]" aria-hidden="true" />
          {{ item[1] }}
          <span class="sr-only">{{ t.stats.coins }}</span>
        </dd>
      </div>
    </dl>
    <p class="text-center text-ink-soft">{{ t.stats.explain }}</p>
    <p class="mt-1 text-center text-ink-soft">{{ t.stats.jugCost(view.jugCost, view.cupsPerJug) }}</p>
    <p v-if="view.stats.invested > 0" class="mt-1 text-center text-ink-soft" data-testid="stats-invested">{{ t.stats.invested(view.stats.invested) }}</p>
    <button
      type="button"
      class="mt-5 min-h-14 w-full rounded-full bg-teal px-5 text-lg font-extrabold text-white shadow-sm hover:bg-teal-dark short:mt-3"
      autofocus
      @click="emit('close')"
    >
      {{ t.stats.close }}
    </button>
  </UiDialog>
</template>
