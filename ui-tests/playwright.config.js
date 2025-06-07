/**
 * Configuration for Playwright using default from @jupyterlab/galata
 */
const baseConfig = require('@jupyterlab/galata/lib/playwright-config');

module.exports = {
  ...baseConfig,
  use: {
    headless: true,
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
  },
  timeout: 120 * 1000,
  webServer: {
    command: 'npm start',
    url: 'http://localhost:8888/lab',
    reuseExistingServer: false,
  }
};
