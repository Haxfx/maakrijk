<script setup lang="ts">
defineProps<{ icon: 'gear' | 'swap' }>()
</script>

<template>
  <svg v-if="icon === 'gear'" viewBox="0 0 24 24" class="size-7 shrink-0" aria-hidden="true">
    <path
      fill="currentColor"
      d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
      transform="translate(-1 0)"
    />
  </svg>
  <svg v-else viewBox="0 0 24 24" class="size-7 shrink-0" aria-hidden="true">
    <path d="M7 7h11l-3-3M17 17H6l3 3" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
