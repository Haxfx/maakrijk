<script setup lang="ts">
import { computed } from 'vue'

/**
 * A tappable object in the game world. It lies exactly over the drawn object
 * (the page moves it every frame), so the child taps the crate, the press or
 * a customer itself. It is a real button: keyboard and screen readers work,
 * and the label says what happens.
 */
export interface ScreenRect {
  left: number
  top: number
  width: number
  height: number
}

const props = defineProps<{
  rect: ScreenRect
  label: string
  /** The next step: show a pulsing ring and a pointing arrow. */
  hint?: boolean
  /** A refused tap: shake once. */
  shaking?: boolean
  disabled?: boolean
  /** Not tappable, only shows a badge (e.g. cups in the jug). */
  passive?: boolean
}>()
const emit = defineEmits<{ tap: [] }>()

/** Touch targets stay at least 48 px, centred on the object. */
const MIN = 48
const style = computed(() => {
  const { left, top, width, height } = props.rect
  const w = Math.max(MIN, width)
  const h = Math.max(MIN, height)
  return { left: `${left - (w - width) / 2}px`, top: `${top - (h - height) / 2}px`, width: `${w}px`, height: `${h}px` }
})
</script>

<template>
  <div v-if="passive" class="pointer-events-none absolute" :style="style">
    <slot name="badge" />
  </div>
  <button
    v-else
    type="button"
    class="hotspot absolute rounded-3xl"
    :class="{ 'is-hint': hint, 'is-shaking': shaking }"
    :style="style"
    :aria-label="label"
    :disabled="disabled"
    @click="emit('tap')"
  >
    <span v-if="hint" class="hint-ring pointer-events-none absolute inset-0 rounded-3xl" aria-hidden="true" />
    <span v-if="hint" class="hint-arrow pointer-events-none absolute left-1/2 -top-11 -translate-x-1/2" aria-hidden="true">
      <svg width="34" height="38" viewBox="0 0 34 38">
        <path d="M10 2 L24 2 L24 18 L32 18 L17 36 L2 18 L10 18 Z" fill="#f2bb45" stroke="#5b3a24" stroke-width="3" stroke-linejoin="round" />
      </svg>
    </span>
    <slot name="badge" />
  </button>
</template>

<style scoped>
.hotspot {
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.hotspot:disabled {
  cursor: default;
}
.hotspot:active:not(:disabled) {
  background: rgb(255 252 245 / 0.25);
}
.hint-ring {
  box-shadow: 0 0 0 4px rgb(242 187 69 / 0.9);
  animation: pulse 1.4s ease-in-out infinite;
}
.hint-arrow {
  animation: bob 1s ease-in-out infinite;
}
.is-shaking {
  animation: shake 0.4s ease-in-out;
}
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgb(242 187 69 / 0.9);
  }
  50% {
    box-shadow: 0 0 0 9px rgb(242 187 69 / 0.35);
  }
}
@keyframes bob {
  0%,
  100% {
    transform: translate(-50%, 0);
  }
  50% {
    transform: translate(-50%, -8px);
  }
}
@keyframes shake {
  20%,
  60% {
    transform: translateX(-6px);
  }
  40%,
  80% {
    transform: translateX(6px);
  }
}
</style>
