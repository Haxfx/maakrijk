<script setup lang="ts">
import { useBuildStore } from '~/stores/build'
import { commitLabel, type WebBuild } from '~/utils/buildInfo'
import { t } from '~/locales/nl'

const page = useRuntimeConfig().public.build as WebBuild
const build = useBuildStore()

const rows = computed(() => {
  const s = build.server
  return [
    { label: t.diagnose.webTarget, value: page.target },
    { label: t.diagnose.webCommit, value: commitLabel(page.gitCommit, page.dirty) },
    { label: t.diagnose.webBuilt, value: page.builtAt },
    { label: t.diagnose.webContract, value: String(page.expectedContract) },
    { label: t.diagnose.apiVersion, value: s?.api ?? '—' },
    { label: t.diagnose.apiCommit, value: s ? commitLabel(s.gitCommit, s.dirty) : '—' },
    { label: t.diagnose.apiBuilt, value: s?.buildTime ?? '—' },
    { label: t.diagnose.apiContract, value: s ? String(s.contract) : '—' },
    { label: t.diagnose.database, value: s?.database ?? '—' },
    { label: t.diagnose.migration, value: s?.migration != null ? String(s.migration) : '—' },
  ]
})
</script>

<template>
  <main class="mx-auto max-w-xl p-4">
    <h1 class="mb-4 text-2xl font-extrabold">{{ t.diagnose.title }}</h1>
    <p v-if="build.loaded && !build.server" class="mb-4 rounded-xl bg-coral/15 p-3 font-bold" role="status">
      {{ t.diagnose.noServer }}
    </p>
    <p v-else-if="build.check.state === 'ok'" class="mb-4 rounded-xl bg-leaf/15 p-3 font-bold" role="status">
      {{ t.diagnose.match }}
    </p>
    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[var(--radius-card)] bg-ivory p-4 shadow-sm">
      <template v-for="row in rows" :key="row.label">
        <dt class="font-bold text-ink-soft">{{ row.label }}</dt>
        <dd class="break-all font-mono text-sm" :data-testid="`diag-${row.label}`">{{ row.value }}</dd>
      </template>
    </dl>
    <NuxtLink to="/" class="mt-6 inline-flex min-h-12 items-center rounded-full bg-teal px-6 font-bold text-white">
      {{ t.common.back }}
    </NuxtLink>
  </main>
</template>
