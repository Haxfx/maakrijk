import { defineStore } from 'pinia'
import { api, ApiError } from '~/utils/api'
import { readLocal, writeLocal } from '~/utils/storage'

export interface Profile {
  id: string
  nickname: string
  avatar: string
  createdAt: string
}

export const AVATARS = ['kid-1', 'kid-2', 'kid-3', 'kid-4', 'kid-5', 'kid-6', 'kid-7', 'kid-8'] as const
export const MAX_PROFILES = 8
const SELECTED_KEY = 'maakrijk.selectedProfile'

export const useHouseholdStore = defineStore('household', {
  state: () => ({
    ready: false,
    loadError: null as string | null,
    profiles: [] as Profile[],
    selectedId: readLocal(SELECTED_KEY),
  }),
  getters: {
    selected: (s): Profile | null => s.profiles.find((p) => p.id === s.selectedId) ?? null,
    full: (s) => s.profiles.length >= MAX_PROFILES,
  },
  actions: {
    /** Make sure there is a session, then load the profiles. */
    async init() {
      this.loadError = null
      try {
        await api('/session', { method: 'POST' })
        this.profiles = await api<Profile[]>('/profiles')
        if (this.selectedId && !this.selected) this.select(null)
        this.ready = true
      } catch (e) {
        this.loadError = e instanceof ApiError ? e.code : 'unknown'
      }
    },
    select(id: string | null) {
      this.selectedId = id
      writeLocal(SELECTED_KEY, id)
    },
    async create(nickname: string, avatar: string) {
      const p = await api<Profile>('/profiles', { method: 'POST', body: { nickname, avatar } })
      this.profiles.push(p)
      return p
    },
    async update(id: string, patch: { nickname?: string; avatar?: string }) {
      const p = await api<Profile>(`/profiles/${id}`, { method: 'PATCH', body: patch })
      const i = this.profiles.findIndex((x) => x.id === id)
      if (i >= 0) this.profiles[i] = p
      return p
    },
    async remove(id: string) {
      try {
        await api(`/profiles/${id}`, { method: 'DELETE' })
      } catch (e) {
        // Already gone elsewhere: treat as removed.
        if (!(e instanceof ApiError && e.code === 'not_found')) throw e
      }
      this.profiles = this.profiles.filter((p) => p.id !== id)
      if (this.selectedId === id) this.select(null)
    },
  },
})
