import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',

  use: {
    trace: 'on-first-retry',
  },

  projects: [
    // ─── CRM web ─────────────────────────────────────────────────────────────
    {
      name: 'crm-desktop',
      testMatch: 'e2e/crm/**',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5175' },
    },

    // ─── Player — tablet portrait (most common student device) ───────────────
    {
      name: 'player-tablet-portrait',
      testMatch: 'e2e/player/**',
      use: {
        baseURL: 'http://localhost:5174',
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },

    // ─── Player — tablet landscape ────────────────────────────────────────────
    {
      name: 'player-tablet-landscape',
      testMatch: 'e2e/player/**',
      use: {
        baseURL: 'http://localhost:5174',
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
      },
    },

    // ─── Player — interactive panel 1080p ────────────────────────────────────
    {
      name: 'player-panel-1080',
      testMatch: 'e2e/player/**',
      use: {
        baseURL: 'http://localhost:5174',
        viewport: { width: 1920, height: 1080 },
        hasTouch: true,
      },
    },
  ],

  // Start dev servers automatically during E2E tests
  webServer: [
    {
      command: 'turbo run dev --filter=api',
      port: 3000,
      reuseExistingServer: !process.env['CI'],
    },
    {
      command: 'turbo run dev --filter=crm',
      port: 5175,
      reuseExistingServer: !process.env['CI'],
    },
    {
      command: 'turbo run dev --filter=player',
      port: 5174,
      reuseExistingServer: !process.env['CI'],
    },
  ],
})
