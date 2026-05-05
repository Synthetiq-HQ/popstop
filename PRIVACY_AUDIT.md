# Synthetiq PopStop — Privacy & Security Audit Report

**Date:** 2026-05-05  
**Auditor:** Automated code scan + manual review  
**Scope:** All files in the extension directory (`C:\Users\INTERPOL\Downloads\ad blocker\`)

---

## Executive Summary

| Category | Result |
|----------|--------|
| External data transmission | **NONE** — No network requests leave the browser |
| API keys / secrets | **NONE FOUND** |
| Analytics / telemetry | **NONE FOUND** |
| Hardcoded personal data | **NONE FOUND** |
| Cloud sync of user data | **NONE** — Uses `chrome.storage.local` only |
| Tracking / fingerprinting | **NONE FOUND** |
| Malicious code | **NONE FOUND** |
| **Critical finding** | `canyoublockit.html` must be removed from repo (see below) |

**Overall verdict:** The extension code itself is clean and privacy-respecting. However, one downloaded test artifact (`canyoublockit.html`) contains third-party tracking scripts and hashed personal data and should be deleted before publishing to GitHub.

---

## 1. Extension Code Audit (JS / JSON / HTML / CSS)

### 1.1 External Network Requests

**Finding: ZERO external network requests from extension code.**

Searched all `.js` files for:
- `fetch(` — **0 matches**
- `XMLHttpRequest` — **0 matches**
- `axios` / `request(` — **0 matches**
- Hardcoded `https?://` URLs in JS — **0 matches**

The extension never calls any external API, server, or third-party service. All functionality is self-contained.

### 1.2 API Keys, Tokens, Secrets

**Finding: NONE FOUND.**

Searched all `.js` files for patterns:
- `api_key`, `apikey`, `token`, `secret`, `password`, `bearer`, `private_key`, `access_token`, `client_id`, `client_secret`

Result: **0 matches** across all JS files.

### 1.3 Analytics, Telemetry, Tracking

**Finding: NONE FOUND.**

Searched for:
- `gtag`, `google.analytics`, `googletagmanager`, `fbq`, `mixpanel`, `amplitude`, `segment`, `telemetry`, `beacon`, `ping`, `tracking`

Result: **0 actual tracking code** found. The only matches were comments in `injected.js` describing the *obfuscated* `postMessage` format as looking like "generic analytics / heartbeat data" — this is an anti-detection privacy feature, not actual tracking.

### 1.4 Hardcoded Personal / Sensitive Data

**Finding: NONE FOUND.**

Searched for:
- Email addresses — **0 matches**
- IP addresses (`x.x.x.x` pattern) — **0 matches**
- Crypto wallet addresses (`0x...`) — **0 matches**
- Phone numbers — **0 matches**

### 1.5 Data Storage & Sync

| Storage API | Used? | Risk |
|-------------|-------|------|
| `chrome.storage.local` | ✅ Yes | **Low** — Data stays on local device only |
| `chrome.storage.sync` | ❌ No | N/A |
| `localStorage` | ❌ No | N/A |
| `sessionStorage` | ❌ No | N/A |
| `document.cookie` | ❌ No | N/A |
| `IndexedDB` | ❌ No | N/A |

All user data (settings, stats, allowlist, activity log) is stored in `chrome.storage.local`, which never leaves the device.

### 1.6 Clipboard Access

**Finding: User-initiated only.**

`navigator.clipboard.writeText()` is used in `popup.js` only when the user clicks:
- "Copy URL" button for HLS streams
- "Copy" button for direct video URLs

This requires the user to explicitly trigger the action. No automatic clipboard access.

### 1.7 Internal Communication (Data Flow)

The extension uses three internal channels. **None leave the browser.**

| Channel | Direction | Data Sent |
|---------|-----------|-----------|
| `chrome.runtime.sendMessage` | Content Script → Background | Click metadata (see §2) |
| `chrome.runtime.sendMessage` | Popup → Background | Settings updates, video download requests |
| `window.postMessage` | Injected Script ↔ Content Script | Media URLs, overlay selectors |

### 1.8 Manifest Permissions Review

```json
["tabs", "storage", "scripting", "webNavigation", "webRequest",
 "declarativeNetRequest", "activeTab", "downloads"]
```

| Permission | Purpose | Justified? |
|------------|---------|------------|
| `tabs` | Monitor tab creation, close suspicious tabs | ✅ Yes |
| `storage` | Save settings & stats locally | ✅ Yes |
| `scripting` | Inject toast notifications | ✅ Yes |
| `webNavigation` | Detect blank-tab redirects | ✅ Yes |
| `webRequest` | **Observation-only** for video URL detection | ✅ Yes (no blocking) |
| `declarativeNetRequest` | Block ad subresources at network level | ✅ Yes |
| `activeTab` | Access current tab for popup UI | ✅ Yes |
| `downloads` | User-initiated video downloads | ✅ Yes |
| `host_permissions: <all_urls>` | Block popups on any site | ✅ Required for functionality |

No excessive or unnecessary permissions.

---

## 2. Data Collected by the Extension

### 2.1 Click Tracking Payload

When you click on a page, `content.js` sends this to the background worker:

```javascript
{
  type: 'clickTracked',
  timestamp: 1714901234567,        // When the click happened
  url: 'https://example.com/page', // Current page URL
  referrer: 'https://google.com',  // Document referrer (may be null)
  coords: { x: 245, y: 387 },      // Click coordinates
  elementSummary: {
    tag: 'button',
    id: 'play-btn',
    class: 'btn primary large',
    href: null,
    role: null,
    type: null,
    hasOnClick: true
  },
  button: 0,                        // Left mouse button
  modifiers: {
    ctrlOrMeta: false,
    shift: false,
    alt: false,
    middleClick: false
  },
  intentional: true                 // Was it on an interactive element?
}
```

**Assessment:** This is functional metadata required for popup detection. No personally identifiable information is collected beyond what the browser already exposes to any webpage (URL, referrer). The data is held in memory for **2 seconds only**, then discarded.

### 2.2 Stored Data (chrome.storage.local)

| Key | Description | Sensitive? |
|-----|-------------|------------|
| `shieldEnabled` | Whether blocking is on/off | No |
| `mode` | "normal" or "aggressive" | No |
| `popupsKilledToday` | Daily counter | No |
| `totalPopupsKilled` | Lifetime counter | No |
| `allowedPopups` | Counter of allowed tabs | No |
| `lastResetDate` | ISO date string for daily reset | No |
| `allowlist` | Array of domain strings | Low — user-chosen sites |
| `debugMode` | Console logging toggle | No |
| `activityLog` | Last 100 blocked/allowed events | Low — includes URLs & scores |

**Note:** The activity log stores up to 100 recent events with the blocked/allowed URL, score, and reason. This is local-only and useful for debugging, but users should be aware it exists.

---

## 3. Test Files Audit

### 3.1 Local Test Pages (`test0.html` – `test5.html`, `test-canyoublockit.html`)

These files contain hardcoded URLs to well-known ad domains used for testing:
- `https://popads.net`
- `https://onclickads.net`
- `https://propellerads.com`
- `https://adnxs.com`
- `https://example.com`

Additionally, `test-canyoublockit.html` embeds a public sample video:
- `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`

**Assessment:** These are legitimate testing assets. The video is a widely-used public domain test file from Google's sample media collection. The ad domains are used solely to trigger the extension's blocking logic during manual testing.

### 3.2 ⚠️ CRITICAL: `canyoublockit.html`

**This file must be removed from the repository before publishing.**

`canyoublockit.html` is a **1 MB+ downloaded snapshot** of `https://canyoublockit.com/results/`. It contains:

| Issue | Details |
|-------|---------|
| **Third-party tracking scripts** | Google Analytics (`gtag/js`), Google Ads (`adsbygoogle.js`), Cloudflare Rocket Loader |
| **Third-party copyrighted content** | WordPress theme CSS, Elementor CSS, plugin assets — all copyrighted by their respective owners |
| **Potential personal data** | Gravatar URLs contain **MD5 hashes of commenter email addresses** (e.g., `gravatar.com/avatar/0c79cd78a680b9421d72cdd05f7a5dc6`) |
| **SessionStorage usage** | WordPress emoji support detection writes to `sessionStorage` |
| **Social media widgets** | Twitter, VKontakte, Odnoklassniki share buttons |
| **Bloat** | 1,098,032 bytes — not part of the extension |

**Recommendation:** Delete `canyoublockit.html` immediately. If you need to preserve analysis of the page, keep only a short text note describing the ad domains it uses, not the full HTML snapshot.

---

## 4. Binary Files (Icons)

| File | Size | Assessment |
|------|------|------------|
| `icons/icon16.png` | 149 bytes | Tiny generated icon. No EXIF/metadata risk. |
| `icons/icon48.png` | 254 bytes | Tiny generated icon. No EXIF/metadata risk. |
| `icons/icon128.png` | 548 bytes | Tiny generated icon. No EXIF/metadata risk. |

These files are too small to contain meaningful metadata. No privacy concern.

---

## 5. Recommendations

### Must Do (Before GitHub Publish)
1. **Delete `canyoublockit.html`** — Contains tracking scripts, copyrighted content, and hashed email addresses.
2. **Add `canyoublockit.html` to `.gitignore`** — Prevent accidental re-commit.

### Should Do (Nice to Have)
3. **Add a `PRIVACY.md` or privacy section to README** — Explicitly state what data is collected and where it is stored.
4. **Consider adding an "Export & Clear Activity Log" button** — Makes it easier for users to audit/delete their local data.
5. **Document the allowlist and activity log in README** — Users should know these exist in local storage.

### Optional Hardening
6. **Hash or truncate URLs in activity log** — If you want to be extra cautious, store only the domain + path hash instead of the full URL. (Not necessary for local-only storage, but increases privacy margin.)

---

## 6. Final Verdict

| Aspect | Rating |
|--------|--------|
| Extension code privacy | ✅ **EXCELLENT** — No external calls, no tracking, local-only storage |
| Permission minimization | ✅ **GOOD** — All permissions are justified |
| Data collection transparency | ⚠️ **FAIR** — Should document the activity log better |
| Repository cleanliness | ⚠️ **NEEDS FIX** — Remove `canyoublockit.html` |
| Overall trustworthiness | ✅ **HIGH** — Clean, self-contained, no data exfiltration |

**The extension does not spy on users, does not phone home, and does not collect sensitive data. Fix the one repository hygiene issue (`canyoublockit.html`) and it is ready for public release from a privacy standpoint.**
