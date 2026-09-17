import { defineConfig } from '@playwright/test';

// Keep browser tests separate from the developer's running backoffice.
const cloudflare = process.env.E2E_CLOUDFLARE === '1';
const port = Number(process.env.E2E_PORT || (cloudflare ? 8788 : 5174));
const origin = `${cloudflare ? 'https' : 'http'}://localhost:${port}`;

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
    ignoreHTTPSErrors: cloudflare,
    viewport: { width: 1536, height: 1024 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node tests/api-server.mjs',
      env: { E2E_PORT: String(port), E2E_CLOUDFLARE: cloudflare ? '1' : '0' },
      url: 'http://127.0.0.1:3101/health',
      timeout: 60000,
      reuseExistingServer: false,
    },
    {
      command: cloudflare
        ? `wrangler dev --ip 127.0.0.1 --port ${port} --local-protocol https --var BACKEND_ORIGIN:http://127.0.0.1:3101`
        : `npm run dev -- --port ${port}`,
      url: origin,
      env: {
        API_PROXY_TARGET: 'http://127.0.0.1:3101',
        VITE_API_URL: '/api/v1',
        CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
        WRANGLER_SEND_METRICS: 'false',
      },
      ignoreHTTPSErrors: cloudflare,
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
});
