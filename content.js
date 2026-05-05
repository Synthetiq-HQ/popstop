// content.js — Click tracking, toast, overlay detection for Synthetiq PopStop

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Debug helper
  // ---------------------------------------------------------------------------
  let debugMode = false;
  function log(...args) {
    if (debugMode) console.log('[PopStop Content]', ...args);
  }

  // Load debug mode and allowlist from storage, then attach click listeners
  let siteAllowlisted = false;

  function attachClickListeners() {
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('click', handleClick, true);
    log('Synthetiq PopStop content script loaded');
  }

  chrome.storage.local.get(['debugMode', 'allowlist']).then(r => {
    debugMode = !!r.debugMode;
    const allowlist = r.allowlist || [];
    let domain = '';
    try {
      const u = new URL(location.href);
      if (u.protocol === 'file:') {
        const parts = u.pathname.split('/');
        domain = parts.pop() || u.pathname;
      } else {
        domain = u.hostname.toLowerCase().replace(/^www\./, '');
      }
    } catch {
      domain = location.hostname || '';
    }
    siteAllowlisted = allowlist.includes(domain);
    if (siteAllowlisted) log('Site is allowlisted — skipping aggressive overlay detection');
    attachClickListeners();
  });

  // ---------------------------------------------------------------------------
  // Cloudflare safe mode detection
  // ---------------------------------------------------------------------------
  function isCloudflarePage() {
    const hostname = location.hostname.toLowerCase();
    const title = document.title.toLowerCase();
    const bodyText = (document.body?.innerText || '').slice(0, 500).toLowerCase();
    return hostname.includes('challenges.cloudflare.com') ||
           title.includes('checking your browser') ||
           title.includes('just a moment') ||
           title.includes('cf-browser-verification') ||
           bodyText.includes('checking your browser') ||
           bodyText.includes('cf-browser-verification');
  }

  // ---------------------------------------------------------------------------
  // Video player detection helpers
  // ---------------------------------------------------------------------------
  const PLAYER_PATTERN = /player|video|stream|embed|media|plyr|jwplayer|html5-video|vjs-|dplayer|mejs|video-js|flowplayer/;

  function isVideoPlayerElement(el) {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    if (['video', 'audio', 'iframe'].includes(tag)) return true;

    const cls = (el.className || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    if (PLAYER_PATTERN.test(cls) || PLAYER_PATTERN.test(id)) return true;

    if (el.querySelector) {
      const hasVideo = el.querySelector('video, audio, iframe[src*="player"], iframe[src*="stream"], iframe[src*="embed"]');
      if (hasVideo) return true;
    }

    if (el.closest) {
      const inMedia = el.closest('video, audio, iframe');
      if (inMedia) return true;
    }

    return false;
  }

  function isInsideVideoPlayer(el) {
    if (!el) return false;
    if (isVideoPlayerElement(el)) return true;
    if (el.closest) {
      const container = el.closest('[class*="player"], [class*="video"], [class*="stream"], [id*="player"], [id*="video"], [id*="stream"]');
      if (container) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Click tracking
  // ---------------------------------------------------------------------------
  function summarizeElement(el) {
    if (!el) return null;
    return {
      tag: el.tagName?.toLowerCase(),
      id: el.id || null,
      class: (el.className && typeof el.className === 'string') ? el.className.split(/\s+/).slice(0, 3).join(' ') : null,
      href: el.href || null,
      role: el.getAttribute?.('role') || null,
      type: el.type || null,
      hasOnClick: el.onclick !== null || el.hasAttribute?.('onclick')
    };
  }

  function isIntentionalClick(el) {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag === 'a' && el.href) return true;
    if (tag === 'button') return true;
    if (tag === 'input' && ['button', 'submit', 'reset', 'image'].includes(el.type)) return true;
    if (tag === 'video' || tag === 'audio') return true;
    if (el.hasAttribute?.('onclick')) return true;
    if (el.closest?.('a[href], button, input[type="button"], input[type="submit"], video, audio')) return true;
    return false;
  }

  function handleMouseDown(e) {
    if (isCloudflarePage() || siteAllowlisted) return;

    const el = e.target;
    if (isInsideVideoPlayer(el)) {
      log('Click inside video player — skipping overlay detection');
      return;
    }

    const summary = summarizeElement(el);
    const intentional = isIntentionalClick(el);

    const payload = {
      type: 'clickTracked',
      timestamp: Date.now(),
      url: location.href,
      referrer: document.referrer || null,
      coords: { x: e.clientX, y: e.clientY },
      elementSummary: summary,
      button: e.button,
      modifiers: {
        ctrlOrMeta: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
        middleClick: e.button === 1
      },
      intentional
    };

    chrome.runtime.sendMessage(payload).catch(() => {});
  }

  function handleClick(e) {
    if (isCloudflarePage() || siteAllowlisted) return;

    const el = e.target;
    if (isInsideVideoPlayer(el)) {
      log('Click inside video player — skipping overlay detection');
      return;
    }

    detectOverlays(e.clientX, e.clientY);
  }

  // ---------------------------------------------------------------------------
  // Overlay detection
  // ---------------------------------------------------------------------------
  function detectOverlays(x, y) {
    try {
      const elements = document.elementsFromPoint(x, y);
      if (!elements || elements.length === 0) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      for (const el of elements) {
        if (el === document.documentElement || el === document.body) continue;

        if (isVideoPlayerElement(el)) {
          log('Skipping video player element:', el.tagName);
          continue;
        }

        if (el.querySelector && el.querySelector('video, audio, iframe')) {
          log('Skipping element containing media/iframe');
          continue;
        }

        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        const isFixed = style.position === 'fixed';
        const isAbsolute = style.position === 'absolute';
        const zIndex = parseInt(style.zIndex, 10) || 0;
        const opacity = parseFloat(style.opacity) || 1;
        const pointerEvents = style.pointerEvents !== 'none';
        const coversViewport = rect.width >= viewportWidth * 0.8 && rect.height >= viewportHeight * 0.8;
        const largeSize = rect.width > 300 && rect.height > 300;
        const isInvisible = opacity < 0.1;
        const isIframe = el.tagName?.toLowerCase() === 'iframe';

        const suspiciousScore = [
          isFixed || isAbsolute ? 1 : 0,
          zIndex > 1000 ? 1 : 0,
          isInvisible ? 1 : 0,
          coversViewport ? 1 : 0,
          largeSize ? 1 : 0,
          isIframe ? 1 : 0,
          pointerEvents ? 1 : 0
        ].reduce((a, b) => a + b, 0);

        if (suspiciousScore >= 5) {
          log('Suspicious overlay detected:', el, 'score:', suspiciousScore);

          if (isLegitimateContent(el)) {
            log('Overlay looks legitimate, skipping');
            continue;
          }

          window.postMessage({ t: 'cfg', d: { s: generateSelector(el), r: 'suspicious_overlay' } }, '*');

          try {
            el.style.setProperty('pointer-events', 'none', 'important');
            log('Disabled overlay inline:', el);
          } catch (e) {}
        }
      }
    } catch (err) {
      log('Overlay detection error:', err);
    }
  }

  function isLegitimateContent(el) {
    const tag = el.tagName?.toLowerCase();
    if (['video', 'audio', 'canvas', 'svg', 'img', 'iframe'].includes(tag)) return true;

    const role = el.getAttribute?.('role');
    if (role === 'dialog' || role === 'alertdialog') return true;

    const cls = (el.className || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    if (PLAYER_PATTERN.test(cls) || PLAYER_PATTERN.test(id)) return true;

    const style = window.getComputedStyle(el);
    if (parseFloat(style.opacity) > 0.5 && el.innerText?.trim().length > 20) return true;

    return false;
  }

  function generateSelector(el) {
    if (!el) return '';
    if (el.id) return '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      const cls = el.className.split(/\s+/).filter(c => c).join('.');
      if (cls) return el.tagName.toLowerCase() + '.' + cls;
    }
    let path = el.tagName.toLowerCase();
    if (el.parentElement) {
      const siblings = Array.from(el.parentElement.children).filter(c => c.tagName === el.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        path += `:nth-of-type(${index})`;
      }
      path = generateSelector(el.parentElement) + ' > ' + path;
    }
    return path;
  }

  // ---------------------------------------------------------------------------
  // Toast notification
  // ---------------------------------------------------------------------------
  function showToast(domain) {
    if (!document.body) return;
    const existing = document.getElementById('PopStop-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'PopStop-toast';
    toast.textContent = `Popup killed: ${domain}`;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #d32f2f;
      color: white;
      padding: 12px 18px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      max-width: 300px;
      line-height: 1.4;
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ---------------------------------------------------------------------------
  // Video detection from injected.js
  // ---------------------------------------------------------------------------
  const detectedVideos = new Map();

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.t !== 'hb' || !event.data.d) return;
    try {
      const { u, m, e } = event.data.d;
      if (!u) return;
      detectedVideos.set(u, { type: m, url: u, extra: e, timestamp: Date.now() });
      log('Media detected:', m, u);
    } catch (e) {}
  });

  function scanVideoTagsDirect() {
    document.querySelectorAll('video').forEach(v => {
      if (v.src) detectedVideos.set(v.src, { type: 'video', url: v.src, extra: { tag: 'video' } });
      v.querySelectorAll('source').forEach(s => {
        if (s.src) detectedVideos.set(s.src, { type: 'source', url: s.src, extra: { type: s.type || null } });
      });
    });
  }
  setInterval(scanVideoTagsDirect, 3000);
  scanVideoTagsDirect();

  // ---------------------------------------------------------------------------
  // Message handlers
  // ---------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'showToast') {
      showToast(message.domain || 'unknown');
      sendResponse({ ok: true });
    }
    if (message.type === 'getVideos') {
      scanVideoTagsDirect();
      const videos = Array.from(detectedVideos.values());
      sendResponse({ videos });
    }
    return true;
  });

  // ---------------------------------------------------------------------------
  // Inject injected.js into page context
  // ---------------------------------------------------------------------------
  (function injectScript() {
    if (document.getElementById('PopStop-injected-script')) return;
    const script = document.createElement('script');
    script.id = 'PopStop-injected-script';
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  })();

})();
