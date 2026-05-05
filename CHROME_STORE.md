# Chrome Web Store Release Guide — Synthetiq PopStop

> Part of the [Synthetiq](https://github.com/Synthetiq-HQ) toolkit. Privacy-first. Local-first. Minimal dependencies.

---

## Pre-Flight Checklist

### Code & Assets

- [ ] `manifest.json` is valid JSON (check with `jsonlint` or Chrome)
- [ ] `manifest_version` is `3`
- [ ] Extension loads without errors in `chrome://extensions` → Developer Mode → Load Unpacked
- [ ] All referenced files exist (icons, HTML, CSS, JS, JSON)
- [ ] No `console.log` spam in production (set `debugMode: false` by default)
- [ ] No test artifacts in the package (`canyoublockit.html` is excluded)
- [ ] Version bumped in `manifest.json` (semantic versioning: `1.0.0`)

### Icons (Required)

| Size | File | Status |
|------|------|--------|
| 16×16 | `icons/icon16.png` | ✅ |
| 48×48 | `icons/icon48.png` | ✅ |
| 128×128 | `icons/icon128.png` | ✅ |

> **Tip:** Use a simple, recognizable icon. Chrome Web Store recommends no text in the 128×128 icon.

### Screenshots (Required: 1–5 images)

Take screenshots at **1280×800** or **640×400** (Chrome Web Store preferred sizes):

1. **Popup — Adblocker tab** showing Shield ON, stats, current site
2. **Popup — Downloads tab** showing detected videos (on a site with direct MP4s)
3. **Settings page** showing Dashboard with stat cards
4. **Settings page** showing Allowlist manager
5. **Settings page** showing Activity Log

> **Do NOT** screenshot YouTube, Netflix, or other protected platforms. Use a site with freely available direct video files (e.g., W3Schools HTML5 video examples, Internet Archive, or your own `test-canyoublockit.html`).

### Store Listing Copy

#### Title Options

**Option A — Personality brand (recommended for GitHub/organic growth):**
```
Synthetiq PopStop — Popup Blocker & Video Tools
```

**Option B — SEO-first (recommended for Chrome Web Store):**
```
Synthetiq PopStop — Popup & Redirect Blocker
```

**Option C — Hybrid (if you want Synthetiq brand + feature clarity):**
```
Synthetiq PopStop — Popup Blocker & Redirect Guard
```

> **Which one?** If your goal is pure downloads on the Chrome Web Store, go with **Option B**. If you want to build the PopStop brand independently, go with **Option A**. You can always rebrand later — Chrome Web Store allows name changes.

#### Short Description (max 132 chars)

**For Option A (PopStop):**
```
Stop annoying popups, redirects & click traps. Lightweight, private, and local. Optional video detection for supported sites.
```

**For Option B (Synthetiq PopStop):**
```
Block unwanted popups, redirects, and click traps. Lightweight privacy tool by Synthetiq. No ads, no tracking, 100% local.
```

#### Detailed Description (SEO-Optimized)

Use this exact template — it ranks for "popup blocker", "redirect blocker", "ad blocker", "click trap", and "overlay blocker" without making false claims:

```
Stop annoying popups, redirects, and click-trapping overlays with Synthetiq PopStop — a lightweight popup blocker and redirect guard that focuses on the part traditional ad blockers miss: malicious user-interaction traps.

WHY USERS LOVE IT
If you're tired of websites that open unwanted tabs, fake download buttons, or invisible overlays that hijack your clicks, this popup blocker is built for you. Unlike heavy traditional ad blockers, Synthetiq PopStop is fast, lightweight, and privacy-first.

HOW IT WORKS
• Click Tracking — Monitors your clicks in a 2-second window
• Smart Scoring — Detects suspicious popups based on timing, domain, and behavior
• Auto-Close — Instantly closes trap tabs and returns focus to your page
• Overlay Guard — Safely disables invisible click-hijacking layers
• Network Defense — Blocks known ad & popup domains at the browser level

KEY FEATURES
✓ Popup Blocker — Stops unwanted new tabs and redirects
✓ Redirect Guard — Detects blank-tab-then-redirect tricks
✓ Click Trap Protection — Finds and disables fake buttons & invisible overlays
✓ Shield Toggle — Turn protection on/off instantly from the toolbar
✓ Per-Site Allowlist — Never block sites you trust
✓ Local Stats — Track how many popups and redirects you've stopped
✓ Video Detection — Find direct video file links on supported sites
✓ Cloudflare Safe — Never interferes with security challenge pages
✓ Zero External Calls — Everything runs locally inside your browser

PRIVACY FIRST
• No analytics, no telemetry, no remote servers
• No data leaves your browser
• All settings and stats stored locally
• Open source — inspect the full code on GitHub
• By Synthetiq — a privacy-first, local-first software studio

WHAT IT IS NOT
This is a behavior-based popup blocker and redirect guard. It is NOT a full traditional ad blocker like uBlock Origin or AdGuard. It does not ship massive filter lists and does not do cosmetic element hiding. It specializes in stopping malicious user-interaction traps that other blockers let through.

VIDEO DOWNLOADS
The extension can detect direct video file URLs (.mp4, .webm, etc.) on sites that serve them openly. It does NOT support protected streaming platforms like YouTube, Netflix, TikTok, or Instagram — these use DRM and authenticated streams that browser extensions cannot bypass.

SUPPORT & SOURCE CODE
Report issues or suggest features: https://github.com/Synthetiq-HQ/PopStop-killer/issues
```

#### Category
**Privacy & Security** (preferred) or **Productivity**

#### Tags / Keywords (if the store allows them)
```
popup blocker, redirect blocker, ad blocker, click trap, overlay blocker, anti redirect, tab blocker, privacy tool, video downloader, lightweight blocker
```

#### Category
**Productivity** or **Privacy & Security**

#### Language
English (primary)

### Required Links

| Item | URL |
|------|-----|
| Privacy Policy | Link to `PRIVACY_POLICY.md` in your repo (or host on GitHub Pages) |
| Support / Contact | `https://github.com/Synthetiq-HQ/PopStop-killer/issues` |
| Website | `https://github.com/Synthetiq-HQ/PopStop-killer` |

---

## Developer Account Setup

1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with a Google account
3. Pay the **one-time $5 registration fee**
4. Fill in developer info (name, address, contact)

---

## Upload & Submit

1. **Zip the extension folder**
   ```bash
   # Exclude non-extension files
   zip -r PopStop-killer-v1.0.0.zip \
     manifest.json background.js classifier.js content.js injected.js \
     popup.html popup.js popup.css \
     options.html options.js options.css \
     rules.json icons/ \
     -x "*.md" -x "test*.html" -x ".git*" -x "canyoublockit.html"
   ```

2. **Upload to Chrome Web Store**
   - Chrome Developer Dashboard → "New Item"
   - Upload the `.zip` file
   - Fill in store listing (title, description, screenshots, icons)
   - Add privacy policy URL
   - Select pricing: **Free**
   - Select visibility: **Public**

3. **Compliance Checklist**
   - [ ] No misleading claims ("blocks all ads", "unblockable")
   - [ ] No copyrighted bypass tools promoted
   - [ ] Privacy policy is accessible and accurate
   - [ ] Permissions are justified and minimal
   - [ ] No remote code execution
   - [ ] No obfuscated code (our code is readable and open-source)

4. **Submit for Review**
   - Click "Submit for Review"
   - Typical review time: **hours to 3 business days**
   - You will receive email notification of approval or rejection

---

## Post-Release

### Announcement Channels

| Channel | Post Type |
|---------|-----------|
| GitHub Releases | Create a release with changelog |
| LinkedIn | See framing guide below |
| Twitter/X | Short thread with GIF demo |
| Reddit (r/chrome_extensions, r/browsers) | Announcement post |
| Product Hunt | Launch page |

### LinkedIn Post Framing

**Hook:**
> Most ad blockers still let annoying click traps and fake redirects through.

**What you built:**
> I built Synthetiq PopStop to solve that specific problem.

**What it does:**
> • Blocks unwanted redirects & popup traps
> • Disables misleading click behaviour & invisible overlays
> • Adds cleaner browsing with optional video tools
> • Runs 100% locally — zero external calls

**Honest positioning:**
> It’s not trying to replace tools like AdGuard or uBlock Origin. It focuses on the part most blockers ignore: interaction traps.

**Closing:**
> Building this into a full browsing toolkit next. Try it free on the Chrome Web Store.

---

## Version History Template

Keep this in `CHANGELOG.md`:

```markdown
## [1.0.0] — 2026-05-05
### Added
- Initial release
- Smart popup classification with scoring
- Overlay detection & safe disabling
- Shield toggle + Normal/Aggressive modes
- Per-site allowlist
- Local stats & activity log
- Video detection for direct file URLs
- Import/Export settings
```

---

## Troubleshooting Common Rejections

| Rejection Reason | Fix |
|------------------|-----|
| "Privacy policy missing" | Host `PRIVACY_POLICY.md` on GitHub Pages or link raw GitHub URL |
| "Excessive permissions" | Document each permission in the privacy policy |
| "Remote code" | Ensure no `<script src="...">` loads external JS at runtime |
| "Misleading claims" | Remove words like "all ads", "unblockable", "any video" from description |
| "Minified code" | Ensure source code is readable; we use no minification |
| "Missing screenshots" | Upload at least 1 screenshot at 1280×800 |

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Chrome Developer Dashboard | https://chrome.google.com/webstore/devconsole |
| Manifest V3 docs | https://developer.chrome.com/docs/extensions/mv3/ |
| Store listing guidelines | https://developer.chrome.com/docs/webstore/publish/ |
| Privacy policy requirements | https://developer.chrome.com/docs/webstore/program_policies/ |
