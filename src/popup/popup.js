// AetherProxy Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
  const customContainer = document.getElementById('custom-profiles-container');
  const emptyState = document.getElementById('empty-custom-state');
  const activeModeLabel = document.getElementById('active-mode-label');
  const statusLight = document.getElementById('status-light');
  const openSettingsBtn = document.getElementById('open-settings');

  const failedBtn = document.getElementById('failed-resources-btn');
  const failedDrawer = document.getElementById('failed-resources-drawer');
  const failedList = document.getElementById('failed-domains-list');

  const quickRoutePanel = document.getElementById('quick-route-panel');
  const activeDomainLabel = document.getElementById('active-domain-name');
  const quickSelect = document.getElementById('quick-route-profile-select');
  const addQuickRuleBtn = document.getElementById('add-quick-rule-btn');

  let profiles = {};
  let rules = [];
  let activeProfileId = 'system';
  let currentTabId = null;
  let activeDomain = '';

  // 1. Load and render current profiles
  chrome.storage.local.get(['profiles', 'rules', 'activeProfileId'], (result) => {
    profiles = result.profiles || {};
    rules = result.rules || [];
    activeProfileId = result.activeProfileId || 'system';

    // Update UI Selection for Built-in Modes
    updateSelectionInDOM(activeProfileId);

    // Render Custom Profiles
    const customProfileIds = Object.keys(profiles);
    
    if (customProfileIds.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      customContainer.innerHTML = '';
      
      customProfileIds.forEach(id => {
        const prof = profiles[id];
        if (!prof) return;

        const item = document.createElement('div');
        item.className = `profile-item ${id === activeProfileId ? 'active' : ''}`;
        item.setAttribute('data-id', id);
        
        item.innerHTML = `
          <div class="profile-bullet custom"></div>
          <div class="profile-info">
            <div class="profile-name">${escapeHTML(prof.name)}</div>
            <div class="profile-meta">${prof.scheme.toUpperCase()} Proxy • ${escapeHTML(prof.host)}:${prof.port}</div>
          </div>
        `;

        item.addEventListener('click', () => {
          setActiveProfile(id);
        });

        customContainer.appendChild(item);
      });
    }

    // Initialize Active Tab Quick Routing and Failed Resources
    initActiveTabRoutingAndErrors();
  });

  // Open Options dashboard
  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Bind click handlers to built-in modes
  document.querySelectorAll('.profiles-list > .profile-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      setActiveProfile(id);
    });
  });

  // Toggle Failed Resources Drawer
  failedBtn.addEventListener('click', () => {
    const isVisible = failedDrawer.style.display === 'block';
    failedDrawer.style.display = isVisible ? 'none' : 'block';
  });

  // Helper: Update Active profile in storage and close popup
  function setActiveProfile(profileId) {
    chrome.storage.local.set({ activeProfileId: profileId }, () => {
      updateSelectionInDOM(profileId);
      setTimeout(() => {
        window.close();
      }, 150);
    });
  }

  // Helper: Update active selected items in popup DOM
  function updateSelectionInDOM(profileId) {
    document.querySelectorAll('.profile-item').forEach(item => {
      item.classList.remove('active');
    });

    const targetItem = document.querySelector(`.profile-item[data-id="${profileId}"]`);
    if (targetItem) {
      targetItem.classList.add('active');
    }

    let label = 'System Default';
    let statusClass = 'system';

    if (profileId === 'direct') {
      label = 'Direct Mode';
      statusClass = 'direct';
    } else if (profileId === 'auto-switch') {
      label = 'Auto Switch';
      statusClass = 'switch';
    } else if (profileId !== 'system') {
      if (targetItem) {
        label = targetItem.querySelector('.profile-name').textContent;
      } else {
        label = 'Proxy Server';
      }
      statusClass = 'custom';
    }

    activeModeLabel.textContent = label;
    statusLight.className = `status-light ${statusClass}`;
  }

  // Active Tab Routing & Failed Resources Checker
  function initActiveTabRoutingAndErrors() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const activeTab = tabs[0];
      currentTabId = activeTab.id;

      if (!activeTab.url) return;

      try {
        const url = new URL(activeTab.url);
        
        // Restrict quick-routing to standard HTTP/HTTPS sites
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          quickRoutePanel.style.display = 'none';
          return;
        }

        activeDomain = url.hostname;
        const cleanDomain = activeDomain.startsWith('www.') ? activeDomain.substring(4) : activeDomain;
        const rulePattern = `*${cleanDomain}`;

        // Update Quick Router Title
        activeDomainLabel.textContent = activeDomain;
        activeDomainLabel.setAttribute('title', activeDomain);

        // Populate Quick Router Select Dropdown
        quickSelect.innerHTML = '<option value="direct">DIRECT (No Proxy)</option>';
        Object.keys(profiles).forEach(id => {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = profiles[id].name;
          quickSelect.appendChild(opt);
        });

        // Pre-select if there is an active matching rule for this domain
        const matchedRule = rules.find(r => r.pattern === rulePattern || r.pattern === activeDomain);
        if (matchedRule) {
          quickSelect.value = matchedRule.profileId;
        } else {
          quickSelect.value = 'direct';
        }

        // Show Quick Router Panel
        quickRoutePanel.style.display = 'flex';

        // Add / Update quick rule on button click
        addQuickRuleBtn.addEventListener('click', () => {
          const selectedProfileId = quickSelect.value;
          addOrUpdateRule(rulePattern, selectedProfileId);
        });

        // Query background service-worker for failed resources
        fetchFailedResources(currentTabId);

      } catch (e) {
        console.error('Error initializing active tab quick routing:', e);
      }
    });
  }

  // Fetch failed resources from background worker
  function fetchFailedResources(tabId) {
    chrome.runtime.sendMessage({ action: 'getFailedResources', tabId: tabId }, (response) => {
      if (response && response.failedResources && response.failedResources.length > 0) {
        const count = response.failedResources.length;
        document.getElementById('failed-resources-count').textContent = `${count} failed resources`;
        failedBtn.style.display = 'flex';

        failedList.innerHTML = '';
        response.failedResources.forEach(failedDomain => {
          const cleanFailedDomain = failedDomain.startsWith('www.') ? failedDomain.substring(4) : failedDomain;
          const failedPattern = `*${cleanFailedDomain}`;

          // Find current rule mapping for this failed domain if exists
          let currentProfileId = 'direct';
          const matchedRule = rules.find(r => r.pattern === failedPattern || r.pattern === failedDomain);
          if (matchedRule) {
            currentProfileId = matchedRule.profileId;
          }

          // Build select options
          let optionsHtml = '<option value="direct">DIRECT</option>';
          Object.keys(profiles).forEach(id => {
            optionsHtml += `<option value="${id}" ${currentProfileId === id ? 'selected' : ''}>${escapeHTML(profiles[id].name)}</option>`;
          });

          const row = document.createElement('div');
          row.className = 'failed-domain-row';
          row.innerHTML = `
            <span class="failed-domain-name" title="${escapeHTML(failedDomain)}">${escapeHTML(failedDomain)}</span>
            <select class="failed-domain-select" data-pattern="${failedPattern}">
              ${optionsHtml}
            </select>
          `;

          // Bind change handler
          row.querySelector('.failed-domain-select').addEventListener('change', (e) => {
            const selectedProfileId = e.target.value;
            addOrUpdateRule(failedPattern, selectedProfileId, false);
          });

          failedList.appendChild(row);
        });
      } else {
        failedBtn.style.display = 'none';
        failedDrawer.style.display = 'none';
      }
    });
  }

  // Add or Update Auto Switch Rules
  function addOrUpdateRule(pattern, profileId, closeOnSave = true) {
    chrome.storage.local.get(['rules'], (result) => {
      let currentRules = result.rules || [];
      const index = currentRules.findIndex(r => r.pattern === pattern);

      if (index > -1) {
        currentRules[index].profileId = profileId;
      } else {
        currentRules.push({
          id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          patternType: 'wildcard',
          pattern: pattern,
          profileId: profileId
        });
      }

      chrome.storage.local.set({ rules: currentRules }, () => {
        // Automatically switch active profile to auto-switch so the newly added rule takes effect immediately!
        chrome.storage.local.set({ activeProfileId: 'auto-switch' }, () => {
          updateSelectionInDOM('auto-switch');
          
          if (closeOnSave) {
            // Success animation or close
            setTimeout(() => {
              window.close();
            }, 150);
          } else {
            // Update rules in local memory and refresh failed list without closing
            rules = currentRules;
          }
        });
      });
    });
  }

  // Helper: Escape HTML strings to prevent XSS injection
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
