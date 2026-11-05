import { defineConfig, devices } from '@playwright/test'

// `npm run e2e` expects the e2e build (scripts/build-web.sh e2e) and starts the
// Rust API on 8801, serving that build on one origin, against maakrijk_test.
// Set E2E_BASE_URL to run against a stack that is already running.
const port = 8801
const external = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: external ?? `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    // WebKit approximates Safari / WKWebView for the later iOS build (D4).
    // Opt-in: it needs system libraries (`sudo npx playwright install-deps webkit`).
    ...(process.env.E2E_WEBKIT === '1'
      ? [{ name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1366, height: 768 } } }]
      : []),
  ],
  webServer: external
    ? undefined
    : {
        command: 'cargo run --quiet --bin maakrijk-api',
        cwd: '../../services/api',
        url: `http://127.0.0.1:${port}/api/health`,
        timeout: 300_000,
        reuseExistingServer: false,
        env: {
          DATABASE_URL:
            process.env.TEST_DATABASE_URL ?? 'postgres://maakrijk:maakrijk_dev_only@127.0.0.1:5450/maakrijk_test',
          BIND_ADDR: `127.0.0.1:${port}`,
          WEB_DIR: process.env.E2E_WEB_DIR ?? '../../apps/web/.output-e2e/public',
          RUST_LOG: 'warn',
        },
      },
})
