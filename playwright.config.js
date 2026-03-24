// @ts-check
const { defineConfig } = require('@playwright/test');
require('dotenv').config();

/**
 * Visual regression config.
 *
 * Pass BASE_URL at runtime:
 *   BASE_URL=https://live.example.com npx playwright test          # create / update golden snapshots
 *   BASE_URL=https://staging.example.com npx playwright test       # compare against goldens
 *
 * Or use the npm scripts defined in package.json.
 */

module.exports = defineConfig({
  testDir: './tests',

  // Run tests serially to be polite to the live server
  workers: 1,
  fullyParallel: false,

  // Retry once on CI to smooth over transient network blips
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL,

    // HTTP Basic Auth credentials for password-shielded environments.
    ...(process.env.HTTP_USER && process.env.HTTP_PASS
      ? { httpCredentials: { username: process.env.HTTP_USER, password: process.env.HTTP_PASS } }
      : {}),

    // Collect trace on first retry to aid debugging
    trace: 'on-first-retry',

    // Disable CSS animations globally at the browser level as well.
    // The helpers.js CSS injection is belt-and-suspenders for JS-driven animations.
    reducedMotion: 'reduce',
  },

  // Where Playwright stores the golden .png files.
  // These should be committed to version control alongside your test code.
  snapshotDir: './tests/visual/snapshots',

  expect: {
    // How long to wait for toHaveScreenshot to pass (incl. rendering settle time)
    timeout: 15_000,

    toHaveScreenshot: {
      // Allow up to 0.5% pixel difference (handles sub-pixel antialiasing between envs)
      maxDiffPixelRatio: 0.005,

      // Per-channel colour threshold (0–1). 0.2 is a reasonable default.
      threshold: 0.2,

      // Animations are also disabled at the screenshot level
      animations: 'disabled',
    },
  },
});
