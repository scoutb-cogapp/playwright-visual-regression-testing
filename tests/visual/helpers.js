// @ts-check

/**
 * Injects a <style> tag that freezes every CSS animation and transition on
 * the page.  This prevents in-flight animations from causing screenshot noise.
 *
 * Works alongside the Playwright-level `animations: 'disabled'` option and the
 * `reducedMotion: 'reduce'` browser preference — belt-and-suspenders.
 *
 * @param {import('@playwright/test').Page} page
 */
async function disableAnimations(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration:        0s !important;
        animation-delay:           0s !important;
        animation-iteration-count: 1 !important;
        transition-duration:       0s !important;
        transition-delay:          0s !important;
        scroll-behavior:           auto !important;
      }
    `,
  });
}

/**
 * Pauses all <video> elements on the page and seeks them to frame 0.
 *
 * Autoplaying hero videos will be at a different frame on every screenshot run
 * unless frozen.  Pausing + seeking to 0 gives a consistent first frame
 * regardless of network speed or CPU timing.
 *
 * Note: `reducedMotion: 'reduce'` is a CSS media query hint — it only stops
 * videos if the site's own JS explicitly checks for it, so we cannot rely on
 * it here.
 *
 * @param {import('@playwright/test').Page} page
 */
async function pauseVideos(page) {
  await page.evaluate(() => {
    document.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
  });
}

/**
 * Waits for the browser's CSS Font Loading API to signal that all declared
 * fonts are ready.  This is the platform-standard approach and works for
 * self-hosted fonts, Google Fonts, Adobe Fonts, etc.
 *
 * @param {import('@playwright/test').Page} page
 */
async function waitForFonts(page) {
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Scrolls the entire page in small increments so that any lazy-loaded content
 * (images with `loading="lazy"`, IntersectionObserver-based loaders, etc.) has
 * a chance to enter the viewport and start loading.  Then scrolls back to the
 * top so the screenshot starts from the beginning.
 *
 * To check whether your site uses lazy loading, open DevTools → Elements and
 * look for <img loading="lazy"> or <img data-src="…"> attributes.
 *
 * @param {import('@playwright/test').Page} page
 */
async function triggerLazyContent(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const SCROLL_STEP = 300; // px per step
      const STEP_DELAY = 80;   // ms between steps — gives the browser paint time

      const scrollDown = () => {
        window.scrollBy(0, SCROLL_STEP);

        const atBottom =
          window.scrollY + window.innerHeight >= document.body.scrollHeight - 1;

        if (atBottom) {
          window.scrollTo({ top: 0, behavior: 'instant' });
          resolve(undefined);
        } else {
          setTimeout(scrollDown, STEP_DELAY);
        }
      };

      scrollDown();
    });
  });
}

/**
 * Waits for every <img> element currently in the DOM to finish loading.
 * Broken images are resolved immediately so they don't hang the test.
 *
 * @param {import('@playwright/test').Page} page
 */
async function waitForImages(page) {
  await page.evaluate(async () => {
    const images = /** @type {HTMLImageElement[]} */ (
      Array.from(document.querySelectorAll('img'))
    );

    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();

        return new Promise((resolve) => {
          img.addEventListener('load',  resolve, { once: true });
          img.addEventListener('error', resolve, { once: true }); // don't stall on 404s
        });
      })
    );
  });
}

/**
 * Waits for the first <iframe> on the page to become visible.
 * For YouTube embeds we just need the iframe element to be stable in the DOM —
 * waiting for the iframe's own content to load would add many seconds and is
 * prone to cross-origin restrictions.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=10_000]
 */
async function waitForIframe(page, timeout = 10_000) {
  const iframe = page.locator('iframe').first();
  await iframe.waitFor({ state: 'visible', timeout });
}

/**
 * Composite helper — call this after `page.goto()` to ensure the page is
 * fully settled and ready for a deterministic screenshot.
 *
 * Steps:
 *  1. Wait for the `load` event (all synchronous resources done)
 *  2. Disable all CSS animations / transitions
 *  3. Pause all videos and seek to frame 0
 *  4. Block until fonts are rendered
 *  5. Scroll the page to trigger any lazy-loaded content
 *  6. Wait for all images to finish loading
 *  7. (Optional) Wait for an iframe to become visible
 *  8. Short final pause to let the last paint flush
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ hasIframe?: boolean }} [options]
 */
async function waitForPageReady(page, { hasIframe = false } = {}) {
  // 1. Basic page load
  await page.waitForLoadState('load');

  // 2. Freeze animations before anything else renders further
  await disableAnimations(page);

  // 3. Pause videos and reset to first frame for a consistent screenshot
  await pauseVideos(page);

  // 4. Fonts
  await waitForFonts(page);

  // 5. Scroll to trigger lazy content
  await triggerLazyContent(page);

  // 6. Wait for images triggered by the scroll
  await waitForImages(page);

  // 7. Iframe (e.g. YouTube embed)
  if (hasIframe) {
    await waitForIframe(page);
  }

  // 8. Give the compositor one more tick to flush the final paint
  await page.waitForTimeout(300);
}

module.exports = {
  waitForPageReady,
  disableAnimations,
  pauseVideos,
  waitForFonts,
  triggerLazyContent,
  waitForImages,
  waitForIframe,
};
