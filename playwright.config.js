import { defineConfig } from '@playwright/test';

// Keep browser tests separate from the developer's running backoffice.
const port = Number(process.env.E2E_PORT || 5174);
const origin = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: origin,
    viewport: { width: 1536, height: 1024 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node tests/api-server.mjs',
      env: { E2E_PORT: String(port) },
      url: 'http://127.0.0.1:3101/health',
      timeout: 60000,
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -- --port ${port}`,
      url: origin,
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3101' },
      timeout: 30000,
      reuseExistingServer: false,
    },
  ],
});
