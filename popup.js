// popup.js — Synthetiq PopStop popup logic

(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $(`tab-${target}`).classList.add('active');
      if (target === 'downloads') loadVideos();
    });
  });

  // Adblocker elements
  const shieldToggle = $('shieldToggle');
  const shieldStatus = $('shieldStatus');
  const modeSelect = $('modeSelect');
  const killedToday = $('killedToday');
  const killedTotal = $('killedTotal');
  const allowedTotal = $('allowedTotal');
  const allowlistCount = $('allowlistCount');
  const currentDomain = $('currentDomain');
  const allowlistBtn = $('allowlistBtn');
  const allowlistMsg = $('allowlistMsg');
  const resetStatsBtn = $('resetStatsBtn');

  // Downloads elements
  const videosList = $('videosList');

  let currentSiteDomain = null;
  let currentAllowlist = [];

  async function loadStats() {
    const stored = await chrome.storage.local.get([
      'shieldEnabled', 'mode', 'popupsKilledToday',
      'totalPopupsKilled', 'allowedPopups', 'allowlist'
    ]);

    shieldToggle.checked = stored.shieldEnabled !== false;
    modeSelect.value = stored.mode || 'normal';
    killedToday.textContent = stored.popupsKilledToday || 0;
    killedTotal.textContent = stored.totalPopupsKilled || 0;
    allowedTotal.textContent = stored.allowedPopups || 0;
    currentAllowlist = stored.allowlist || [];
    allowlistCount.textContent = currentAllowlist.length;
    updateShieldUI();
  }

  async function loadCurrentDomain() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tabs[0]?.url || '';
      let domain = null;
      try {
        const u = new URL(url);
        if (u.protocol === 'file:') {
          const parts = u.pathname.split('/');
          domain = parts.pop() || u.pathname;
        } else {
          domain = u.hostname.toLowerCase().replace(/^www\./, '');
        }
      } catch {
        domain = null;
      }
      currentSiteDomain = domain;
      currentDomain.textContent = currentSiteDomain || '—';
    } catch {
      currentSiteDomain = null;
      currentDomain.textContent = '—';
    }
    updateAllowlistButton();
  }

  function updateShieldUI() {
    if (shieldToggle.checked) {
      shieldStatus.textContent = 'ON';
      shieldStatus.className = 'status on';
    } else {
      shieldStatus.textContent = 'OFF';
      shieldStatus.className = 'status off';
    }
  }

  function updateAllowlistButton() {
    if (!currentSiteDomain) {
      allowlistBtn.textContent = 'Allowlist this site';
      allowlistBtn.disabled = true;
      return;
    }
    allowlistBtn.disabled = false;
    if (currentAllowlist.includes(currentSiteDomain)) {
      allowlistBtn.textContent = 'Remove from allowlist';
    } else {
      allowlistBtn.textContent = 'Allowlist this site';
    }
  }

  shieldToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ shieldEnabled: shieldToggle.checked });
    updateShieldUI();
  });

  modeSelect.addEventListener('change', async () => {
    await chrome.storage.local.set({ mode: modeSelect.value });
  });

  allowlistBtn.addEventListener('click', async () => {
    if (!currentSiteDomain) return;

    let newAllowlist;
    if (currentAllowlist.includes(currentSiteDomain)) {
      newAllowlist = currentAllowlist.filter(d => d !== currentSiteDomain);
      allowlistMsg.textContent = `Removed ${currentSiteDomain} from allowlist`;
    } else {
      newAllowlist = [...currentAllowlist, currentSiteDomain];
      allowlistMsg.textContent = `Added ${currentSiteDomain} to allowlist`;
    }

    await chrome.storage.local.set({ allowlist: newAllowlist });
    currentAllowlist = newAllowlist;
    allowlistCount.textContent = currentAllowlist.length;

    allowlistMsg.classList.remove('hidden');
    setTimeout(() => allowlistMsg.classList.add('hidden'), 2000);

    updateAllowlistButton();
  });

  resetStatsBtn.addEventListener('click', async () => {
    if (!confirm('Reset all statistics? This cannot be undone.')) return;
    await chrome.storage.local.set({
      popupsKilledToday: 0,
      totalPopupsKilled: 0,
      allowedPopups: 0,
      lastResetDate: new Date().toISOString().slice(0, 10)
    });
    await loadStats();
  });

  document.getElementById('openSettingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ---------------------------------------------------------------------------
  // Helpers for video info extraction
  // ---------------------------------------------------------------------------
  function extractTitle(url) {
    try {
      const u = new URL(url);
      const name = decodeURIComponent(u.pathname.split('/').pop() || '');
      if (name && name !== 'videoplayback') return name;
      // Try to extract a readable name from mime parameter for YouTube URLs
      const mime = u.searchParams.get('mime');
      if (mime) {
        const type = mime.split('/')[1];
        if (type) return `stream_${type}`;
      }
    } catch {}
    return 'Video';
  }

  function isProtectedVideoUrl(url) {
    if (!url) return false;
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      const path = u.pathname.toLowerCase();
      // Known protected streaming platforms
      const protectedHosts = [
        'youtube.com', 'youtu.be', 'googlevideo.com',
        'fbcdn.net', 'facebook.com',
        'instagram.com', 'cdninstagram.com',
        'tiktokv.com', 'tiktokcdn.com',
        'twitter.com', 'x.com', 'twimg.com',
        'redditmedia.com', 'redd.it',
        'v.redd.it',
        'streamable.com',
        'dailymotion.com', 'dmcdn.net'
      ];
      if (protectedHosts.some(h => host === h || host.endsWith('.' + h))) return true;
      // YouTube videoplayback URLs on any googlevideo subdomain
      if (host.includes('googlevideo') && path.includes('videoplayback')) return true;
    } catch {}
    return false;
  }

  function hasVideoExtension(url) {
    if (!url) return false;
    try {
      const clean = url.split('?')[0].split('#')[0];
      const ext = clean.split('.').pop().toLowerCase();
      return ['mp4', 'webm', 'mkv', 'mov', 'avi', 'flv', 'ogv', 'ts', 'mp3', 'aac', 'opus', 'wav', 'flac'].includes(ext);
    } catch {}
    return false;
  }

  function extractFormat(url, type) {
    // Protected platforms (YouTube, Facebook, etc.) — always treat as non-downloadable
    if (isProtectedVideoUrl(url)) {
      return { label: 'Protected', isStream: true };
    }

    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    if (ext === 'm3u8') return { label: 'HLS Stream', isStream: true };
    if (ext === 'mpd') return { label: 'DASH Stream', isStream: true };
    if (ext === 'ts') return { label: 'MPEG-TS', isStream: false };
    if (ext === 'mp4') return { label: 'MP4', isStream: false };
    if (ext === 'webm') return { label: 'WebM', isStream: false };
    if (ext === 'mkv') return { label: 'MKV', isStream: false };
    if (ext === 'mov') return { label: 'MOV', isStream: false };
    if (ext === 'avi') return { label: 'AVI', isStream: false };
    if (ext === 'flv') return { label: 'FLV', isStream: false };
    if (ext === 'mp3') return { label: 'MP3', isStream: false };
    if (ext === 'aac') return { label: 'AAC', isStream: false };
    if (ext === 'opus') return { label: 'OPUS', isStream: false };

    // If URL has no recognizable video extension, treat as stream (safer)
    if (!hasVideoExtension(url)) {
      return { label: (type || 'Stream').toUpperCase(), isStream: true };
    }

    return { label: (type || 'Unknown').toUpperCase(), isStream: false };
  }

  function extractQuality(url) {
    const match = url.match(/(1080p|720p|480p|360p|240p|4k|2160p|1440p)/i);
    return match ? match[1].toUpperCase() : null;
  }

  // ---------------------------------------------------------------------------
  // Video detection — queries ALL frames + background webRequest data
  // ---------------------------------------------------------------------------
  async function loadVideos() {
    videosList.innerHTML = '<div class="empty">Scanning for videos...</div>';

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;
      if (!tabId) {
        videosList.innerHTML = '<div class="empty">No active tab</div>';
        return;
      }

      const merged = new Map();

      // 1. Query background for webRequest-detected videos
      try {
        const bg = await chrome.runtime.sendMessage({ type: 'getTabVideos', tabId });
        if (bg?.videos) {
          bg.videos.forEach(v => {
            merged.set(v.url, v);
          });
        }
      } catch (e) {}

      // 2. Query ALL frames in the tab
      try {
        const frames = await chrome.webNavigation.getAllFrames({ tabId });
        for (const frame of frames) {
          try {
            const response = await chrome.tabs.sendMessage(tabId, { type: 'getVideos' }, { frameId: frame.frameId });
            if (response?.videos) {
              response.videos.forEach(v => {
                merged.set(v.url, v);
              });
            }
          } catch (e) {}
        }
      } catch (e) {}

      const videos = Array.from(merged.values());

      if (videos.length === 0) {
        videosList.innerHTML = '<div class="empty">No videos detected yet.<br>Try playing the video first, then reopen this tab.</div>';
        return;
      }

      videosList.innerHTML = '';
      videos.forEach(v => {
        const title = extractTitle(v.url);
        const fmt = extractFormat(v.url, v.type);
        const quality = extractQuality(v.url);

        const item = document.createElement('div');
        item.className = 'video-item';

        const header = document.createElement('div');
        header.className = 'video-header';

        const titleEl = document.createElement('div');
        titleEl.className = 'video-title';
        titleEl.textContent = title;
        titleEl.title = title;
        header.appendChild(titleEl);

        const meta = document.createElement('div');
        meta.className = 'video-meta';

        const fmtBadge = document.createElement('span');
        fmtBadge.className = 'video-badge' + (fmt.isStream ? ' stream' : '');
        fmtBadge.textContent = fmt.label;
        meta.appendChild(fmtBadge);

        if (quality) {
          const qualBadge = document.createElement('span');
          qualBadge.className = 'video-badge quality';
          qualBadge.textContent = quality;
          meta.appendChild(qualBadge);
        }

        const urlEl = document.createElement('span');
        urlEl.className = 'video-url';
        urlEl.textContent = v.url;
        urlEl.title = v.url;

        const actions = document.createElement('div');
        actions.className = 'video-actions';

        if (fmt.isStream) {
          const copyBtn = document.createElement('button');
          copyBtn.className = 'btn-small btn-copy';
          copyBtn.textContent = 'Copy URL';
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(v.url);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy URL', 1500);
          });
          actions.appendChild(copyBtn);

          // Add warning for protected platforms
          if (isProtectedVideoUrl(v.url)) {
            const warn = document.createElement('div');
            warn.className = 'video-warning';
            warn.textContent = 'This site uses protected streaming. Use an external downloader.';
            actions.appendChild(warn);
          }
        } else {
          const dlBtn = document.createElement('button');
          dlBtn.className = 'btn-small btn-download';
          dlBtn.textContent = 'Download';
          dlBtn.addEventListener('click', async () => {
            dlBtn.textContent = '...';
            dlBtn.disabled = true;
            try {
              const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_');
              const filename = safeTitle.length > 100 ? 'video' : safeTitle;
              const result = await chrome.runtime.sendMessage({
                type: 'downloadVideo',
                url: v.url,
                filename
              });
              if (result.ok) {
                dlBtn.textContent = 'Saved';
              } else {
                dlBtn.textContent = 'Failed';
                if (result.error) {
                  dlBtn.title = result.error;
                }
              }
            } catch {
              dlBtn.textContent = 'Failed';
            }
            setTimeout(() => {
              dlBtn.textContent = 'Download';
              dlBtn.disabled = false;
            }, 2000);
          });
          actions.appendChild(dlBtn);

          const copyBtn = document.createElement('button');
          copyBtn.className = 'btn-small btn-copy';
          copyBtn.textContent = 'Copy';
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(v.url);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy', 1500);
          });
          actions.appendChild(copyBtn);
        }

        item.appendChild(header);
        item.appendChild(meta);
        item.appendChild(urlEl);
        item.appendChild(actions);
        videosList.appendChild(item);
      });
    } catch (err) {
      videosList.innerHTML = '<div class="empty">Could not scan videos. Reload the page and try again.</div>';
    }
  }

  // Initialize
  loadStats().then(loadCurrentDomain);
})();
