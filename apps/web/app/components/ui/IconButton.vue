<script setup lang="ts">
// Header button: icon plus an optional visible word, at least 48 px. A link
// when `to` is set, otherwise a button. (A dynamic <component :is> with
// resolveComponent('NuxtLink') rendered an inert <nuxtlink> tag; RC1 F1.)
defineProps<{ label: string; icon: 'gear' | 'swap'; to?: string; showLabel?: boolean }>()
defineEmits<{ click: [] }>()

const cls = 'flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-full px-2 font-bold hover:bg-white/10'
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="cls" :aria-label="showLabel ? undefined : label" :title="label">
    <IconGlyph :icon="icon" />
    <span v-if="showLabel">{{ label }}</span>
  </NuxtLink>
  <button v-else type="button" :class="cls" :aria-label="showLabel ? undefined : label" :title="label" @click="$emit('click')">
    <IconGlyph :icon="icon" />
    <span v-if="showLabel">{{ label }}</span>
  </button>
</template>
