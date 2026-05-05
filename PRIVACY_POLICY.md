# Privacy Policy — Synthetiq PopStop

**Effective Date:** May 5, 2026  
**Developer:** Synthetiq (https://github.com/Synthetiq-HQ)  
**Contact:** Open an issue at https://github.com/Synthetiq-HQ/PopStop-killer/issues

---

## 1. Overview

Synthetiq PopStop is a browser extension that blocks unwanted popups, redirects, and click-trapping overlays. This privacy policy explains what data the extension collects, how it is used, and where it is stored.

**Core principle:** Everything stays on your device. No data is transmitted to external servers.

---

## 2. Data We Collect

### 2.1 Click Session Data (Temporary, In-Memory Only)

When you click on a webpage, the extension temporarily records:

- **Timestamp** — when the click occurred
- **Page URL** — the address of the page you are on
- **Referrer** — the page you came from (if available)
- **Click coordinates** — X and Y position of the click
- **Element summary** — tag name (e.g., `button`, `a`), class names, ID, and whether the element has an `onclick` handler
- **Mouse button and modifier keys** — left/right/middle click, Ctrl, Shift, Alt
- **Intentionality flag** — whether the click was on a recognized interactive element

**Retention:** This data is held in memory for **2 seconds** and then automatically discarded. It is never written to disk or sent anywhere.

**Purpose:** To determine whether a newly opened tab is a suspicious popup or a legitimate user action.

### 2.2 Local Storage Data (Persistent on Your Device)

The extension stores the following in `chrome.storage.local` (your browser's local storage only):

| Data | Purpose |
|------|---------|
| `shieldEnabled` | Whether blocking is turned on or off |
| `mode` | "normal" or "aggressive" blocking mode |
| `popupsKilledToday` | Daily count of blocked popups |
| `totalPopupsKilled` | Lifetime count of blocked popups |
| `allowedPopups` | Count of popups that were allowed |
| `lastResetDate` | Date of last daily stat reset |
| `allowlist` | List of websites you have chosen to allow |
| `debugMode` | Whether verbose console logging is enabled |
| `activityLog` | Last 100 blocked/allowed events (URL, score, reason) |

**Sync:** We use `chrome.storage.local`, **not** `chrome.storage.sync`. This means your data never leaves your device and is not synced to Google servers or other devices.

---

## 3. Data We Do NOT Collect

We do **not** collect, store, or transmit:

- Your browsing history
- Passwords, login credentials, or form data
- Credit card or payment information
- Personal identifiers (name, email, phone number)
- Location data
- Device fingerprinting data
- Analytics or telemetry
- Crash reports to external services

---

## 4. Network Activity

The extension does **not** make any external network requests. Specifically:

- No `fetch()` calls to remote servers
- No `XMLHttpRequest` to external APIs
- No analytics pixels or tracking beacons
- No cloud backup or sync services

The only network-related functionality is:
- **DeclarativeNetRequest** — Chrome's built-in API for blocking known ad domains at the network level (handled entirely by the browser)
- **chrome.downloads.download()** — Only triggered when you explicitly click "Download" on a detected video URL

---

## 5. Permissions Justification

| Permission | Why It Is Needed |
|------------|------------------|
| `tabs` | Detect and close suspicious newly opened tabs |
| `storage` | Save your settings and statistics locally |
| `scripting` | Show toast notifications on web pages |
| `webNavigation` | Detect blank-tab redirect patterns used by popups |
| `webRequest` | **Observation-only** — detect video URLs for the download feature |
| `declarativeNetRequest` | Block ad subresources from known bad domains |
| `activeTab` | Read the current page for the popup UI |
| `downloads` | Allow you to save detected video files (only when you click Download) |
| `<all_urls>` | Block popups and overlays on any website you visit |

---

## 6. Third-Party Services

We do **not** integrate with any third-party services, APIs, or SDKs. The extension is entirely self-contained.

---

## 7. Your Rights & Control

You have full control over your data:

- **View:** Open the extension's Settings page to see your stats and activity log
- **Export:** Use the "Export to JSON" button in Settings to download all your data
- **Delete:** Use the "Reset All Data" button in Settings to permanently erase everything
- **Disable:** Toggle the Shield OFF in the popup to stop all blocking
- **Allowlist:** Add any site to the allowlist to exempt it from blocking

---

## 8. Changes to This Policy

If we make material changes to this privacy policy, we will update the effective date and notify users via the extension's release notes on GitHub.

---

## 9. Open Source

Synthetiq PopStop is open-source software. You can inspect the full source code at:  
**https://github.com/Synthetiq-HQ/PopStop-killer**

---

## 10. Contact

For privacy questions or concerns, please open an issue on our GitHub repository:  
**https://github.com/Synthetiq-HQ/PopStop-killer/issues**
