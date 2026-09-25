import { defineConfig, devices } from '@playwright/test';

// E2E runs against the production build (vite preview), so the service worker is real.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/math-app/',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: /perf\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'tablet-touch',
      testIgnore: /perf\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
        isMobile: false,
      },
    },
    {
      // R-NF-1 timings run on their own, after everything else, so other workers don't share the CPU.
      name: 'perf',
      testMatch: /perf\.spec\.ts/,
      dependencies: ['desktop-chromium', 'tablet-touch'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 }, hasTouch: true },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/math-app/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
