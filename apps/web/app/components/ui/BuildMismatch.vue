<script setup lang="ts">
import { useBuildStore } from '~/stores/build'
import { t } from '~/locales/nl'

const build = useBuildStore()
</script>

<template>
  <div
    v-if="build.check.state === 'older' || build.check.state === 'newer'"
    role="alert"
    class="fixed inset-x-0 top-0 z-50 bg-coral px-4 py-2 text-center text-sm font-bold text-white"
    data-testid="build-mismatch"
  >
    {{ build.check.state === 'older' ? t.build.serverOlder : t.build.serverNewer }}
    <NuxtLink to="/diagnose" class="underline">{{ t.build.details }}</NuxtLink>
  </div>
</template>
