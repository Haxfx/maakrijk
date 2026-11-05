<script setup lang="ts">
import { t } from '~/locales/nl'

// Dark teal top bar from the designs: back or avatar on the left, title, actions on the right.
defineProps<{ title: string; back?: string; avatar?: string }>()
</script>

<template>
  <header class="sticky top-0 z-30 bg-header text-white shadow-md" style="padding-top: env(safe-area-inset-top)">
    <div class="mx-auto flex min-h-16 max-w-5xl items-center gap-3 px-4">
      <NuxtLink
        v-if="back"
        :to="back"
        class="-ml-2 grid size-12 place-items-center rounded-full hover:bg-white/10"
        :aria-label="t.common.back"
      >
        <svg viewBox="0 0 24 24" class="size-7" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </NuxtLink>
      <AvatarIcon v-else-if="avatar" :id="avatar" :size="44" />
      <h1 class="min-w-0 flex-1 text-lg leading-tight font-extrabold break-words sm:text-2xl">{{ title }}</h1>
      <slot name="right" />
    </div>
  </header>
</template>
