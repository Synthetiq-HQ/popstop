# Publish Guide — Synthetiq PopStop v1.0.0

Everything is ready. Follow these exact steps to publish to GitHub and prepare for Chrome Web Store.

---

## Step 1: Publish to GitHub (Synthetiq-HQ)

Open PowerShell or Git Bash on your PC and run these commands exactly:

```bash
# Navigate to the project folder
cd "C:\Users\INTERPOL\Downloads\ad blocker"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit with the release message
git commit -m "feat: release Synthetiq PopStop v1.0.0

- Smart popup & redirect blocker
- Behavior-based scoring with Normal/Aggressive modes
- Overlay detection & safe disabling
- Per-site allowlist
- Local stats & activity log
- Video detection for direct file URLs
- Privacy-first: zero external calls
- Chrome Manifest V3"

# Add the Synthetiq-HQ remote (if not already added)
# If the repo doesn't exist yet, create it first at:
# https://github.com/organizations/Synthetiq-HQ/repositories/new
# Name: popstop
# Visibility: Public
# Then run:
git remote add origin https://github.com/Synthetiq-HQ/popstop.git

# Push to main
git branch -M main
git push -u origin main
```

**If the repo already exists** and you just need to update it:

```bash
cd "C:\Users\INTERPOL\Downloads\ad blocker"
git add .
git commit -m "release: v1.0.0 Synthetiq PopStop"
git push origin main
```

---

## Step 2: Create GitHub Release

1. Go to https://github.com/Synthetiq-HQ/popstop/releases
2. Click **"Draft a new release"**
3. Click **"Choose a tag"** → type `v1.0.0` → **"Create new tag: v1.0.0"**
4. Release title: `Synthetiq PopStop v1.0.0 — The Popup Blackout`
5. Description (copy-paste this):

```markdown
## Synthetiq PopStop v1.0.0

**The Popup Blackout for Your Browser.**

Stop annoying popups, malicious redirects, and invisible click-trapping overlays.

### What's Included
- Smart popup classification with suspicion scoring
- Automatic tab closure for suspicious popups
- Toast notifications on blocked domains
- Overlay detection & safe disabling
- Shield ON/OFF toggle
- Normal / Aggressive blocking modes
- Per-site allowlist
- Local statistics & activity log
- Video detection for direct file URLs
- Cloudflare safe mode
- Zero external calls — 100% local

### Installation
1. Download `popstop-v1.0.0.zip` from this release
2. Open Chrome → `chrome://extensions`
3. Enable Developer mode
4. Click "Load unpacked"
5. Select the extracted folder

### Chrome Web Store
Coming soon. Track progress in #1.

---
Built with 💜 by [Synthetiq](https://github.com/Synthetiq-HQ)
```

6. Attach the zip file: **Upload `C:\Users\INTERPOL\Downloads\popstop-v1.0.0.zip`**
7. Check **"Set as the latest release"**
8. Click **"Publish release"**

---

## Step 3: Chrome Web Store (Optional — Do This After GitHub)

1. Go to https://chrome.google.com/webstore/devconsole
2. Pay the **$5 one-time developer fee** if you haven't already
3. Click **"New Item"**
4. Upload `C:\Users\INTERPOL\Downloads\popstop-v1.0.0.zip`
5. Fill in store listing using the copy in [`CHROME_STORE.md`](./CHROME_STORE.md)
6. Add privacy policy URL: `https://github.com/Synthetiq-HQ/popstop/blob/main/PRIVACY_POLICY.md`
7. Submit for review

---

## File Reference

| File | Purpose |
|------|---------|
| `popstop-v1.0.0.zip` | Clean extension package (26KB) — upload this to Chrome Web Store |
| `C:\Users\INTERPOL\Downloads\ad blocker\` | Full project folder with docs, tests, source — push this to GitHub |

---

## Quick Check Before Publishing

- [ ] `manifest.json` name says "Synthetiq PopStop"
- [ ] Version is `1.0.0`
- [ ] All JS files pass syntax check
- [ ] `manifest.json` is valid JSON
- [ ] `popstop-v1.0.0.zip` contains only extension files (no tests, no docs)
- [ ] GitHub repo `Synthetiq-HQ/popstop` is created
- [ ] You have the $5 Chrome Web Store fee ready (if publishing to store)
