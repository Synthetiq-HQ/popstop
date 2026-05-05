# Stitch Prompt — Synthetiq PopStop Chrome Extension UI

Generate the complete HTML/CSS/JS UI for a Chrome Manifest V3 browser extension called **Synthetiq PopStop**.

---

## What the Extension Does

Synthetiq PopStop is a **behavior-based popup and redirect blocker**. It stops malicious popups, click-trapping overlays, and unwanted new-tab redirects by monitoring user clicks and scoring newly opened tabs for suspicious behavior.

### Core Features
- Tracks clicks in a 2-second window
- Scores new tabs based on timing, domain, URL patterns, and user intentionality
- Automatically closes suspicious tabs and refocuses the original tab
- Shows a toast notification when a popup is killed
- Detects and disables invisible overlay traps (sets `pointer-events: none`)
- Blocks known ad domains via Chrome's DeclarativeNetRequest API
- Detects direct video file URLs on supported sites (MP4, WebM, etc.)
- Shield ON/OFF toggle + Normal/Aggressive modes
- Per-site allowlist
- Local statistics and activity log

### What It Does NOT Do
- It is NOT a full traditional ad blocker (no EasyList, no cosmetic filtering)
- It does NOT bypass DRM or download from YouTube, Netflix, TikTok, etc.
- It does NOT collect or transmit any data externally — everything is local

---

## UI Requirements

### 1. Browser Action Popup (`popup.html`)

**Dimensions:** 360px wide, auto-height, scrollable if content exceeds viewport.

**Header Bar**
- Dark blue background (#1a237e)
- White text: "Synthetiq PopStop" (left) + "v1.0" (right, smaller, faded)

**Tab Switcher**
- Two tabs: "Adblocker" | "Downloads"
- Active tab has a blue underline (#1a237e), inactive tabs are gray
- Clicking switches content below

**Adblocker Tab Content**
1. **Shield Toggle Row**
   - Label: "Shield" on the left
   - Toggle switch (green when ON #2e7d32, gray when OFF)
   - Status text below: "ON" or "OFF" in matching color

2. **Mode Selector Row**
   - Label: "Mode" on the left
   - Dropdown select: "Normal" | "Aggressive"
   - Small hint text: "Aggressive closes more popups but may produce false positives."

3. **Stats Grid (4 cards in a row)**
   - "Killed today" — number
   - "Total killed" — number
   - "Popups allowed" — number
   - "Sites allowlisted" — number
   - Cards: light gray background (#f1f3f4), rounded corners, centered text

4. **Current Site Row**
   - Label: "Current site"
   - Domain text (truncated with ellipsis if too long)
   - Button: "Allowlist this site" (toggles to "Remove from allowlist" if already allowlisted)
   - Small message area for confirmation ("Added example.com to allowlist")

5. **Action Buttons**
   - "Reset stats" — red danger style
   - "Open Settings" — secondary style

**Downloads Tab Content**
- Initially shows: "Scanning for videos..."
- If no videos: "No videos detected yet. Try playing the video first, then reopen this tab."
- If videos found: scrollable list of video cards

**Video Card Design**
- Light gray background (#f1f3f4), rounded corners, padding 10px
- Title: bold, 12px, dark text, word-break on long URLs
- Meta row: format badge (e.g., "MP4", "HLS Stream", "Protected") + optional quality badge ("1080P", "720P")
  - Stream badge: orange background (#fff3e0), orange text (#ef6c00)
  - Quality badge: green background (#e8f5e9), green text (#2e7d32)
- URL: 10px gray text, single line, ellipsis overflow
- Actions:
  - "Download" button (green #2e7d32) for direct files
  - "Copy URL" button (light blue #e8eaf6, dark blue text) for streams/protected URLs
  - For protected URLs (YouTube, etc.): show red warning text "This site uses protected streaming. Use an external downloader."

---

### 2. Settings / Options Page (`options.html`)

**Layout:** Full-page, not a popup. Sidebar on the left (~220px), main content on the right.

**Sidebar**
- Brand header: "Synthetiq PopStop" + "v1.0"
- Navigation links:
  - Dashboard
  - Allowlist
  - Activity Log
  - Settings
  - Data & Backup
- Active link highlighted with blue left border and light blue background

**Dashboard Section (default view)**
- 4 stat cards in a grid:
  - "Popups Killed Today"
  - "Total Killed"
  - "Popups Allowed"
  - "Sites Allowlisted"
- Each card: white background, shadow, large number, label below
- Panel: "Shield Status" — toggle switch + text "Shield is ON/OFF"
- Panel: "Current Mode" — dropdown "Normal (threshold 40)" | "Aggressive (threshold 20)"

**Allowlist Section**
- Description text explaining what the allowlist does
- Toolbar: text input (placeholder: "example.com") + "Add Site" button (primary blue) + "Clear All" button (red danger)
- Table of allowlisted sites:
  - Columns: # | Domain | Actions
  - Each row has a "Remove" button (small, red)
  - Empty state: "No sites in allowlist."

**Activity Log Section**
- Description: "Recent popup blocking and allowing activity. Up to 100 entries are kept."
- "Clear Log" button (red danger)
- Table:
  - Columns: Time | Action | Domain / URL | Score | Reasons
  - Action badge: green "allowed" or red "blocked"
  - Score: numeric value
  - Reasons: comma-separated list
  - Empty state: "No activity recorded yet."

**Settings Section**
- Setting rows with toggle switches:
  - Shield — "Master ON/OFF switch for popup blocking"
  - Mode — "Normal (score ≥ 40) or Aggressive (score ≥ 20)"
  - Debug Mode — "Log detailed info to the service worker console"
- Each row: label + description on the left, toggle/select on the right

**Data & Backup Section**
- Panel 1: "Export Settings" — description + "Export to JSON" button (primary)
- Panel 2: "Import Settings" — description + file input + "Import from JSON" button (primary) + message area for success/error
- Panel 3: "Reset Everything" — red danger panel — description + "Reset All Data" button (red)

---

## Design System

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | #1a237e | Header, active states, links |
| Primary Light | #e8eaf6 | Buttons, badges, backgrounds |
| Success | #2e7d32 | Shield ON, download buttons, allowed badge |
| Success Light | #e8f5e9 | Quality badges |
| Danger | #c62828 | Reset buttons, blocked badge, warnings |
| Danger Light | #ffebee | Danger button backgrounds |
| Warning | #ef6c00 | Stream badges |
| Warning Light | #fff3e0 | Stream badge backgrounds |
| Background | #f8f9fa | Page background |
| Card BG | #f1f3f4 | Video items, stat cards |
| Text Primary | #333 | Headings |
| Text Secondary | #666 | Labels, hints |
| Border | #e0e0e0 | Dividers |

### Typography
- Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Base size: 14px
- Header: 16px bold
- Labels: 13px medium weight
- Stats: 18px bold
- Badges: 10px uppercase bold

### Components
- **Toggle switch**: 44px wide × 24px tall, circular knob, smooth transition
- **Buttons**: rounded 6px, padding 10px 16px, hover darken effect
- **Cards**: rounded 6px, subtle shadow or light background
- **Tables**: clean, striped optional, action buttons in last column
- **Inputs**: rounded 4px, 1px border #ccc, focus border #1a237e

---

## Technical Constraints

- **Manifest V3** Chrome extension
- **No external dependencies** — pure HTML/CSS/JS, no frameworks, no CDNs
- **No build step** — files loaded directly as unpacked extension
- **Chrome APIs used:**
  - `chrome.storage.local.get()` / `.set()`
  - `chrome.tabs.query()`
  - `chrome.runtime.sendMessage()` / `onMessage`
  - `chrome.runtime.openOptionsPage()`
  - `chrome.webNavigation.getAllFrames()`
  - `chrome.downloads.download()` (in background)
- **Popup** communicates with **Background Service Worker** via messaging
- **Options page** reads/writes settings directly via `chrome.storage.local`

---

## Output Format

Generate two separate files:

1. **`popup.html`** + **`popup.css`** + **`popup.js`** — The 360px browser action popup
2. **`options.html`** + **`options.css`** + **`options.js`** — The full-page settings interface

Make the code clean, well-commented, and fully functional with mock data where needed for preview purposes.
