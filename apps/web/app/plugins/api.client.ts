import { configureApi } from '~/utils/api'
import { useBuildStore } from '~/stores/build'
import { useSettingsStore } from '~/stores/settings'
import type { WebBuild } from '~/utils/buildInfo'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  configureApi(config.public.apiBase as string)
  useSettingsStore().apply()
  // Fire and forget: the banner appears when the check finishes.
  void useBuildStore().load(config.public.build as WebBuild)
})
