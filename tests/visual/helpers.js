// @ts-check

/**
 * Injects a <style> tag that freezes every CSS animation and transition on
 * the page.  
 *
 * Works alongside the Playwright-level `animations: 'disabled'` option and the
 * `reducedMotion: 'reduce'` browser preference.
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
 * Pauses all <video> elements on the page and sets them to frame 0.
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
 * fonts are ready.
 *
 * @param {import('@playwright/test').Page} page
 */
async function waitForFonts(page) {
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Scrolls the entire page in small increments so that any lazy-loaded content
 * starts loading. Then scrolls back to the top so the screenshot starts from the beginning.
 *
 * To check whether the site uses lazy loading, open DevTools → Elements and
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
 * @param {import('@playwright/test').Page} page
 * @param {{ hasIframe?: boolean }} [options]
 */
async function waitForPageReady(page, { hasIframe = false } = {}) {
  // 1. Basic page load
  await page.waitForLoadState('load');

  // 2. Freeze animations
  await disableAnimations(page);

  // 3. Pause videos and reset to first frame
  await pauseVideos(page);

  // 4. Block until fonts are rendered
  await waitForFonts(page);

  // 5. Scroll to trigger lazy-loaded content
  await triggerLazyContent(page);

  // 6. Wait for images to finish loading
  await waitForImages(page);

  // 7. Iframe (e.g. YouTube embed)
  if (hasIframe) {
    await waitForIframe(page);
  }

  // 8. Short final pause to let the last paint flush
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
