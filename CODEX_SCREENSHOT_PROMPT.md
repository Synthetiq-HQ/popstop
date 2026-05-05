# Codex Prompt: PopStop Side-by-Side Screenshot Comparison

## Task
Take **side-by-side screenshots** of a real ad/popup test page showing the difference between **PopStop extension OFF** and **PopStop extension ON**.

Save the final composite image to:
```
C:\Users\INTERPOL\Downloads\ad blocker\screenshots\side-by-side.png
```

Also save the individual frames to:
```
C:\Users\INTERPOL\Downloads\ad blocker\screenshots\without-extension.png
C:\Users\INTERPOL\Downloads\ad blocker\screenshots\with-extension.png
```

---

## Extension Details
- **Path:** `C:\Users\INTERPOL\Downloads\ad blocker\`
- **Name:** Synthetiq PopStop
- **Type:** Chrome Manifest V3 unpacked extension
- **How it works:** Blocks ad subresources, disables clicktrap overlays, kills popup tabs, detects videos.

---

## Test Page
Use **https://canyoublockit.com/testing/** as the primary test page.  
(Alternative fallback: `https://adblock-tester.com/`)

**Why this page:**
- It has banner ads, pop-under scripts, and clicktrap overlays.
- The README already references it.
- It is NOT in the extension allowlist by default.

---

## Requirements

### 1. Screenshot WITHOUT extension
- Launch a **clean Chromium profile** (no extensions loaded).
- Navigate to `https://canyoublockit.com/testing/`.
- Wait **5 seconds** for ads and scripts to load.
- Optionally scroll slightly to capture the ad zones if they appear below the fold.
- Take a full-page screenshot.
- Save as `without-extension.png`.

### 2. Screenshot WITH extension
- Launch Chromium with the **unpacked extension loaded**:
  ```
  --load-extension=C:\Users\INTERPOL\Downloads\ad blocker
  --disable-extensions-except=C:\Users\INTERPOL\Downloads\ad blocker
  ```
- Navigate to the same test page.
- Wait **5 seconds** for the content script to inject and the declarative rules to fire.
- Take a full-page screenshot.
- Save as `with-extension.png`.

### 3. Side-by-side composite
- Stitch the two screenshots into a **single horizontal image** (without-extension on the **left**, with-extension on the **right**).
- Add a visible label at the top of each half:
  - Left:  `❌ PopStop OFF`
  - Right: `✅ PopStop ON`
- Use a white background and black bold text for labels.
- If the images are very tall, you may scale them to a max height of **1200px** before stitching.

---

## Technical Hints

Use **Playwright** (preferred) or **Puppeteer** via Node.js.

### Playwright snippet (Chromium with extension)
```js
const { chromium } = require('playwright');
const path = require('path');

const extPath = 'C:\\Users\\INTERPOL\\Downloads\\ad blocker';

const context = await chromium.launchPersistentContext('', {
  headless: false, // Extensions require headful mode in Chromium
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
  ],
});

const page = await context.newPage();
await page.goto('https://canyoublockit.com/testing/');
await page.waitForTimeout(5000);
await page.screenshot({ path: 'with-extension.png', fullPage: true });
await context.close();
```

> **Note:** Playwright/Puppeteer on Windows may require `headless: false` (or `headless: 'new'` with special flags) for extensions to load. If headless causes issues, use `headless: false`.

### Image stitching (Node + sharp)
```js
const sharp = require('sharp');

const left  = await sharp('without-extension.png').resize(null, 1200).toBuffer();
const right = await sharp('with-extension.png').resize(null, 1200).toBuffer();

const { width: w1, height: h1 } = await sharp(left).metadata();
const { width: w2, height: h2 } = await sharp(right).metadata();

await sharp({
  create: {
    width: w1 + w2,
    height: Math.max(h1, h2) + 40,
    channels: 3,
    background: { r: 255, g: 255, b: 255 }
  }
})
.composite([
  { input: left,  left: 0, top: 40 },
  { input: right, left: w1, top: 40 }
])
.png()
.toFile('side-by-side.png');
```

If `sharp` is not available, install it: `npm install sharp`

---

## Acceptance Criteria
- [ ] `screenshots/` directory created.
- [ ] `without-extension.png` shows ads, banners, or popup scripts loading.
- [ ] `with-extension.png` shows the same page with ads/subresources blocked (empty ad boxes or missing banners) and no popup overlays active.
- [ ] `side-by-side.png` is a single image with both screenshots clearly labeled.
- [ ] If the page fails to load, fall back to `https://adblock-tester.com/` and document which URL was used.

---

## Safety
- Do NOT interact with suspicious ads (no clicking on actual ad banners).
- Only visit the two known test URLs listed above.
- Close all browser contexts when done.
