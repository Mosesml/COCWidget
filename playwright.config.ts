import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:8086', browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL,
    viewport: { width: 1440, height: 1050 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'python3 -m http.server 8086 --bind 127.0.0.1 --directory dist', url: 'http://127.0.0.1:8086', reuseExistingServer: !process.env.CI },
});
