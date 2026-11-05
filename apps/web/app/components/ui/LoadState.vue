<script setup lang="ts">
import { errorText, t } from '~/locales/nl'

// Shown while the household loads, or when it could not load.
defineProps<{ error: string | null }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="grid min-h-60 place-items-center p-6 text-center" role="status">
    <div v-if="error" class="flex flex-col items-center gap-4">
      <p class="text-lg font-bold">{{ errorText(error) }}</p>
      <button type="button" class="min-h-12 rounded-full bg-teal px-6 font-bold text-white" @click="$emit('retry')">
        {{ t.common.retry }}
      </button>
    </div>
    <div v-else class="size-10 animate-spin rounded-full border-4 border-teal/30 border-t-teal" :aria-label="t.common.loading" />
  </div>
</template>
