import { configureApi } from '~/utils/api'
import { useBuildStore } from '~/stores/build'
import type { WebBuild } from '~/utils/buildInfo'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  configureApi(config.public.apiBase as string)
  // Fire and forget: the banner appears when the check finishes.
  void useBuildStore().load(config.public.build as WebBuild)
})
