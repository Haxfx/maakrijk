<script setup lang="ts">
import { ApiError } from '~/utils/api'
import { useHouseholdStore, type Profile } from '~/stores/household'
import { errorText, t } from '~/locales/nl'

const household = useHouseholdStore()
const router = useRouter()

const managing = ref(false)
const formOpen = ref(false)
const editing = ref<Profile | null>(null)
const removing = ref<Profile | null>(null)
const busy = ref(false)
const formError = ref<string | null>(null)
const removeError = ref<string | null>(null)

onMounted(() => {
  if (!household.ready) void household.init()
})

function play(p: Profile) {
  household.select(p.id)
  void router.push('/start')
}

function openNew() {
  editing.value = null
  formError.value = null
  formOpen.value = true
}

function openEdit(p: Profile) {
  editing.value = p
  formError.value = null
  formOpen.value = true
}

function codeOf(e: unknown) {
  return e instanceof ApiError ? e.code : 'unknown'
}

async function save(nickname: string, avatar: string) {
  busy.value = true
  formError.value = null
  try {
    if (editing.value) await household.update(editing.value.id, { nickname, avatar })
    else await household.create(nickname, avatar)
    formOpen.value = false
  } catch (e) {
    formError.value = errorText(codeOf(e))
    // Another tab may have added players: show the real list (RC1 F8).
    if (codeOf(e) === 'profile_limit') await household.refresh()
  } finally {
    busy.value = false
  }
}

async function confirmRemove() {
  if (!removing.value) return
  busy.value = true
  removeError.value = null
  try {
    await household.remove(removing.value.id)
    removing.value = null
    if (household.profiles.length === 0) managing.value = false
  } catch (e) {
    removeError.value = errorText(codeOf(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh">
    <AppHeader :title="t.appName">
      <template #right>
        <IconButton icon="gear" :label="t.common.settings" to="/instellingen" />
      </template>
    </AppHeader>

    <main class="mx-auto max-w-5xl px-4 pb-10 pt-6">
      <LoadState v-if="!household.ready" :error="household.loadError" @retry="household.init()" />

      <template v-else>
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-3xl font-extrabold text-header sm:text-4xl">{{ t.players.title }}</h2>
          <button
            v-if="household.profiles.length > 0"
            type="button"
            class="min-h-12 rounded-full border-2 border-teal px-5 font-bold text-teal"
            :aria-pressed="managing"
            data-testid="manage-toggle"
            @click="managing = !managing"
          >
            {{ managing ? t.players.doneManaging : t.players.manage }}
          </button>
        </div>

        <p v-if="household.profiles.length === 0" class="mb-4 text-lg text-ink-soft">{{ t.players.empty }}</p>

        <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" data-testid="profile-list">
          <li v-for="p in household.profiles" :key="p.id">
            <div class="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-ivory shadow-sm">
              <button
                type="button"
                class="flex flex-1 flex-col items-center gap-3 p-4 hover:bg-white disabled:cursor-default"
                :aria-label="t.players.play(p.nickname)"
                :disabled="managing"
                data-testid="profile-card"
                @click="play(p)"
              >
                <AvatarIcon :id="p.avatar" :size="88" />
                <span class="w-full text-center text-xl leading-tight font-extrabold break-words">{{ p.nickname }}</span>
              </button>
              <div v-if="managing" class="grid grid-cols-1 border-t border-sand lg:grid-cols-2">
                <button type="button" class="min-h-12 px-2 font-bold text-teal hover:bg-white" @click="openEdit(p)">
                  {{ t.players.edit }}
                </button>
                <button
                  type="button"
                  class="min-h-12 border-t border-sand px-2 font-bold text-coral hover:bg-white lg:border-t-0 lg:border-l"
                  :data-testid="`remove-${p.nickname}`"
                  @click="(removing = p), (removeError = null)"
                >
                  {{ t.players.remove }}
                </button>
              </div>
            </div>
          </li>
          <li v-if="!household.full && !managing">
            <button
              type="button"
              class="flex h-full min-h-44 w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-4 border-dashed border-teal/40 p-4 font-extrabold text-teal hover:bg-ivory"
              data-testid="new-player"
              @click="openNew"
            >
              <span class="grid size-14 place-items-center rounded-full bg-teal text-4xl leading-none text-white" aria-hidden="true">+</span>
              <span class="text-lg">{{ t.players.newPlayer }}</span>
            </button>
          </li>
        </ul>
        <p v-if="household.full" class="mt-4 text-ink-soft">{{ t.players.limitReached }}</p>
      </template>
    </main>

    <UiDialog :open="formOpen" :title="editing ? t.players.editTitle : t.players.newTitle" @close="formOpen = false">
      <ProfileForm
        v-if="formOpen"
        :key="editing?.id ?? 'new'"
        :nickname="editing?.nickname"
        :avatar="editing?.avatar"
        :submit-label="editing ? t.common.save : t.players.create"
        :busy="busy"
        :error="formError"
        @submit="save"
        @cancel="formOpen = false"
      />
    </UiDialog>

    <UiDialog :open="!!removing" :title="removing ? t.players.removeTitle(removing.nickname) : ''" @close="removing = null">
      <p class="mb-5 text-lg">{{ t.players.removeBody }}</p>
      <p v-if="removeError" role="alert" class="mb-4 rounded-xl bg-coral/15 p-3 font-bold">{{ removeError }}</p>
      <div class="flex flex-wrap justify-end gap-3">
        <button type="button" class="min-h-12 rounded-full border-2 border-teal px-6 font-bold text-teal" @click="removing = null">
          {{ t.common.cancel }}
        </button>
        <button
          type="button"
          class="min-h-12 rounded-full bg-coral px-6 font-bold text-white disabled:opacity-60"
          :disabled="busy"
          data-testid="remove-confirm"
          @click="confirmRemove"
        >
          {{ t.players.removeConfirm }}
        </button>
      </div>
    </UiDialog>
  </div>
</template>
