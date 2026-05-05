// classifier.js — Shared popup classification logic for Synthetiq PopStop

export const SUSPICIOUS_DOMAINS = [
  'popads.net',
  'onclickads.net',
  'propellerads.com',
  'doubleclick.net',
  'googlesyndication.com',
  'taboola.com',
  'outbrain.com',
  'adnxs.com'
];

export const TRUSTED_DOMAINS = [
  'google.com',
  'youtube.com',
  'github.com',
  'stackoverflow.com',
  'wikipedia.org',
  'example.com'
];

export const POPUP_PATTERNS = [
  /pop/i,
  /ad[sv]?/i,
  /click/i,
  /redirect/i,
  /offer/i,
  /promo/i,
  /track/i,
  /affiliate/i
];

export function extractDomain(url) {
  try {
    if (!url || url === 'about:blank' || url.startsWith('javascript:')) return null;
    const u = new URL(url);
    if (u.protocol === 'file:') {
      // For local files, use the filename as the site identifier
      const parts = u.pathname.split('/');
      return parts.pop() || u.pathname;
    }
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function isSameDomain(a, b) {
  const da = extractDomain(a);
  const db = extractDomain(b);
  if (!da || !db) return false;
  return da === db;
}

export function isKnownSuspiciousDomain(url) {
  const domain = extractDomain(url);
  if (!domain) return false;
  return SUSPICIOUS_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
}

export function isTrustedDomain(url) {
  const domain = extractDomain(url);
  if (!domain) return false;
  return TRUSTED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
}

export function hasPopupPattern(url) {
  if (!url) return false;
  return POPUP_PATTERNS.some(p => p.test(url));
}

export function isBlankUrl(url) {
  if (!url) return true;
  const u = url.trim().toLowerCase();
  return u === '' || u === 'about:blank' || u === 'javascript:void(0)' || u === 'javascript:void(0);' || u === 'about:blank#';
}

export function isCloudflareChallenge(url, title) {
  if (!url) return false;
  const u = url.toLowerCase();
  const t = (title || '').toLowerCase();
  return u.includes('challenges.cloudflare.com') ||
         t.includes('checking your browser') ||
         t.includes('cf-browser-verification') ||
         t.includes('just a moment');
}

export function isInternalBrowserUrl(url) {
  if (!url) return true;
  const u = url.toLowerCase();
  return u.startsWith('chrome://') ||
         u.startsWith('chrome-extension://') ||
         u.startsWith('edge://') ||
         u.startsWith('about:newtab') ||
         u.startsWith('about:blank') ||
         u === 'about:blank';
}

/**
 * Classify a popup based on click session and new tab info.
 * @param {Object} session — click session from background.js
 * @param {Object} newTab — chrome.tabs.Tab object
 * @param {Object} settings — { shieldEnabled, mode, allowlist }
 * @param {number} burstCount — number of tabs opened from same session recently
 * @returns {Object} { suspicious, score, reasons }
 */
export function classifyPopup(session, newTab, settings, burstCount = 0) {
  const reasons = [];
  let score = 0;
  const mode = (settings.mode || 'normal').toLowerCase();
  const threshold = mode === 'aggressive' ? 20 : 40;

  // Hard allow conditions
  if (!settings.shieldEnabled) {
    return { suspicious: false, score: -100, reasons: ['Shield is disabled'] };
  }

  const sourceDomain = extractDomain(session?.url);
  const tabDomain = extractDomain(session?.tabUrl);
  const allowlist = settings.allowlist || [];
  if ((sourceDomain && allowlist.includes(sourceDomain)) || (tabDomain && allowlist.includes(tabDomain))) {
    return { suspicious: false, score: -100, reasons: ['Site is allowlisted'] };
  }

  if (session?.modifiers?.ctrlOrMeta || session?.modifiers?.middleClick) {
    return { suspicious: false, score: -100, reasons: ['User used Ctrl/Meta-click or middle-click'] };
  }

  if (isSameDomain(session?.url, newTab.url)) {
    return { suspicious: false, score: -50, reasons: ['Same domain'] };
  }

  if (isTrustedDomain(newTab.url)) {
    return { suspicious: false, score: -30, reasons: ['Trusted domain'] };
  }

  // Timing score
  if (session) {
    const elapsed = Date.now() - session.timestamp;
    if (elapsed <= 2000) {
      score += 30;
      reasons.push('Opened within 2 seconds of click');
    } else if (elapsed <= 5000) {
      score += 10;
      reasons.push('Opened within 5 seconds of click');
    }

    // Opener match
    if (newTab.openerTabId && newTab.openerTabId === session.tabId) {
      score += 20;
      reasons.push('Opener tab matches click tab');
    }

    // Intentionality
    if (!session.intentional) {
      score += 15;
      reasons.push('Click was not on a normal interactive element');
    } else {
      score -= 20;
      reasons.push('Click was on a normal interactive element');
    }

    // Burst detection
    if (burstCount > 1) {
      score += 15;
      reasons.push('Multiple tabs opened in short window');
    }
  }

  // Domain-based scoring
  if (!isSameDomain(session?.url, newTab.url)) {
    score += 20;
    reasons.push('Different domain from source');
  }

  if (isKnownSuspiciousDomain(newTab.url)) {
    score += 25;
    reasons.push('Known suspicious domain');
  }

  if (hasPopupPattern(newTab.url)) {
    score += 10;
    reasons.push('URL matches popup/ad pattern');
  }

  if (isBlankUrl(newTab.url)) {
    score += 10;
    reasons.push('Blank URL (likely redirect via script)');
  }

  // Cloudflare safety — never block challenge pages
  if (isCloudflareChallenge(newTab.url, newTab.title)) {
    score -= 200;
    reasons.push('Cloudflare challenge page — allowed');
  }

  const suspicious = score >= threshold;
  return { suspicious, score, reasons };
}
