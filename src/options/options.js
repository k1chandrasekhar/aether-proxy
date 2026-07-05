// AetherProxy Dashboard Options Logic

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
  // 1. Initialize Tabs Navigation
  initTabs();

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

    tab.innerHTML = `
      <div class="profile-tab-bullet"></div>
      <div style="overflow: hidden; flex: 1;">
        <div class="profile-tab-name">${escapeHTML(prof.name)}</div>
        <div class="profile-tab-meta">${prof.scheme.toUpperCase()} • ${escapeHTML(prof.host)}:${prof.port}</div>
      </div>
    `;

    tab.addEventListener('click', () => {
      loadProfileToEditor(id);
    });

    profilesListContainer.appendChild(tab);
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
