import { defineStore } from 'pinia'
import { readLocal, writeLocal } from '~/utils/storage'

const KEY = 'maakrijk.settings'

interface Settings {
  reduceMotion: boolean
  bigText: boolean
}

function load(): Settings {
  const fallback: Settings = { reduceMotion: false, bigText: false }
  const raw = readLocal(KEY)
  if (!raw) return fallback
  try {
    const v = JSON.parse(raw) as Partial<Settings>
    return { reduceMotion: v.reduceMotion === true, bigText: v.bigText === true }
  } catch {
    return fallback
  }
}

/** Device settings. They live on this device only (no account data). */
export const useSettingsStore = defineStore('settings', {
  state: (): Settings => load(),
  actions: {
    set<K extends keyof Settings>(key: K, value: Settings[K]) {
      this[key] = value
      writeLocal(KEY, JSON.stringify({ reduceMotion: this.reduceMotion, bigText: this.bigText }))
      this.apply()
    },
    /** Reflect the settings as classes on <html>, used by CSS. */
    apply() {
      const html = globalThis.document?.documentElement
      if (!html) return
      html.classList.toggle('reduce-motion', this.reduceMotion)
      html.classList.toggle('big-text', this.bigText)
    },
  },
})
