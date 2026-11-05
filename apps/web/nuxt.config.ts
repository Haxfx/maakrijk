import { execSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'

const apiTarget = process.env.NUXT_API_PROXY ?? 'http://127.0.0.1:8800'

// Each build target writes to its own folder, so a preview or test build can
// never overwrite what the dev app serves (docs/build/decision-log.md, D7).
const targets = { dev: '.output-dev', preview: '.output-preview', e2e: '.output-e2e', release: '.output' } as const
type Target = keyof typeof targets
const target = (process.env.MAAKRIJK_BUILD_TARGET ?? 'preview') as Target
if (!(target in targets)) throw new Error(`MAAKRIJK_BUILD_TARGET must be one of ${Object.keys(targets).join(', ')}`)
const outDir = resolve(import.meta.dirname, targets[target])
// Refuse an output folder that is a symlink pointing outside this checkout.
try {
  const real = realpathSync(outDir)
  if (!real.startsWith(`${realpathSync(import.meta.dirname)}/`)) throw new Error(`${outDir} points outside this checkout (${real})`)
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
}

const git = (cmd: string) => {
  try {
    return execSync(`git ${cmd}`, { cwd: import.meta.dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

// Must equal API_CONTRACT_VERSION in services/api/src/http/version.rs.
const expectedContract = 1

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  // Static SPA: the same build runs on the web and, later, inside a native iOS shell (D4).
  ssr: false,
  devtools: { enabled: false },
  telemetry: false,
  modules: ['@pinia/nuxt'],
  css: ['@fontsource-variable/nunito', '~/assets/css/main.css'],
  typescript: { strict: true },
  components: [{ path: '~/components', pathPrefix: false }],
  nitro: { output: { dir: outDir, publicDir: resolve(outDir, 'public') } },
  runtimeConfig: {
    public: {
      // Empty = same origin. A native shell sets the full API origin here (D4).
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '',
      build: {
        target,
        gitCommit: git('rev-parse --short HEAD') || 'unknown',
        dirty: git('status --porcelain -- .').length > 0,
        builtAt: new Date().toISOString(),
        expectedContract,
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: { proxy: { '/api': { target: apiTarget, changeOrigin: false } } },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'nl' },
      title: 'Maakrijk',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Maak, verzorg en verkoop in je eigen kleine bedrijfjes.' },
        { name: 'theme-color', content: '#1d4f58' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' }],
    },
  },
})
