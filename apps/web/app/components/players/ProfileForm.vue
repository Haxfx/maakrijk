<script setup lang="ts">
import { AVATARS } from '~/stores/household'
import { t } from '~/locales/nl'

const props = defineProps<{ nickname?: string; avatar?: string; submitLabel: string; busy: boolean; error: string | null }>()
const emit = defineEmits<{ submit: [nickname: string, avatar: string]; cancel: [] }>()

const name = ref(props.nickname ?? '')
const avatar = ref(props.avatar ?? AVATARS[0])
const inputId = useId()
const errorId = useId()

function submit() {
  emit('submit', name.value, avatar.value)
}
</script>

<template>
  <form class="grid gap-5 short:grid-cols-2 short:gap-x-6 short:gap-y-3" novalidate @submit.prevent="submit">
    <div>
      <label :for="inputId" class="mb-1 block text-lg font-bold">{{ t.players.nickname }}</label>
      <input
        :id="inputId"
        v-model="name"
        type="text"
        autocomplete="off"
        autocapitalize="words"
        maxlength="40"
        class="min-h-12 w-full rounded-xl border-2 border-sand bg-white px-4 text-lg focus:border-teal focus:outline-none"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        data-testid="nickname-input"
      />
      <p class="mt-1 text-sm text-ink-soft">{{ t.players.nicknameHint }}</p>
    </div>

    <fieldset>
      <legend class="mb-2 text-lg font-bold short:mb-1">{{ t.players.avatar }}</legend>
      <div class="grid grid-cols-4 gap-2 short:gap-1 short:[&_svg]:size-11">
        <label
          v-for="(a, i) in AVATARS"
          :key="a"
          class="grid cursor-pointer place-items-center rounded-2xl border-4 p-1 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold"
          :class="avatar === a ? 'border-teal bg-teal/10' : 'border-transparent'"
        >
          <input v-model="avatar" type="radio" name="avatar" :value="a" class="sr-only" :aria-label="t.players.avatarLabel(i + 1)" />
          <AvatarIcon :id="a" :size="60" />
        </label>
      </div>
    </fieldset>

    <p v-if="error" :id="errorId" role="alert" class="short:col-span-2 rounded-xl bg-coral/15 p-3 font-bold text-ink" data-testid="form-error">
      {{ error }}
    </p>

    <!-- Sticky, so the main action stays visible if the dialog still has to scroll. -->
    <div
      class="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap justify-end gap-3 border-t border-sand bg-ivory px-5 py-3 short:col-span-2 short:py-2 sm:-mx-6 sm:-mb-6 sm:px-6"
    >
      <button type="button" class="min-h-12 rounded-full border-2 border-teal px-6 font-bold text-teal" @click="emit('cancel')">
        {{ t.common.cancel }}
      </button>
      <button
        type="submit"
        class="min-h-12 rounded-full bg-teal px-8 font-bold text-white disabled:opacity-60"
        :disabled="busy"
        data-testid="profile-submit"
      >
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>
