// @ts-check
const { test, expect } = require('@playwright/test');
const { waitForPageReady } = require('./helpers');
const pages     = require('./pages');
const viewports = require('./viewports');

/**
 * Pages that contain an embedded iframe (e.g. a YouTube player).
 * The helper will wait for the iframe element to become visible on these.
 */
const IFRAME_SLUGS = new Set(['/whore-babylon']);

for (const { name, slug } of pages) {
  const hasIframe = IFRAME_SLUGS.has(slug);

  for (const { width, height } of viewports) {
    // Derive stable identifiers for the snapshot filename and test title
    const snapshotName = `${name}--${width}px.png`;
    const testTitle    = `${name} | ${width}×${height}`;

    test(testTitle, async ({ page }) => {
      // ── 1. Size the viewport ──────────────────────────────────────────────
      await page.setViewportSize({ width, height });

      // ── 2. Navigate ───────────────────────────────────────────────────────
      await page.goto(slug, {
        // 'load' fires after all synchronous resources (HTML, CSS, synchronous
        // JS) are done.  Our helper waits for fonts + images on top of this.
        waitUntil: 'load',
      });

      // ── 3. Wait for the page to be fully settled ──────────────────────────
      await waitForPageReady(page, { hasIframe });

      // ── 4. Full-page screenshot + diff ───────────────────────────────────
      //
      // The snapshot name is stable (no URL in it) so that both runs — the
      // golden capture against the live site and the comparison run against
      // the new environment — look up the same file on disk.
      //
      // On the FIRST run (with --update-snapshots) Playwright writes the file.
      // On subsequent runs it diffs the new screenshot against the saved one.
      await expect(page).toHaveScreenshot(snapshotName, {
        fullPage: true,

        // Belt-and-suspenders: also instruct the screenshot engine to skip
        // any animations that managed to survive our CSS injection.
        animations: 'disabled',
      });
    });
  }
}
