// background.js — Service Worker for Synthetiq PopStop

import {
  classifyPopup,
  extractDomain,
  isKnownSuspiciousDomain,
  isInternalBrowserUrl
} from './classifier.js';

// In-memory click sessions (2-second window)
const CLICK_WINDOW_MS = 2000;
const clickSessions = [];

// Track tabs created in quick succession from the same session
const tabBurstTracker = new Map(); // tabId -> count

// Default settings
const DEFAULT_SETTINGS = {
  shieldEnabled: true,
  mode: 'normal',
  popupsKilledToday: 0,
  totalPopupsKilled: 0,
  allowedPopups: 0,
  lastResetDate: new Date().toISOString().slice(0, 10),
  allowlist: [],
  debugMode: false
};

async function initStorage() {
  const settings = await getSettings();
  const today = new Date().toISOString().slice(0, 10);
  if (settings.lastResetDate !== today) {
    await chrome.storage.local.set({ popupsKilledToday: 0, lastResetDate: today });
  }
}

async function getSettings() {
  const keys = ['shieldEnabled', 'mode', 'popupsKilledToday', 'totalPopupsKilled', 'allowedPopups', 'lastResetDate', 'allowlist', 'debugMode'];
  const stored = await chrome.storage.local.get(keys);
  return {
    shieldEnabled: stored.shieldEnabled !== false,
    mode: stored.mode || 'normal',
    popupsKilledToday: stored.popupsKilledToday || 0,
    totalPopupsKilled: stored.totalPopupsKilled || 0,
    allowedPopups: stored.allowedPopups || 0,
    lastResetDate: stored.lastResetDate || new Date().toISOString().slice(0, 10),
    allowlist: stored.allowlist || [],
    debugMode: stored.debugMode || false
  };
}

function pruneSessions() {
  const cutoff = Date.now() - CLICK_WINDOW_MS;
  for (let i = clickSessions.length - 1; i >= 0; i--) {
    if (clickSessions[i].timestamp < cutoff) {
      clickSessions.splice(i, 1);
    }
  }
}

function addSession(session) {
  pruneSessions();
  clickSessions.push(session);
  // Also prune after a delay to keep memory clean
  setTimeout(pruneSessions, CLICK_WINDOW_MS + 100);
}

function getRelevantSession(tabId, newTabTimestamp) {
  pruneSessions();
  // Prefer exact opener match
  let session = clickSessions.find(s => s.tabId === tabId);
  if (!session) {
    // Fallback: active tab had a recent click
    session = clickSessions[clickSessions.length - 1];
  }
  if (session && (newTabTimestamp - session.timestamp) <= CLICK_WINDOW_MS) {
    return session;
  }
  return null;
}

async function incrementStat(key) {
  const stored = await chrome.storage.local.get(key);
  const val = (stored[key] || 0) + 1;
  await chrome.storage.local.set({ [key]: val });
}

const MAX_ACTIVITY_LOG = 100;
async function logActivity(entry) {
  try {
    const stored = await chrome.storage.local.get('activityLog');
    const log = stored.activityLog || [];
    log.unshift({ ...entry, timestamp: Date.now() });
    if (log.length > MAX_ACTIVITY_LOG) log.length = MAX_ACTIVITY_LOG;
    await chrome.storage.local.set({ activityLog: log });
  } catch (e) {}
}

async function sendToast(tabId, domain) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'showToast',
      domain: domain || 'unknown'
    });
  } catch (err) {
    // Tab may not have content script injected
  }
}

async function closeTab(tabId) {
  try {
    await chrome.tabs.remove(tabId);
  } catch (err) {
    console.error('[PopStop] Failed to close tab:', err);
  }
}

async function refocusTab(tabId) {
  try {
    await chrome.tabs.update(tabId, { active: true });
  } catch (err) {
    // Ignore
  }
}

// Listen for new tabs
chrome.tabs.onCreated.addListener(async (tab) => {
  const settings = await getSettings();
  if (!settings.shieldEnabled) return;

  const tabUrl = tab.url || tab.pendingUrl;
  if (isInternalBrowserUrl(tabUrl)) return;

  const openerTabId = tab.openerTabId;
  const newTabTimestamp = Date.now();
  const session = getRelevantSession(openerTabId, newTabTimestamp);

  // Increment burst tracker before classification
  let burstCount = 0;
  if (openerTabId) {
    burstCount = (tabBurstTracker.get(openerTabId) || 0) + 1;
    tabBurstTracker.set(openerTabId, burstCount);
    setTimeout(() => {
      const c = tabBurstTracker.get(openerTabId) || 0;
      if (c <= 1) tabBurstTracker.delete(openerTabId);
      else tabBurstTracker.set(openerTabId, c - 1);
    }, CLICK_WINDOW_MS);
  }

  const result = classifyPopup(session, { ...tab, url: tabUrl }, settings, burstCount);

  console.log('[PopStop] Tab created:', tab.url || tab.pendingUrl, '| Shield:', settings.shieldEnabled, '| Mode:', settings.mode, '| Allowlist:', settings.allowlist, '| Score:', result.score, '| Suspicious:', result.suspicious);

  if (settings.debugMode) {
    console.log('[PopStop] Reasons:', result.reasons);
  }

  if (result.suspicious) {
    const domain = extractDomain(tab.url || tab.pendingUrl);

    // Close the suspicious tab
    await closeTab(tab.id);

    // Refocus opener
    if (openerTabId) {
      await refocusTab(openerTabId);
      await sendToast(openerTabId, domain);
    }

    // Update stats
    await incrementStat('popupsKilledToday');
    await incrementStat('totalPopupsKilled');

    await logActivity({
      action: 'blocked',
      domain: domain || 'unknown',
      url: tab.url || tab.pendingUrl,
      reasons: result.reasons,
      score: result.score
    });

    if (settings.debugMode) {
      console.log('[PopStop] Killed popup:', domain, 'Reasons:', result.reasons);
    }
  } else {
    await incrementStat('allowedPopups');
    await logActivity({
      action: 'allowed',
      url: tab.url || tab.pendingUrl,
      reasons: result.reasons,
      score: result.score
    });
  }
});

// Detect blank-tab-then-redirect patterns via webNavigation
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame

  const settings = await getSettings();
  if (!settings.shieldEnabled) return;

  const tab = await chrome.tabs.get(details.tabId).catch(() => null);
  if (!tab) return;

  // If tab was blank and now navigating to a suspicious domain, kill it
  const tabUrl = tab.url || tab.pendingUrl;
  if (tabUrl === 'about:blank' || !tabUrl) {
    const session = getRelevantSession(tab.openerTabId, Date.now());
    if (session) {
      const result = classifyPopup(session, { ...tab, url: details.url }, settings);
      if (result.suspicious || isKnownSuspiciousDomain(details.url)) {
        const domain = extractDomain(details.url);
        await closeTab(details.tabId);
        if (tab.openerTabId) {
          await refocusTab(tab.openerTabId);
          await sendToast(tab.openerTabId, domain);
        }
        await incrementStat('popupsKilledToday');
        await incrementStat('totalPopupsKilled');
      }
    }
  }
});

// Message handlers from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'clickTracked': {
        const session = {
          timestamp: message.timestamp,
          tabId: sender.tab?.id,
          windowId: sender.tab?.windowId,
          url: message.url,
          tabUrl: sender.tab?.url || message.url,
          coords: message.coords,
          elementSummary: message.elementSummary,
          button: message.button,
          modifiers: message.modifiers,
          intentional: message.intentional
        };
        addSession(session);
        if ((await getSettings()).debugMode) {
          console.log('[PopStop] Click tracked:', session);
        }
        sendResponse({ ok: true });
        break;
      }
      case 'getStats': {
        const stats = await getSettings();
        sendResponse(stats);
        break;
      }
      case 'updateSettings': {
        await chrome.storage.local.set(message.updates);
        sendResponse({ ok: true });
        break;
      }
      case 'getCurrentDomain': {
        const tab = await chrome.tabs.query({ active: true, currentWindow: true });
        const domain = tab[0] ? extractDomain(tab[0].url) : null;
        sendResponse({ domain });
        break;
      }
      case 'allowlistDomain': {
        const stored = await getSettings();
        const domain = message.domain;
        if (domain && !stored.allowlist.includes(domain)) {
          stored.allowlist.push(domain);
          await chrome.storage.local.set({ allowlist: stored.allowlist });
        }
        sendResponse({ ok: true });
        break;
      }
      case 'removeAllowlistDomain': {
        const stored = await getSettings();
        const domain = message.domain;
        stored.allowlist = stored.allowlist.filter(d => d !== domain);
        await chrome.storage.local.set({ allowlist: stored.allowlist });
        sendResponse({ ok: true });
        break;
      }
      case 'downloadVideo': {
        try {
          const url = message.url || '';
          // Block downloads from known protected streaming platforms
          const protectedHosts = [
            'youtube.com', 'youtu.be', 'googlevideo.com',
            'fbcdn.net', 'facebook.com',
            'instagram.com', 'cdninstagram.com',
            'tiktokv.com', 'tiktokcdn.com',
            'twitter.com', 'x.com', 'twimg.com',
            'redditmedia.com', 'redd.it', 'v.redd.it',
            'streamable.com',
            'dailymotion.com', 'dmcdn.net'
          ];
          try {
            const u = new URL(url);
            const host = u.hostname.toLowerCase();
            if (protectedHosts.some(h => host === h || host.endsWith('.' + h)) ||
                (host.includes('googlevideo') && u.pathname.includes('videoplayback'))) {
              console.warn('[PopStop] Blocked download from protected platform:', host);
              sendResponse({ ok: false, error: 'Protected streaming — direct download not supported.' });
              break;
            }
          } catch {}

          await chrome.downloads.download({
            url: message.url,
            filename: message.filename || undefined,
            saveAs: true
          });
          sendResponse({ ok: true });
        } catch (err) {
          console.error('[PopStop] Download failed:', err);
          sendResponse({ ok: false, error: err.message });
        }
        break;
      }
      case 'getTabVideos': {
        const videos = Array.from(tabVideos.get(message.tabId)?.values() || []);
        sendResponse({ videos });
        break;
      }
      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }
  })();
  return true; // Keep channel open for async
});

// ---------------------------------------------------------------------------
// Video detection via webRequest (MV3 non-blocking observation)
// ---------------------------------------------------------------------------
const MEDIA_EXTS = /\.(mp4|webm|mkv|mov|avi|flv|ogv|m3u8|mpd|ts|aac|opus|wav|flac|mp3)(\?.*)?$/i;
const MEDIA_PATTERNS = /(\/video\/|\/stream\/|\/manifest\/|\/playlist|video\.php|stream\.php|get_video|download_video|media_file)/i;

function isMediaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return MEDIA_EXTS.test(u.pathname) || MEDIA_PATTERNS.test(u.href);
  } catch {
    return MEDIA_EXTS.test(url) || MEDIA_PATTERNS.test(url);
  }
}

const tabVideos = new Map(); // tabId -> Map<url, videoInfo>

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;
    if (!isMediaUrl(details.url)) return;
    if (!tabVideos.has(details.tabId)) tabVideos.set(details.tabId, new Map());
    tabVideos.get(details.tabId).set(details.url, {
      type: 'network',
      url: details.url,
      extra: { requestType: details.type },
      timestamp: Date.now()
    });
  },
  { urls: ['<all_urls>'], types: ['media', 'xmlhttprequest', 'other', 'script'] }
);

chrome.tabs.onRemoved.addListener((tabId) => {
  tabVideos.delete(tabId);
});

// Log storage changes for debugging
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const keys = Object.keys(changes);
  console.log('[PopStop] Storage changed:', keys.map(k => `${k}: ${changes[k].oldValue} → ${changes[k].newValue}`).join(', '));
});

// Initialize on install / startup
chrome.runtime.onInstalled.addListener(initStorage);
chrome.runtime.onStartup.addListener(initStorage);

initStorage();
