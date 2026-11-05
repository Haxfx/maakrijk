<script setup lang="ts">
import { computed } from 'vue'
import type { LemonadeUpgrade } from '~/game/lemonade/types'
import { t } from '~/locales/nl'

// "Grotere kan" card from the designs: picture, now → next, price, balance,
// one big button. Opened by tapping the object the upgrade belongs to.
const props = defineProps<{ upgrade: LemonadeUpgrade; coins: number; picture: string; busy: boolean }>()
const emit = defineEmits<{ buy: []; close: [] }>()

const text = computed(() => t.upgrades[props.upgrade.id])
const maxed = computed(() => props.upgrade.nextPrice === null)
const short = computed(() => Math.max(0, (props.upgrade.nextPrice ?? 0) - props.coins))
</script>

<template>
  <UiDialog :open="true" :title="text.name" @close="emit('close')">
    <div class="flex items-start gap-4 short:gap-3" data-testid="upgrade-card">
      <img :src="picture" alt="" class="h-24 w-24 shrink-0 rounded-2xl bg-cream object-contain p-2 short:h-16 short:w-16" />
      <div class="min-w-0">
        <p class="text-ink-soft">{{ text.explain }}</p>
        <p class="mt-1 text-sm font-bold text-ink-soft">{{ t.upgrade.level(upgrade.level, upgrade.maxLevel) }}</p>
      </div>
    </div>
    <dl class="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-cream p-3 text-center short:my-2">
      <div>
        <dt class="text-sm font-bold text-ink-soft">{{ t.upgrade.now }}</dt>
        <dd class="font-extrabold" data-testid="upgrade-now">{{ text.effect(upgrade.level) }}</dd>
      </div>
      <span class="text-2xl font-extrabold text-teal" aria-hidden="true">→</span>
      <div>
        <dt class="text-sm font-bold text-ink-soft">{{ t.upgrade.next }}</dt>
        <dd class="font-extrabold text-leaf" data-testid="upgrade-next">{{ maxed ? t.upgrade.max : text.effect(upgrade.level + 1) }}</dd>
      </div>
    </dl>
    <div v-if="!maxed" class="mb-4 flex justify-between text-lg short:mb-2">
      <span>{{ t.upgrade.price }}: <b data-testid="upgrade-price">{{ upgrade.nextPrice }}</b></span>
      <span>{{ t.upgrade.balance }}: <b>{{ coins }}</b></span>
    </div>
    <p v-if="!maxed && short > 0" class="mb-3 text-center font-bold text-coral">{{ t.upgrade.short(short) }}</p>
    <div class="flex gap-3">
      <button type="button" class="min-h-14 flex-1 rounded-full bg-sand px-5 text-lg font-extrabold" @click="emit('close')">
        {{ t.upgrade.close }}
      </button>
      <button
        v-if="!maxed"
        type="button"
        class="min-h-14 flex-[2] rounded-full bg-teal px-5 text-lg font-extrabold text-white shadow-sm hover:bg-teal-dark disabled:opacity-50"
        :disabled="busy || short > 0"
        data-testid="upgrade-buy"
        autofocus
        @click="emit('buy')"
      >
        {{ t.upgrade.buy }}
      </button>
    </div>
  </UiDialog>
</template>
