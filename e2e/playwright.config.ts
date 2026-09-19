import { defineConfig } from '@playwright/test';

// Runs against a Headlamp that is already up with the plugin and a cluster
// loaded: dev/e2e.sh starts one on the kind cluster from dev/kind-istio-ambient.sh.
export default defineConfig({
  testDir: './tests',
  // Not *.spec/*.test: the plugin's own `npm test` (vitest) collects those
  // anywhere in the repo, and would try to run these without a browser.
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.HEADLAMP_URL ?? 'http://localhost:4466',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
