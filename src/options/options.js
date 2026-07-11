// AetherProxy Dashboard Options Logic

// Apply theme instantly on startup
chrome.storage.local.get(['theme'], (res) => {
  if (res.theme === 'light') {
    document.body.classList.add('light-theme');
  }
});

let profiles = {};
let rules = [];
let activeProfileId = 'system';
let defaultProfileId = 'direct';

// DOM elements
const profilesListContainer = document.getElementById('profiles-list-container');
const editorEmptyState = document.getElementById('editor-empty-state');
const profileEditForm = document.getElementById('profile-edit-form');
const addProfileBtn = document.getElementById('add-profile-btn');

// Form inputs
const editProfileId = document.getElementById('edit-profile-id');
const editProfileName = document.getElementById('edit-profile-name');
const editProfileScheme = document.getElementById('edit-profile-scheme');
const editProfileHost = document.getElementById('edit-profile-host');
const editProfilePort = document.getElementById('edit-profile-port');
const editProfileUsername = document.getElementById('edit-profile-username');
const editProfilePassword = document.getElementById('edit-profile-password');
const editProfileBypass = document.getElementById('edit-profile-bypass');

// Form buttons
const deleteProfileBtn = document.getElementById('delete-profile-btn');
const pingProfileBtn = document.getElementById('ping-profile-btn');
const pingStatusMsg = document.getElementById('ping-status-msg');
const editorStatusMsg = document.getElementById('editor-status-msg');

// Rules components
const rulesDefaultProfileSelect = document.getElementById('rules-default-profile');
const rulesTableBody = document.getElementById('rules-table-body');
const rulesEmptyState = document.getElementById('rules-empty-state');
const addRuleBtn = document.getElementById('add-rule-btn');
const saveRulesBtn = document.getElementById('save-rules-btn');
const rulesStatusMsg = document.getElementById('rules-status-msg');

// Settings components
const exportSettingsBtn = document.getElementById('export-settings-btn');
const triggerImportBtn = document.getElementById('trigger-import-btn');
const importFileInput = document.getElementById('import-file-input');
const importFileLabel = document.getElementById('import-file-label');
const importSettingsBtn = document.getElementById('import-settings-btn');
const resetSettingsBtn = document.getElementById('reset-settings-btn');
const settingsStatusMsg = document.getElementById('settings-status-msg');

// Temp holder for import settings data
let importedConfigData = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Tabs & Sidebar Layout
  initTabs();
  initSidebar();

  // 2. Load settings from storage
  await loadAllSettings();

  // 3. Render Dashboard Tabs
  renderProfilesList();
  renderRulesTab();
  initSettingsTab();

  // 4. Bind Events for Profiles
  addProfileBtn.addEventListener('click', createNewProfile);
  profileEditForm.addEventListener('submit', saveProfile);
  deleteProfileBtn.addEventListener('click', deleteProfile);
  pingProfileBtn.addEventListener('click', testProxyPing);

  // 5. Bind Events for Rules
  addRuleBtn.addEventListener('click', addNewRuleRow);
  saveRulesBtn.addEventListener('click', saveRulesConfig);

  // 6. Bind Events for Privacy & Theme
  initPrivacyTab();
  initTheme();

  // 7. Bind Events for Simulator, Share & Token Import
  initSimulator();
  initSharingAndImport();
  checkQueryImport();
});

// Helper: Load all settings from Local Storage
async function loadAllSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['profiles', 'rules', 'activeProfileId', 'defaultProfileId'], (result) => {
      profiles = result.profiles || {};
      rules = result.rules || [];
      activeProfileId = result.activeProfileId || 'system';
      defaultProfileId = result.defaultProfileId || 'direct';
      resolve();
    });
  });
}

// ----------------------------------------------------
// TAB ROUTING & TAB NAVIGATION
// ----------------------------------------------------
function initTabs() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // Update sidebar nav state
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update visible tab view
      document.querySelectorAll('.tab-section').forEach(section => section.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');

      // Refresh data on switch
      if (tabId === 'rules') {
        renderRulesTab();
      }
    });
  });
}

// ----------------------------------------------------
// TAB 1: PROXY PROFILES SECTION
// ----------------------------------------------------
function renderProfilesList() {
  chrome.storage.local.get(['proxyLatencies'], (result) => {
    const latencies = result.proxyLatencies || {};
    profilesListContainer.innerHTML = '';
    const profileIds = Object.keys(profiles);

    profileIds.forEach(id => {
      const prof = profiles[id];
      if (!prof) return;

      const tab = document.createElement('button');
      tab.className = 'profile-tab';
      if (editProfileId.value === id) {
        tab.classList.add('active');
      }

      let latencyHtml = '';
      if (latencies[id] !== undefined) {
        const ms = latencies[id];
        if (ms >= 9999) {
          latencyHtml = '<span class="latency-badge offline" style="font-size: 9px; padding: 2px 4px; border-radius: 4px; background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); margin-left: 6px;">offline</span>';
        } else {
          let badgeColor = 'rgba(16, 185, 129, 0.1)';
          let textColor = '#34d399';
          let borderCol = 'rgba(16, 185, 129, 0.25)';
          if (ms > 300) {
            badgeColor = 'rgba(245, 158, 11, 0.1)';
            textColor = '#fbbf24';
            borderCol = 'rgba(245, 158, 11, 0.25)';
          }
          latencyHtml = `<span class="latency-badge" style="font-size: 9px; padding: 2px 4px; border-radius: 4px; background: ${badgeColor}; color: ${textColor}; border: 1px solid ${borderCol}; margin-left: 6px;">${ms}ms</span>`;
        }
      }

      tab.innerHTML = `
        <div class="profile-tab-bullet"></div>
        <div style="overflow: hidden; flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="profile-tab-name">${escapeHTML(prof.name)}</div>
            ${latencyHtml}
          </div>
          <div class="profile-tab-meta">${prof.scheme.toUpperCase()} • ${escapeHTML(prof.host)}:${prof.port}</div>
        </div>
      `;

      tab.addEventListener('click', () => {
        loadProfileToEditor(id);
      });

      profilesListContainer.appendChild(tab);
    });
  });
}

function loadProfileToEditor(id) {
  const prof = profiles[id];
  if (!prof) return;

  // Reset UI status labels
  pingStatusMsg.style.display = 'none';
  editorStatusMsg.style.display = 'none';

  // Populate form
  editProfileId.value = id;
  editProfileName.value = prof.name;
  editProfileScheme.value = prof.scheme;
  editProfileHost.value = prof.host;
  editProfilePort.value = prof.port;
  editProfileUsername.value = prof.username || '';
  editProfilePassword.value = prof.password || '';
  editProfileBypass.value = prof.bypassList || '';

  // Show editor form
  editorEmptyState.style.display = 'none';
  profileEditForm.style.display = 'block';

  // Highlight selected tab
  document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
  renderProfilesList();

  // Draw latency history graph
  drawLatencyGraph(id);
}

function createNewProfile() {
  // Open editor and reset fields to default
  const newId = `profile-${Date.now()}`;
  editProfileId.value = newId;
  editProfileName.value = 'New Proxy Server';
  editProfileScheme.value = 'http';
  editProfileHost.value = '';
  editProfilePort.value = '8080';
  editProfileUsername.value = '';
  editProfilePassword.value = '';
  editProfileBypass.value = 'localhost, 127.0.0.1';

  pingStatusMsg.style.display = 'none';
  editorStatusMsg.style.display = 'none';

  editorEmptyState.style.display = 'none';
  profileEditForm.style.display = 'block';

  // Focus host input
  editProfileHost.focus();
  renderProfilesList();
}

function saveProfile(e) {
  e.preventDefault();

  const id = editProfileId.value;
  const name = editProfileName.value.trim();
  const scheme = editProfileScheme.value;
  const host = editProfileHost.value.trim();
  const port = editProfilePort.value.trim();
  const username = editProfileUsername.value.trim();
  const password = editProfilePassword.value;
  const bypassList = editProfileBypass.value;

  if (!name || !host || !port) {
    showEditorStatus('Please fill in all required fields.', true);
    return;
  }

  // Update object
  profiles[id] = {
    id,
    name,
    scheme,
    host,
    port,
    username,
    password,
    bypassList
  };

  // Save to Chrome storage
  chrome.storage.local.set({ profiles }, () => {
    showEditorStatus('Profile saved successfully!', false);
    renderProfilesList();
  });
}

function deleteProfile() {
  const id = editProfileId.value;
  if (!id) return;

  if (confirm(`Are you sure you want to delete profile "${profiles[id].name}"?`)) {
    // Delete profile
    delete profiles[id];

    // Remove from switch rules too if referenced
    rules = rules.filter(r => r.profileId !== id);
    if (defaultProfileId === id) {
      defaultProfileId = 'direct';
    }

    // Check if active profile was this deleted profile, fallback to system
    let updates = { profiles, rules, defaultProfileId };
    if (activeProfileId === id) {
      activeProfileId = 'system';
      updates.activeProfileId = 'system';
    }

    chrome.storage.local.set(updates, () => {
      // Clear form
      profileEditForm.reset();
      profileEditForm.style.display = 'none';
      editorEmptyState.style.display = 'flex';
      editProfileId.value = '';
      
      renderProfilesList();
    });
  }
}

// Advanced Connection Ping Test Tool
async function testProxyPing() {
  const id = editProfileId.value;
  const scheme = editProfileScheme.value;
  const host = editProfileHost.value.trim();
  const port = editProfilePort.value.trim();

  if (!host || !port) {
    showPingStatus('Please enter a host and port first to test.', 'failed');
    return;
  }

  showPingStatus('Applying proxy settings temporarily and pinging...', 'loading');

  try {
    // 1. Temporarily backup active profile ID
    const backupActiveId = activeProfileId;
    const tempProfileId = 'temp-ping-test';
    
    // Create copy profiles
    const tempProfiles = { ...profiles };
    tempProfiles[tempProfileId] = {
      id: tempProfileId,
      name: 'Temp Ping Profile',
      scheme,
      host,
      port,
      username: editProfileUsername.value.trim(),
      password: editProfilePassword.value
    };

    // 2. Set active settings to temp profile in local storage
    await new Promise((resolve) => {
      chrome.storage.local.set({
        profiles: tempProfiles,
        activeProfileId: tempProfileId
      }, resolve);
    });

    // 3. Sleep 150ms for proxy settings to propagate to Chrome network layer
    await new Promise(r => setTimeout(r, 150));

    // 4. Measure request elapsed time
    const start = Date.now();
    
    // We fetch a lightweight resource that returns instantly
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const fetchResult = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const end = Date.now();
    const elapsed = end - start;

    // 5. Restore original profiles list and active profile ID
    await new Promise((resolve) => {
      chrome.storage.local.set({
        profiles: profiles,
        activeProfileId: backupActiveId
      }, resolve);
    });

    if (fetchResult) {
      showPingStatus(`🟢 Connection Succeeded! Latency: ${elapsed}ms`, 'success');
      
      // Update local ping histories in storage
      chrome.storage.local.get(['pingHistories'], (resHist) => {
        const histories = resHist.pingHistories || {};
        const history = histories[id] || [];
        history.push(elapsed);
        if (history.length > 10) history.shift(); // keep last 10
        histories[id] = history;
        chrome.storage.local.set({ pingHistories: histories }, () => {
          drawLatencyGraph(id);
          // Re-render profiles list to show active latency badge immediately
          renderProfilesList();
        });
      });
    } else {
      showPingStatus(`🔴 Connection failed or refused by proxy.`, 'failed');
    }
  } catch (err) {
    console.error('Ping test error:', err);
    
    // Restore settings in case of crash
    chrome.storage.local.set({
      profiles: profiles,
      activeProfileId: activeProfileId
    });

    showPingStatus(`🔴 Connection Timeout / Proxy Offline.`, 'failed');
  }
}

function showEditorStatus(msg, isErr) {
  editorStatusMsg.style.display = 'block';
  editorStatusMsg.textContent = msg;
  editorStatusMsg.style.background = isErr ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)';
  editorStatusMsg.style.borderColor = isErr ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
  editorStatusMsg.style.color = isErr ? '#fca5a5' : '#a7f3d0';

  setTimeout(() => {
    editorStatusMsg.style.display = 'none';
  }, 4000);
}

function showPingStatus(msg, status) {
  pingStatusMsg.style.display = 'inline-block';
  pingStatusMsg.textContent = msg;
  pingStatusMsg.className = `ping-badge ${status}`;
}

// ----------------------------------------------------
// TAB 2: AUTO SWITCH RULES SECTION
// ----------------------------------------------------
function renderRulesTab() {
  // Populate fallback profile select
  rulesDefaultProfileSelect.innerHTML = '<option value="direct">DIRECT (No Proxy)</option>';
  
  Object.keys(profiles).forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = profiles[id].name;
    rulesDefaultProfileSelect.appendChild(opt);
  });

  rulesDefaultProfileSelect.value = defaultProfileId;

  // Render rules rows
  rulesTableBody.innerHTML = '';

  if (rules.length === 0) {
    rulesEmptyState.style.display = 'block';
  } else {
    rulesEmptyState.style.display = 'none';
    
    rules.forEach((rule, index) => {
      const row = document.createElement('tr');
      
      // Target profile options HTML
      let profileOpts = '<option value="direct">DIRECT</option>';
      Object.keys(profiles).forEach(id => {
        profileOpts += `<option value="${id}" ${rule.profileId === id ? 'selected' : ''}>${escapeHTML(profiles[id].name)}</option>`;
      });

      row.innerHTML = `
        <td>
          <select class="form-select rule-pattern-type" data-index="${index}">
            <option value="wildcard" ${rule.patternType === 'wildcard' ? 'selected' : ''}>Wildcard</option>
            <option value="regexp" ${rule.patternType === 'regexp' ? 'selected' : ''}>Regex</option>
          </select>
        </td>
        <td>
          <input type="text" class="form-input rule-pattern" data-index="${index}" placeholder="e.g. *.google.com" value="${escapeHTML(rule.pattern || '')}">
        </td>
        <td>
          <select class="form-select rule-profile-id" data-index="${index}">
            ${profileOpts}
          </select>
        </td>
        <td style="text-align: center;">
          <button class="btn btn-danger delete-rule-btn" data-index="${index}" style="padding: 4px 8px; font-size: 11px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          </button>
        </td>
      `;

      // Bind delete rule row button
      row.querySelector('.delete-rule-btn').addEventListener('click', () => {
        deleteRuleRow(index);
      });

      rulesTableBody.appendChild(row);
    });
  }
}

function addNewRuleRow() {
  rules.push({
    id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    patternType: 'wildcard',
    pattern: '',
    profileId: 'direct'
  });
  renderRulesTab();
}

function deleteRuleRow(index) {
  rules.splice(index, 1);
  renderRulesTab();
}

function saveRulesConfig() {
  const rowElements = rulesTableBody.querySelectorAll('tr');
  const updatedRules = [];

  // Parse table inputs
  rowElements.forEach(row => {
    const patternType = row.querySelector('.rule-pattern-type').value;
    const pattern = row.querySelector('.rule-pattern').value.trim();
    const profileId = row.querySelector('.rule-profile-id').value;

    if (pattern) {
      updatedRules.push({
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        patternType,
        pattern,
        profileId
      });
    }
  });

  rules = updatedRules;
  defaultProfileId = rulesDefaultProfileSelect.value;

  // Save to local storage
  chrome.storage.local.set({
    rules: rules,
    defaultProfileId: defaultProfileId
  }, () => {
    showRulesStatus('Switch rules config saved successfully!', false);
    renderRulesTab();
  });
}

function showRulesStatus(msg, isErr) {
  rulesStatusMsg.style.display = 'block';
  rulesStatusMsg.textContent = msg;
  rulesStatusMsg.style.background = isErr ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)';
  rulesStatusMsg.style.borderColor = isErr ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
  rulesStatusMsg.style.color = isErr ? '#fca5a5' : '#a7f3d0';

  setTimeout(() => {
    rulesStatusMsg.style.display = 'none';
  }, 4500);
}

// ----------------------------------------------------
// TAB 3: SETTINGS IMPORT / EXPORT SECTION
// ----------------------------------------------------
function initSettingsTab() {
  // Bind Export handler
  exportSettingsBtn.addEventListener('click', exportSettings);

  // Bind Import triggers
  triggerImportBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', handleImportFileSelect);
  importSettingsBtn.addEventListener('click', applyImportedSettings);

  // Bind Factory Reset
  resetSettingsBtn.addEventListener('click', factoryResetSettings);
}

function exportSettings() {
  chrome.storage.local.get(null, (allData) => {
    const backupData = {
      app: 'AetherProxy',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profiles: allData.profiles || {},
      rules: allData.rules || [],
      activeProfileId: allData.activeProfileId || 'system',
      defaultProfileId: allData.defaultProfileId || 'direct'
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `aetherproxy_backup_${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showSettingsStatus('Backup file downloaded successfully!', false);
  });
}

function handleImportFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  importFileLabel.textContent = file.name;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.app !== 'AetherProxy' || !data.profiles) {
        throw new Error('Invalid file structure. Make sure this is an AetherProxy backup.');
      }
      
      importedConfigData = data;
      importSettingsBtn.disabled = false;
      showSettingsStatus('Backup file loaded successfully. Click "Apply Imported Settings" to confirm.', false);
    } catch (err) {
      console.error(err);
      importedConfigData = null;
      importSettingsBtn.disabled = true;
      importFileLabel.textContent = 'Invalid file';
      showSettingsStatus(`❌ Import failed: ${err.message}`, true);
    }
  };
  reader.readAsText(file);
}

function applyImportedSettings() {
  if (!importedConfigData) return;

  if (confirm('Apply imported settings? This will completely replace your current profiles and rules.')) {
    chrome.storage.local.set({
      profiles: importedConfigData.profiles,
      rules: importedConfigData.rules,
      activeProfileId: importedConfigData.activeProfileId,
      defaultProfileId: importedConfigData.defaultProfileId
    }, async () => {
      // Reload states in memory
      await loadAllSettings();
      
      // Reset Import UI
      importedConfigData = null;
      importSettingsBtn.disabled = true;
      importFileLabel.textContent = 'No file selected';
      importFileInput.value = '';

      showSettingsStatus('Success! Settings restored from backup.', false);
      renderProfilesList();
      renderRulesTab();
    });
  }
}

function factoryResetSettings() {
  if (confirm('DANGER! Are you sure you want to perform a factory reset? All your custom proxy profiles and switch rules will be permanently deleted.')) {
    chrome.storage.local.clear(() => {
      chrome.storage.local.set({
        activeProfileId: 'system',
        defaultProfileId: 'direct',
        profiles: {},
        rules: []
      }, async () => {
        await loadAllSettings();
        
        // Clear Editor form
        profileEditForm.reset();
        profileEditForm.style.display = 'none';
        editorEmptyState.style.display = 'flex';
        editProfileId.value = '';

        showSettingsStatus('Storage successfully reset to factory defaults.', false);
        renderProfilesList();
        renderRulesTab();
      });
    });
  }
}

function showSettingsStatus(msg, isErr) {
  settingsStatusMsg.style.display = 'block';
  settingsStatusMsg.textContent = msg;
  settingsStatusMsg.style.background = isErr ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)';
  settingsStatusMsg.style.borderColor = isErr ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
  settingsStatusMsg.style.color = isErr ? '#fca5a5' : '#a7f3d0';

  setTimeout(() => {
    settingsStatusMsg.style.display = 'none';
  }, 5000);
}

// ----------------------------------------------------
// UI HELPERS
// ----------------------------------------------------
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------
// COLLAPSIBLE SIDEBAR
// ----------------------------------------------------
function initSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');

  if (!sidebar || !toggleBtn) return;

  // Apply initial state from local storage
  chrome.storage.local.get(['sidebarCollapsed'], (result) => {
    if (result.sidebarCollapsed) {
      sidebar.classList.add('collapsed');
      toggleBtn.setAttribute('data-tooltip', 'Expand Sidebar');
      toggleBtn.setAttribute('title', 'Expand Sidebar');
    }
  });

  // Toggle state on click
  toggleBtn.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    toggleBtn.setAttribute('data-tooltip', isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar');
    toggleBtn.setAttribute('title', isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar');
    chrome.storage.local.set({ sidebarCollapsed: isCollapsed });
  });
}

// ----------------------------------------------------
// THEME & PRIVACY CONTROL LOGIC
// ----------------------------------------------------
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle-btn');
  if (!themeToggle) return;

  chrome.storage.local.get(['theme'], (result) => {
    const theme = result.theme || 'dark';
    setTheme(theme);
  });

  themeToggle.addEventListener('click', () => {
    chrome.storage.local.get(['theme'], (result) => {
      const currentTheme = result.theme || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
      chrome.storage.local.set({ theme: newTheme });
    });
  });
}

function setTheme(theme) {
  const themeToggle = document.getElementById('theme-toggle-btn');
  if (!themeToggle) return;
  
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    // Set to moon icon
    themeToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-dark"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
  } else {
    document.body.classList.remove('light-theme');
    // Set to sun icon
    themeToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-light"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
  }
}

function initPrivacyTab() {
  const webrtcToggle = document.getElementById('webrtc-shield-toggle');
  const healthToggle = document.getElementById('health-check-toggle');
  const configArea = document.getElementById('health-check-config-area');
  const intervalSelect = document.getElementById('health-check-interval-select');
  const fallbackSelect = document.getElementById('health-fallback-select');
  const rotationToggle = document.getElementById('rotation-toggle');
  const rotationConfigArea = document.getElementById('rotation-config-area');
  const rotationIntervalSelect = document.getElementById('rotation-interval-select');
  const saveBtn = document.getElementById('save-privacy-btn');
  const statusMsg = document.getElementById('privacy-status-msg');

  if (!webrtcToggle || !healthToggle || !rotationToggle || !saveBtn) return;

  // Toggle config area visibility
  healthToggle.addEventListener('change', () => {
    configArea.style.display = healthToggle.checked ? 'flex' : 'none';
  });

  rotationToggle.addEventListener('change', () => {
    rotationConfigArea.style.display = rotationToggle.checked ? 'flex' : 'none';
  });

  // Populate options and load initial values
  chrome.storage.local.get(
    ['profiles', 'webrtcShieldEnabled', 'healthCheckEnabled', 'healthCheckInterval', 'fallbackProfileId', 'rotationEnabled', 'rotationInterval'],
    (result) => {
      const profilesData = result.profiles || {};
      
      // Populate select
      fallbackSelect.innerHTML = '<option value="direct">DIRECT (No Proxy)</option>';
      Object.keys(profilesData).forEach(id => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = profilesData[id].name;
        fallbackSelect.appendChild(opt);
      });

      // Load values
      webrtcToggle.checked = result.webrtcShieldEnabled || false;
      healthToggle.checked = result.healthCheckEnabled || false;
      configArea.style.display = healthToggle.checked ? 'flex' : 'none';

      rotationToggle.checked = result.rotationEnabled || false;
      rotationConfigArea.style.display = rotationToggle.checked ? 'flex' : 'none';
      
      if (result.healthCheckInterval) {
        intervalSelect.value = String(result.healthCheckInterval);
      }
      if (result.fallbackProfileId) {
        fallbackSelect.value = result.fallbackProfileId;
      }
      if (result.rotationInterval) {
        rotationIntervalSelect.value = String(result.rotationInterval);
      }
    }
  );

  // Save settings click listener
  saveBtn.addEventListener('click', () => {
    const webrtcEnabled = webrtcToggle.checked;
    const healthEnabled = healthToggle.checked;
    const checkInterval = parseInt(intervalSelect.value);
    const fallbackId = fallbackSelect.value;
    const rotationEnabled = rotationToggle.checked;
    const rotationInterval = parseInt(rotationIntervalSelect.value);

    const privacySettings = {
      webrtcShieldEnabled: webrtcEnabled,
      healthCheckEnabled: healthEnabled,
      healthCheckInterval: checkInterval,
      fallbackProfileId: fallbackId,
      rotationEnabled: rotationEnabled,
      rotationInterval: rotationInterval
    };

    chrome.storage.local.set(privacySettings, () => {
      // Set WebRTC IP handling policy
      if (chrome.privacy && chrome.privacy.network) {
        chrome.privacy.network.webRTCIPHandlingPolicy.set({
          value: webrtcEnabled ? 'disable_non_proxied_udp' : 'default'
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error applying WebRTC policy:', chrome.runtime.lastError.message);
            showStatusMessage(statusMsg, 'Error applying WebRTC policy settings.', true);
          } else {
            showStatusMessage(statusMsg, 'Privacy and security settings saved successfully!', false);
          }
        });
      } else {
        showStatusMessage(statusMsg, 'Privacy settings saved locally (WebRTC API unavailable).', false);
      }
    });
  });
}

function showStatusMessage(elem, msg, isErr) {
  elem.style.display = 'block';
  elem.textContent = msg;
  elem.style.background = isErr ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)';
  elem.style.borderColor = isErr ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
  elem.style.color = isErr ? '#fca5a5' : '#a7f3d0';

  setTimeout(() => {
    elem.style.display = 'none';
  }, 4000);
}

// ----------------------------------------------------
// ROUTING SIMULATOR matched wildcard / regex tracer
// ----------------------------------------------------
function initSimulator() {
  const runBtn = document.getElementById('run-simulation-btn');
  const urlInput = document.getElementById('simulator-url-input');
  const resultsDiv = document.getElementById('simulator-results');
  const traceTree = document.getElementById('simulator-trace-tree');
  const dnsBadge = document.getElementById('simulator-dns-badge');
  const quickAddArea = document.getElementById('quick-add-rule-area');
  const quickAddSelect = document.getElementById('quick-add-profile-select');
  const quickAddBtn = document.getElementById('quick-add-save-btn');

  if (!runBtn || !urlInput) return;

  runBtn.addEventListener('click', async () => {
    const urlStr = urlInput.value.trim();
    if (!urlStr) return;

    let parsedUrl;
    try {
      parsedUrl = new URL(urlStr.startsWith('http') ? urlStr : 'http://' + urlStr);
    } catch (e) {
      alert('Please enter a valid URL.');
      return;
    }

    const host = parsedUrl.hostname;
    const url = parsedUrl.href;

    resultsDiv.style.display = 'block';
    traceTree.innerHTML = '';
    dnsBadge.style.display = 'block';
    dnsBadge.textContent = 'Resolving host IP via DoH...';

    // 1. Safe DNS Resolution via Cloudflare Secure DoH
    resolveDNS(host).then(ip => {
      if (ip) {
        dnsBadge.textContent = `Server IP: ${ip} (Resolving Location...)`;
        fetch(`https://freeipapi.com/api/json/${ip}`)
          .then(res => res.json())
          .then(data => {
            const country = data.countryName || 'Unknown';
            const flag = getFlagEmoji(data.countryCode);
            const city = data.cityName || '';
            dnsBadge.textContent = `Server IP: ${ip} • ${city ? city + ', ' : ''}${country} ${flag}`;
          })
          .catch(() => {
            dnsBadge.textContent = `Server IP: ${ip}`;
          });
      } else {
        dnsBadge.textContent = 'Bypassed / Could not resolve IP';
      }
    });

    const steps = [];

    // Step 1: Subnet bypass list check
    let isBypass = false;
    const bypassHosts = ['localhost', '127.0.0.1', '10.', '172.16.', '192.168.'];
    const isPlain = !host.includes('.');
    
    let bypassMatch = null;
    if (isPlain) {
      isBypass = true;
      bypassMatch = 'plain host (no dots)';
    } else {
      for (const b of bypassHosts) {
        if (host.startsWith(b) || host.includes('.' + b) || (b.endsWith('.') && host.includes(b))) {
          isBypass = true;
          bypassMatch = b;
          break;
        }
      }
    }

    steps.push({
      title: 'Local Intranet Bypass Check',
      desc: isBypass ? `Matched bypass criteria: ${bypassMatch}. Traffic routed directly.` : 'No private subnet match. Proceeding to rule matching...',
      status: isBypass ? 'matched' : 'skipped'
    });

    let finalTarget = 'DIRECT';
    let ruleMatched = false;

    if (isBypass) {
      finalTarget = 'DIRECT';
    } else {
      // Step 2: Auto Switch Rules
      for (const rule of rules) {
        let matched = false;
        if (rule.patternType === 'wildcard') {
          // Simulate shExpMatch
          const regexPattern = '^' + rule.pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
          const rx = new RegExp(regexPattern, 'i');
          matched = rx.test(host);
        } else if (rule.patternType === 'regexp') {
          const rx = new RegExp(rule.pattern, 'i');
          matched = rx.test(url);
        }

        if (matched && !ruleMatched) {
          ruleMatched = true;
          const profileName = rule.profileId === 'direct' ? 'DIRECT' : (profiles[rule.profileId] ? profiles[rule.profileId].name : 'DIRECT');
          steps.push({
            title: `Routing Rule: "${rule.pattern}" (${rule.patternType})`,
            desc: `Matched! Routing traffic through profile "${profileName}".`,
            status: 'matched'
          });
          finalTarget = rule.profileId;
        } else {
          steps.push({
            title: `Routing Rule: "${rule.pattern}" (${rule.patternType})`,
            desc: 'Did not match.',
            status: 'skipped'
          });
        }
      }

      // Step 3: Default fallback profile check
      if (!ruleMatched) {
        const fallbackName = defaultProfileId === 'direct' ? 'DIRECT (No Proxy)' : (profiles[defaultProfileId] ? profiles[defaultProfileId].name : 'DIRECT');
        steps.push({
          title: 'Default Fallback Routing',
          desc: `No routing rules matched. Routing traffic through default profile: "${fallbackName}".`,
          status: 'matched'
        });
        finalTarget = defaultProfileId;
      }
    }

    // Step 4: Final Output
    const finalProfileName = finalTarget === 'direct' ? 'DIRECT (No Proxy)' : (profiles[finalTarget] ? profiles[finalTarget].name : 'System/DIRECT');
    const targetProfile = profiles[finalTarget];
    let detailedDesc = '';
    
    if (targetProfile) {
      detailedDesc = `URL will connect via proxy: "${targetProfile.name}" (${targetProfile.scheme.toUpperCase()} • ${targetProfile.host}:${targetProfile.port})`;
    } else {
      detailedDesc = `URL will connect via: "${finalProfileName}".`;
    }

    steps.push({
      title: `Final Routing Connection`,
      desc: detailedDesc,
      status: 'final'
    });

    // Render timeline steps
    steps.forEach(step => {
      const row = document.createElement('div');
      row.className = `trace-step ${step.status}`;
      row.innerHTML = `
        <div class="trace-step-bullet"></div>
        <div class="trace-step-content">
          <div class="trace-step-title">${step.title}</div>
          <div class="trace-step-desc">${step.desc}</div>
        </div>
      `;
      traceTree.appendChild(row);
    });

    // 2. Interactive Quick Add Rule Form triggers
    if (!ruleMatched && !isBypass) {
      quickAddArea.style.display = 'block';
      quickAddSelect.innerHTML = '<option value="direct">DIRECT (No Proxy)</option>';
      Object.keys(profiles).forEach(pId => {
        const opt = document.createElement('option');
        opt.value = pId;
        opt.textContent = profiles[pId].name;
        quickAddSelect.appendChild(opt);
      });

      // Clear old click listener by cloning
      const newBtn = quickAddBtn.cloneNode(true);
      quickAddBtn.parentNode.replaceChild(newBtn, quickAddBtn);

      newBtn.addEventListener('click', () => {
        const chosenProfileId = quickAddSelect.value;
        const cleanHost = host.startsWith('www.') ? host.substring(4) : host;
        const rulePattern = `*${cleanHost}`;

        rules.push({
          id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          patternType: 'wildcard',
          pattern: rulePattern,
          profileId: chosenProfileId
        });

        chrome.storage.local.set({ rules }, () => {
          alert(`Routing rule created for "${rulePattern}" pointing to "${chosenProfileId === 'direct' ? 'DIRECT' : profiles[chosenProfileId].name}"`);
          quickAddArea.style.display = 'none';
          runBtn.click(); // Re-run simulation immediately to show the match
          renderRulesTab(); // Sync options rules tab
        });
      });
    } else {
      quickAddArea.style.display = 'none';
    }
  });
}

// Secure DNS over HTTPS Lookup using Cloudflare DNS
async function resolveDNS(hostname) {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`, {
      headers: { 'accept': 'application/dns-json' }
    });
    const data = await res.json();
    if (data.Answer && data.Answer.length > 0) {
      return data.Answer[0].data; // Returns resolved IP address
    }
  } catch (e) {
    console.error('DNS DoH failed:', e);
  }
  return null;
}

// Convert country code to emoji flag
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode === '-') return '🌐';
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🌐';
  }
}

// ----------------------------------------------------
// 100% LOCAL SHARING MODAL & TOKEN IMPORTER
// ----------------------------------------------------
function initSharingAndImport() {
  const shareProfileBtn = document.getElementById('share-profile-btn');
  const shareModal = document.getElementById('share-modal');
  const closeShareModalBtn = document.getElementById('close-share-modal-btn');
  const shareTokenInput = document.getElementById('share-token-input');
  const copyShareTokenBtn = document.getElementById('copy-share-token-btn');
  const qrCanvas = document.getElementById('share-qr-canvas');
  const importTokenBtn = document.getElementById('import-token-btn');

  if (shareProfileBtn && shareModal) {
    shareProfileBtn.addEventListener('click', () => {
      const id = editProfileId.value;
      if (!id || !profiles[id]) return;

      const prof = profiles[id];
      const rawData = {
        name: prof.name,
        scheme: prof.scheme,
        host: prof.host,
        port: prof.port,
        username: prof.username || '',
        password: prof.password || '',
        bypassList: prof.bypassList || ''
      };

      // Base64 encode details
      const token = btoa(JSON.stringify(rawData));
      shareTokenInput.value = token;

      // Draw offline QR code on canvas using local script (zero network calls)
      try {
        const qr = qrcode(0, 'L'); // Auto calculate version
        qr.addData(token);
        qr.make();
        
        const ctx = qrCanvas.getContext('2d');
        const canvasSize = 150;
        qrCanvas.width = canvasSize;
        qrCanvas.height = canvasSize;
        ctx.clearRect(0, 0, canvasSize, canvasSize);
        
        const moduleCount = qr.getModuleCount();
        const cellSize = Math.floor(canvasSize / moduleCount);
        const margin = Math.floor((canvasSize - (moduleCount * cellSize)) / 2);
        
        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        
        // Draw black code dots
        ctx.fillStyle = 'black';
        for (let row = 0; row < moduleCount; row++) {
          for (let col = 0; col < moduleCount; col++) {
            if (qr.isDark(row, col)) {
              ctx.fillRect(
                margin + col * cellSize,
                margin + row * cellSize,
                cellSize,
                cellSize
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to generate offline QR code:', err);
      }

      shareModal.style.display = 'flex';
    });

    closeShareModalBtn.addEventListener('click', () => {
      shareModal.style.display = 'none';
    });

    copyShareTokenBtn.addEventListener('click', () => {
      shareTokenInput.select();
      document.execCommand('copy');
      copyShareTokenBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyShareTokenBtn.textContent = 'Copy Token to Clipboard';
      }, 2000);
    });
  }

  // Import Token listener
  if (importTokenBtn) {
    importTokenBtn.addEventListener('click', () => {
      const token = prompt('Paste your Base64 Share Token below to import a proxy profile:');
      if (!token) return;
      try {
        const parsed = JSON.parse(atob(token.trim()));
        if (parsed.name && parsed.scheme && parsed.host && parsed.port) {
          const newId = `profile-${Date.now()}`;
          profiles[newId] = {
            id: newId,
            name: parsed.name + ' (Imported)',
            scheme: parsed.scheme,
            host: parsed.host,
            port: parsed.port,
            username: parsed.username || '',
            password: parsed.password || '',
            bypassList: parsed.bypassList || ''
          };
          chrome.storage.local.set({ profiles }, () => {
            alert(`Successfully imported proxy profile: "${profiles[newId].name}"`);
            renderProfilesList();
          });
        } else {
          throw new Error('Invalid token structure');
        }
      } catch (e) {
        alert('Invalid Share Token. Please verify you copied the entire token.');
      }
    });
  }
}

// Check if options tab loaded with a query import link (e.g. options.html?import=...)
function checkQueryImport() {
  const urlParams = new URLSearchParams(window.location.search);
  const importToken = urlParams.get('import');
  if (importToken) {
    try {
      const parsed = JSON.parse(atob(importToken.trim()));
      if (parsed.name && parsed.scheme && parsed.host && parsed.port) {
        // Clear forms and open editor in "new profile" state populated
        createNewProfile();
        editProfileName.value = parsed.name + ' (Shared)';
        editProfileScheme.value = parsed.scheme;
        editProfileHost.value = parsed.host;
        editProfilePort.value = parsed.port;
        editProfileUsername.value = parsed.username || '';
        editProfilePassword.value = parsed.password || '';
        editProfileBypass.value = parsed.bypassList || '';
        
        editProfileName.focus();
        
        // Remove import parameter from URL so page reloads don't prompt
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.error('Failed to parse query import link:', e);
    }
  }
}

// Draw HTML5 Canvas latency history line graph
function drawLatencyGraph(profileId) {
  const container = document.getElementById('latency-graph-container');
  const canvas = document.getElementById('latency-history-canvas');
  if (!container || !canvas) return;

  chrome.storage.local.get(['pingHistories'], (result) => {
    const histories = result.pingHistories || {};
    const history = histories[profileId] || [];

    if (history.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 20;
    const graphWidth = canvas.width - padding * 2;
    const graphHeight = canvas.height - padding * 2;

    // Find min and max latency for scaling
    let maxLatency = Math.max(...history, 100);
    let minLatency = 0;
    
    // Pad max latency slightly
    maxLatency = Math.ceil(maxLatency * 1.2);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 2; i++) {
      const y = padding + (graphHeight / 2) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      // Label values
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '8px sans-serif';
      const labelVal = Math.round(maxLatency - (maxLatency / 2) * i);
      ctx.fillText(`${labelVal}ms`, padding - 15, y + 3);
    }

    // Plot points
    ctx.beginPath();
    history.forEach((ms, index) => {
      const x = padding + (graphWidth / (history.length - 1 || 1)) * index;
      const y = padding + graphHeight - (ms / maxLatency) * graphHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Stroke the line
    ctx.strokeStyle = '#6366f1'; // Indigo color
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // Fill area below the line with gradient
    ctx.lineTo(padding + graphWidth, padding + graphHeight);
    ctx.lineTo(padding, padding + graphHeight);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + graphHeight);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw circles on the points
    history.forEach((ms, index) => {
      const x = padding + (graphWidth / (history.length - 1 || 1)) * index;
      const y = padding + graphHeight - (ms / maxLatency) * graphHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#818cf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  });
}
