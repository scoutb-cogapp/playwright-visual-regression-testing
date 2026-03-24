# Visual Regression Tests to use as a base for other projects

Compares screenshots between two environments to catch visual changes.

## Set up

### Install playwright:

```bash
npm install
npx playwright install chromium
```

### Add page url's:

The base url is passed in as an argument when running the test suite.

The slugs to test are defined in  `tests/visual/pages.js`

Pages with a YouTube iframe also need their slug added to `IFRAME_SLUGS` in `tests/visual/visual-diff.spec.js`.

### Define screen widths:

The screen sizes to test are defined in `tests/visual/pages.js`. 

## Running the tests

### 1. Capture baseline screenshots from the baseline site:

On first run, **always** use `update-snapshots`, otherwise Playwright will report an error due to missing baseline screenshots. 

Use `update-snapshots` every time you require overwriting the original screenshots. 


```bash
BASE_URL=https://live.site/ npm run test:update-snapshots
```
Playwright writes the `.png` files to `tests/visual/snapshots/`. Commit that folder to version control.

#### To intentionally reset the baseline
(e.g. a visual change has been approved):

```bash
BASE_URL=https://... npm run test:update-snapshots
```


### 2. compare the new environment against the baseline:

```bash
BASE_URL=https://feature-branch.site/ npm test
```
Playwright diffs every screenshot against the saved baseline. 

When a test fails, three images are saved to `test-results/`: `*-expected.png` (baseline), `*-actual.png` (new screenshot), and `*-diff.png` (pixel differences). 

The HTML report shows all three with a side-by-side and a slider tool to compare them.

### 3. View the diff report:

```bash
npm run test:report
```

Note that these reports get overwritten every time you run the test again. To preserve a report:

1. rename `./playwright-report` to something else. when running tests again, this directory will just get re-created.
1. to retrieve this saved report, run `npx playwright show-report name-of-backed-up-playwright-report`

## Tuning sensitivity

Adjust `maxDiffPixelRatio` and `threshold` in `playwright.config.js` if you get false positives from antialiasing differences between environments.
