// options.js — Synthetiq PopStop settings page logic

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.section;
      navLinks.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      link.classList.add('active');
      document.getElementById(target).classList.add('active');
      window.location.hash = target;
    });
  });

  // Restore hash on load
  if (window.location.hash) {
    const target = window.location.hash.slice(1);
    const link = document.querySelector(`.nav-link[data-section="${target}"]`);
    if (link) link.click();
  }

  // ---------------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------------
  async function getAllSettings() {
    return chrome.storage.local.get([
      'shieldEnabled', 'mode', 'popupsKilledToday', 'totalPopupsKilled',
      'allowedPopups', 'lastResetDate', 'allowlist', 'debugMode', 'activityLog'
    ]);
  }

  async function setSettings(updates) {
    await chrome.storage.local.set(updates);
  }

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  const dashKilledToday = document.getElementById('dashKilledToday');
  const dashKilledTotal = document.getElementById('dashKilledTotal');
  const dashAllowed = document.getElementById('dashAllowed');
  const dashAllowlistCount = document.getElementById('dashAllowlistCount');
  const dashShieldToggle = document.getElementById('dashShieldToggle');
  const dashShieldText = document.getElementById('dashShieldText');
  const dashModeSelect = document.getElementById('dashModeSelect');

  async function loadDashboard() {
    const s = await getAllSettings();
    dashKilledToday.textContent = s.popupsKilledToday || 0;
    dashKilledTotal.textContent = s.totalPopupsKilled || 0;
    dashAllowed.textContent = s.allowedPopups || 0;
    dashAllowlistCount.textContent = (s.allowlist || []).length;

    dashShieldToggle.checked = s.shieldEnabled !== false;
    dashShieldText.textContent = dashShieldToggle.checked ? 'Shield is ON' : 'Shield is OFF';
    dashModeSelect.value = s.mode || 'normal';
  }

  dashShieldToggle.addEventListener('change', async () => {
    await setSettings({ shieldEnabled: dashShieldToggle.checked });
    dashShieldText.textContent = dashShieldToggle.checked ? 'Shield is ON' : 'Shield is OFF';
    await loadSettingsTab();
  });

  dashModeSelect.addEventListener('change', async () => {
    await setSettings({ mode: dashModeSelect.value });
    await loadSettingsTab();
  });

  // ---------------------------------------------------------------------------
  // Allowlist
  // ---------------------------------------------------------------------------
  const allowlistInput = document.getElementById('allowlistInput');
  const allowlistAddBtn = document.getElementById('allowlistAddBtn');
  const allowlistClearBtn = document.getElementById('allowlistClearBtn');
  const allowlistTable = document.getElementById('allowlistTable');

  async function loadAllowlist() {
    const s = await getAllSettings();
    const list = s.allowlist || [];

    if (list.length === 0) {
      allowlistTable.innerHTML = '<div class="empty">No sites in allowlist.</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Domain</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    list.forEach((domain, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td class="url-text">${escapeHtml(domain)}</td>
        <td class="col-actions">
          <button class="btn btn-danger btn-small remove-btn" data-domain="${escapeHtml(domain)}">Remove</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    allowlistTable.innerHTML = '';
    allowlistTable.appendChild(table);

    allowlistTable.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const domain = btn.dataset.domain;
        const s = await getAllSettings();
        const newList = (s.allowlist || []).filter(d => d !== domain);
        await setSettings({ allowlist: newList });
        await loadAllowlist();
        await loadDashboard();
      });
    });
  }

  allowlistAddBtn.addEventListener('click', async () => {
    const raw = allowlistInput.value.trim();
    if (!raw) return;
    // Normalize: extract domain if user pasted a URL
    let domain = raw;
    try {
      const u = new URL(raw);
      domain = u.hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      domain = raw.toLowerCase();
    }
    if (!domain) return;

    const s = await getAllSettings();
    const list = s.allowlist || [];
    if (list.includes(domain)) {
      allowlistInput.value = '';
      return;
    }
    list.push(domain);
    await setSettings({ allowlist: list });
    allowlistInput.value = '';
    await loadAllowlist();
    await loadDashboard();
  });

  allowlistClearBtn.addEventListener('click', async () => {
    if (!confirm('Remove ALL sites from the allowlist?')) return;
    await setSettings({ allowlist: [] });
    await loadAllowlist();
    await loadDashboard();
  });

  // ---------------------------------------------------------------------------
  // Activity Log
  // ---------------------------------------------------------------------------
  const activityTable = document.getElementById('activityTable');
  const activityClearBtn = document.getElementById('activityClearBtn');

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString();
  }

  async function loadActivity() {
    const s = await getAllSettings();
    const log = s.activityLog || [];

    if (log.length === 0) {
      activityTable.innerHTML = '<div class="empty">No activity recorded yet.</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Time</th>
          <th>Action</th>
          <th>Domain / URL</th>
          <th>Score</th>
          <th>Reasons</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    log.forEach(entry => {
      const tr = document.createElement('tr');
      const reasons = (entry.reasons || []).join(', ');
      const display = entry.domain || entry.url || 'unknown';
      const badgeClass = entry.action === 'blocked' ? 'badge-blocked' : 'badge-allowed';
      tr.innerHTML = `
        <td>${formatTime(entry.timestamp)}</td>
        <td><span class="badge ${badgeClass}">${entry.action}</span></td>
        <td class="url-text" title="${escapeHtml(entry.url || '')}">${escapeHtml(display)}</td>
        <td>${entry.score !== undefined ? entry.score : '-'}</td>
        <td style="max-width:300px;word-break:break-word;font-size:12px;color:#555;">${escapeHtml(reasons)}</td>
      `;
      tbody.appendChild(tr);
    });

    activityTable.innerHTML = '';
    activityTable.appendChild(table);
  }

  activityClearBtn.addEventListener('click', async () => {
    if (!confirm('Clear the entire activity log?')) return;
    await setSettings({ activityLog: [] });
    await loadActivity();
  });

  // ---------------------------------------------------------------------------
  // Settings Tab
  // ---------------------------------------------------------------------------
  const settingsShieldToggle = document.getElementById('settingsShieldToggle');
  const settingsModeSelect = document.getElementById('settingsModeSelect');
  const settingsDebugToggle = document.getElementById('settingsDebugToggle');

  async function loadSettingsTab() {
    const s = await getAllSettings();
    settingsShieldToggle.checked = s.shieldEnabled !== false;
    settingsModeSelect.value = s.mode || 'normal';
    settingsDebugToggle.checked = s.debugMode || false;
  }

  settingsShieldToggle.addEventListener('change', async () => {
    await setSettings({ shieldEnabled: settingsShieldToggle.checked });
    await loadDashboard();
  });

  settingsModeSelect.addEventListener('change', async () => {
    await setSettings({ mode: settingsModeSelect.value });
    await loadDashboard();
  });

  settingsDebugToggle.addEventListener('change', async () => {
    await setSettings({ debugMode: settingsDebugToggle.checked });
  });

  // ---------------------------------------------------------------------------
  // Data & Backup
  // ---------------------------------------------------------------------------
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const importBtn = document.getElementById('importBtn');
  const importMsg = document.getElementById('importMsg');
  const resetAllBtn = document.getElementById('resetAllBtn');

  exportBtn.addEventListener('click', async () => {
    const data = await getAllSettings();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `popstop-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', async () => {
    const file = importFile.files[0];
    if (!file) {
      showImportMsg('Please select a JSON file first.', true);
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // Validate basic shape
      if (typeof data !== 'object') throw new Error('Invalid JSON');
      // Only restore known keys
      const allowedKeys = ['shieldEnabled', 'mode', 'popupsKilledToday', 'totalPopupsKilled',
        'allowedPopups', 'lastResetDate', 'allowlist', 'debugMode', 'activityLog'];
      const cleaned = {};
      allowedKeys.forEach(k => {
        if (data[k] !== undefined) cleaned[k] = data[k];
      });
      await setSettings(cleaned);
      showImportMsg('Settings imported successfully.', false);
      await loadDashboard();
      await loadAllowlist();
      await loadActivity();
      await loadSettingsTab();
    } catch (err) {
      showImportMsg('Import failed: ' + err.message, true);
    }
  });

  function showImportMsg(text, isError) {
    importMsg.textContent = text;
    importMsg.classList.remove('hidden', 'error');
    if (isError) importMsg.classList.add('error');
    setTimeout(() => importMsg.classList.add('hidden'), 4000);
  }

  resetAllBtn.addEventListener('click', async () => {
    if (!confirm('Reset ALL data? This will clear stats, allowlist, and activity log. It cannot be undone.')) return;
    await chrome.storage.local.clear();
    await setSettings({
      shieldEnabled: true,
      mode: 'normal',
      popupsKilledToday: 0,
      totalPopupsKilled: 0,
      allowedPopups: 0,
      lastResetDate: new Date().toISOString().slice(0, 10),
      allowlist: [],
      debugMode: false,
      activityLog: []
    });
    await loadDashboard();
    await loadAllowlist();
    await loadActivity();
    await loadSettingsTab();
  });

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  async function init() {
    await loadDashboard();
    await loadAllowlist();
    await loadActivity();
    await loadSettingsTab();
  }

  init();
})();
