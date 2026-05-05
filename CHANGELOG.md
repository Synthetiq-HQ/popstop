# Changelog

All notable changes to Synthetiq PopStop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-05-05

### Added
- Initial release of Synthetiq PopStop
- Smart popup classification with configurable suspicion scoring
- Automatic tab closure for suspicious popups with focus restoration
- Toast notifications showing blocked domain
- Overlay detection that safely disables invisible click-trapping layers
- Shield ON/OFF toggle
- Normal (threshold 40) and Aggressive (threshold 20) modes
- Per-site allowlist managed from popup and settings
- Local statistics (killed today, total killed, allowed)
- Activity log (last 100 events) with full settings page viewer
- Cloudflare safe mode — never blocks challenge pages
- DeclarativeNetRequest rules for known bad domains
- Video detection for direct file URLs (MP4, WebM, etc.)
- Protected platform detection — shows warning for YouTube, Netflix, TikTok, etc.
- Import/Export settings via JSON
- Full settings page with Dashboard, Allowlist, Activity Log, and Data & Backup sections
- Privacy-first architecture — zero external network calls
- Complete test suite (`test0.html` through `test5.html` + `test-canyoublockit.html`)
