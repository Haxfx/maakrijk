import tailwindcss from '@tailwindcss/vite'

const apiTarget = process.env.NUXT_API_PROXY ?? 'http://127.0.0.1:8800'

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
