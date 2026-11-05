<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Stage, hasWebGL } from '~/game/stage'
import type { Bounds } from '~/game/view'
import { t } from '~/locales/nl'
import { useSettingsStore } from '~/stores/settings'

const props = defineProps<{ bounds: Bounds; background?: string }>()
const emit = defineEmits<{ ready: [stage: Stage] }>()

const canvas = ref<HTMLCanvasElement>()
const stage = shallowRef<Stage>()
const noWebgl = ref(false)
const seeingAll = ref(true)
const settings = useSettingsStore()

function prefersReduced(): boolean {
  return settings.reduceMotion || (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
}

onMounted(() => {
  if (!canvas.value || !hasWebGL()) {
    noWebgl.value = true
    return
  }
  try {
    const s = new Stage(canvas.value, {
      bounds: props.bounds,
      reducedMotion: prefersReduced(),
      background: props.background,
      onViewChange: () => {
        seeingAll.value = stage.value?.isSeeingAll() ?? true
      },
    })
    stage.value = s
    emit('ready', s)
  } catch {
    noWebgl.value = true
  }
})

watch(
  () => settings.reduceMotion,
  () => stage.value?.setReducedMotion(prefersReduced()),
)

onBeforeUnmount(() => {
  stage.value?.dispose()
  stage.value = undefined
})

defineExpose({ stage })
</script>

<template>
  <div class="relative size-full overflow-hidden">
    <div v-if="noWebgl" role="status" class="flex size-full flex-col items-center justify-center gap-1 bg-sand p-4 text-center">
      <p class="font-extrabold">{{ t.stage.noWebglTitle }}</p>
      <p class="text-ink-soft">{{ t.stage.noWebglBody }}</p>
    </div>
    <template v-else>
      <canvas ref="canvas" class="block size-full touch-none" role="img" :aria-label="t.stage.worldLabel" data-testid="stage" />
      <button
        v-if="!seeingAll"
        type="button"
        class="absolute top-2 right-2 min-h-12 rounded-full bg-ivory/95 px-4 font-bold text-teal-dark shadow"
        @click="stage?.seeAll()"
      >
        {{ t.stage.seeAll }}
      </button>
      <slot />
    </template>
  </div>
</template>
