import { defineConfig, devices } from '@playwright/test';

// Requires the database (`npm run db:up`) and apps/server/.env with DEV_LOGIN=true.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5173', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm run dev',
    // An API route through Vite's proxy: ready only once both the web and API servers are up.
    url: 'http://localhost:5173/api/auth/config',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
