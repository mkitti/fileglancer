/**
 * Configuration for Playwright using default from @jupyterlab/galata
 */
import { baseConfig } from "@jupyterlab/galata/lib/playwright-config";
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...baseConfig,
  use: {
    headless: true,
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
  },
  timeout: (process.env.CI ? 240 : 60) * 1000,
  workers: process.env.CI ? 1 : undefined,
  webServer: {
    command: 'npm start',
    url: 'http://localhost:8888/lab',
    reuseExistingServer: false,
  },
});
