import { defineStore } from 'pinia'
import { api } from '~/utils/api'
import { compareContract, type ApiVersion, type BuildCheck, type WebBuild } from '~/utils/buildInfo'

export const useBuildStore = defineStore('build', {
  state: () => ({
    server: null as ApiVersion | null,
    check: { state: 'unknown' } as BuildCheck,
    loaded: false,
  }),
  actions: {
    async load(page: WebBuild) {
      try {
        this.server = await api<ApiVersion>('/version')
      } catch {
        this.server = null
      }
      this.check = compareContract(page, this.server)
      this.loaded = true
    },
  },
})
