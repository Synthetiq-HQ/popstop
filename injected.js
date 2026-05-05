// injected.js — Runs in page context for overlay disabling and video detection.
// We do NOT override window.open, fetch, or XHR to avoid ad-blocker detection.

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Stealthy communication with content script via window.postMessage
  // Obfuscated format looks like generic analytics / heartbeat data
  // ---------------------------------------------------------------------------
  const REPORTED = new Set();
  function report(type, url, extra) {
    if (!url || typeof url !== 'string') return;
    const key = type + '|' + url;
    if (REPORTED.has(key)) return;
    REPORTED.add(key);
    try {
      window.postMessage({ t: 'hb', d: { u: url, m: type, e: extra } }, '*');
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Overlay disabling (listens for commands from content script)
  // ---------------------------------------------------------------------------
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.t !== 'cfg' || !event.data.d) return;
    try {
      disableOverlayBySelector(event.data.d.s, event.data.d.r);
    } catch (e) {}
  });

  function disableOverlayBySelector(selector, reason) {
    try {
      const el = document.querySelector(selector);
      if (!el) return;
      if (isImportantContent(el)) return;
      el.style.setProperty('pointer-events', 'none', 'important');
      console.log('[PopStop] Disabled overlay:', selector, 'Reason:', reason);
    } catch (e) {}
  }

  function isImportantContent(el) {
    const tag = el.tagName?.toLowerCase();
    if (['video', 'audio', 'canvas', 'svg', 'img', 'form', 'input', 'textarea', 'select', 'button', 'iframe'].includes(tag)) {
      return true;
    }
    const cls = (el.className || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const playerPattern = /player|video|stream|embed|media|plyr|jwplayer|html5-video|vjs-|dplayer|mejs|video-js|flowplayer/;
    if (playerPattern.test(cls) || playerPattern.test(id)) return true;
    if (el.querySelector && el.querySelector('video, audio, iframe')) return true;
    const style = window.getComputedStyle(el);
    const opacity = parseFloat(style.opacity) || 1;
    if (opacity > 0.3 && el.innerText?.trim().length > 50) return true;
    const role = el.getAttribute?.('role');
    if (role === 'dialog' || role === 'alertdialog' || role === 'main' || role === 'article') return true;
    return false;
  }

  // ---------------------------------------------------------------------------
  // Media URL detection helpers
  // ---------------------------------------------------------------------------
  const MEDIA_EXTS = /\.(mp4|webm|mkv|mov|avi|flv|ogv|m3u8|mpd|ts|aac|opus|wav|flac|mp3)(\?.*)?$/i;
  const MEDIA_PATTERNS = /(\/video\/|\/stream\/|\/manifest\/|\/playlist|video\.php|stream\.php|get_video|download_video|media_file)/i;

  function isMediaUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      const u = new URL(url, location.href);
      return MEDIA_EXTS.test(u.pathname) || MEDIA_PATTERNS.test(u.href);
    } catch {
      return MEDIA_EXTS.test(url) || MEDIA_PATTERNS.test(url);
    }
  }

  function scanVideoTags() {
    document.querySelectorAll('video').forEach(v => {
      if (v.src) report('video', v.src, { tag: 'video' });
      v.querySelectorAll('source').forEach(s => {
        if (s.src) report('source', s.src, { type: s.type || null });
      });
    });
    document.querySelectorAll('audio').forEach(a => {
      if (a.src) report('audio', a.src, { tag: 'audio' });
      a.querySelectorAll('source').forEach(s => {
        if (s.src) report('source', s.src, { type: s.type || null });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // PerformanceObserver — catches network requests without tampering fetch/XHR
  // ---------------------------------------------------------------------------
  function observeResources() {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (isMediaUrl(entry.name)) {
            report('performance', entry.name, { initiatorType: entry.initiatorType });
          }
        }
      });
      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {}

    try {
      const entries = performance.getEntriesByType('resource');
      for (const entry of entries) {
        if (isMediaUrl(entry.name)) {
          report('performance', entry.name, { initiatorType: entry.initiatorType });
        }
      }
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Initialise
  // ---------------------------------------------------------------------------
  function init() {
    scanVideoTags();
    observeResources();

    setInterval(scanVideoTags, 3000);

    const observer = new MutationObserver((mutations) => {
      let found = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
            found = true;
          } else if (node.querySelectorAll && node.querySelectorAll('video, audio').length > 0) {
            found = true;
          }
        }
      }
      if (found) scanVideoTags();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
