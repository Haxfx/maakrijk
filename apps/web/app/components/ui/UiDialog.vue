<script setup lang="ts">
// Native <dialog>: focus trap, Escape and backdrop come from the browser.
const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
const el = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => {
    const d = el.value
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  },
  { flush: 'post' },
)
onMounted(() => {
  if (props.open) el.value?.showModal()
})
</script>

<template>
  <dialog
    ref="el"
    class="m-auto w-[min(32rem,calc(100vw-2rem))] short:w-[min(46rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-[var(--radius-card)] bg-ivory p-0 text-ink shadow-2xl backdrop:bg-ink/50"
    :aria-label="title"
    @cancel.prevent="emit('close')"
    @click.self="emit('close')"
  >
    <div class="p-5 sm:p-6 short:py-3">
      <h2 class="mb-4 text-2xl font-extrabold short:mb-2">{{ title }}</h2>
      <slot />
    </div>
  </dialog>
</template>
