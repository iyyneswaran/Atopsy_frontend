import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 180000,
  expect: { timeout: 20000 },
  workers: 1,
  fullyParallel: false,
  webServer: {
    command: 'npm start',
    url: process.env.E2E_BASE_URL || 'http://127.0.0.1:3001',
    reuseExistingServer: true,
    timeout: 120000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3001',
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 20000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
