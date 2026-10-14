import { defineConfig, devices } from '@playwright/test';

// Requires the database (`npm run db:up`) and apps/server/.env with DEV_LOGIN=true.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5173', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
