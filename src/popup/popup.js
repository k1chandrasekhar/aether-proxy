// AetherProxy Popup Logic

// Apply theme instantly on startup
chrome.storage.local.get(['theme'], (res) => {
  if (res.theme === 'light') {
    document.body.classList.add('light-theme');
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const customContainer = document.getElementById('custom-profiles-container');
  const emptyState = document.getElementById('empty-custom-state');
  const activeModeLabel = document.getElementById('active-mode-label');
  const statusLight = document.getElementById('status-light');
  const openSettingsBtn = document.getElementById('open-settings');

  const failedBtn = document.getElementById('failed-resources-btn');
  const failedDrawer = document.getElementById('failed-resources-drawer');
  const failedList = document.getElementById('failed-domains-list');

  const privacyBtn = document.getElementById('privacy-audit-btn');
  const privacyDrawer = document.getElementById('privacy-audit-drawer');
  const cookiesCountLabel = document.getElementById('audit-cookies-count');
  const trackersCountLabel = document.getElementById('audit-trackers-count');
  const trackersContainer = document.getElementById('trackers-sublist-container');
  const trackersList = document.getElementById('trackers-list');

  const quickRoutePanel = document.getElementById('quick-route-panel');
  const activeDomainLabel = document.getElementById('active-domain-name');
  const quickSelect = document.getElementById('quick-route-profile-select');
  const quickSessionCheckbox = document.getElementById('quick-route-session-only');
  const addQuickRuleBtn = document.getElementById('add-quick-rule-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');

  let profiles = {};
  let rules = [];
  let activeProfileId = 'system';
  let currentTabId = null;
  let activeDomain = '';

  // Initialize Theme Toggle UI state
  initThemeUI();

  // 1. Load and render current profiles & rules
  chrome.storage.local.get(['profiles', 'rules', 'activeProfileId'], (localResult) => {
    chrome.storage.session.get(['rules'], (sessionResult) => {
      profiles = localResult.profiles || {};
      const localRules = localResult.rules || [];
      const sessionRules = sessionResult.rules || [];

      // Combine rules (session rules first/precedent)
      rules = [...sessionRules, ...localRules];
      activeProfileId = localResult.activeProfileId || 'system';

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

      // Initialize Active Tab Quick Routing, Cookies, and Trackers
      initActiveTabRoutingAndErrors();

      // Trigger GeoIP lookup
      fetchGeoIP();
    });
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

  // Toggle Privacy Audit Drawer
  privacyBtn.addEventListener('click', () => {
    const isVisible = privacyDrawer.style.display === 'flex';
    privacyDrawer.style.display = isVisible ? 'none' : 'flex';
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
    } else if (profileId === 'smart-auto-select') {
      label = 'Smart Auto-Select';
      statusClass = 'smart';
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

  // Active Tab Routing, Cookies & Failed Resources
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
          const sessionOnly = quickSessionCheckbox.checked;
          addOrUpdateRule(rulePattern, selectedProfileId, true, sessionOnly);
        });

        // Audit local cookies set by the active website
        chrome.cookies.getAll({ domain: cleanDomain }, (cookies) => {
          const count = cookies ? cookies.length : 0;
          cookiesCountLabel.textContent = `${count} cookies`;
        });

        // Query background service-worker for failed resources and third-party trackers
        fetchFailedResourcesAndTrackers(currentTabId);

      } catch (e) {
        console.error('Error initializing active tab quick routing:', e);
      }
    });
  }

  // Fetch failed resources and third-party trackers
  function fetchFailedResourcesAndTrackers(tabId) {
    chrome.runtime.sendMessage({ action: 'getFailedResources', tabId: tabId }, (response) => {
      if (response) {
        // 1. Render Failed Resources List
        const failedRes = response.failedResources || [];
        if (failedRes.length > 0) {
          document.getElementById('failed-resources-count').textContent = `${failedRes.length} failed resources`;
          failedBtn.style.display = 'flex';

          failedList.innerHTML = '';
          failedRes.forEach(failedDomain => {
            const cleanFailedDomain = failedDomain.startsWith('www.') ? failedDomain.substring(4) : failedDomain;
            const failedPattern = `*${cleanFailedDomain}`;

            let currentProfileId = 'direct';
            const matchedRule = rules.find(r => r.pattern === failedPattern || r.pattern === failedDomain);
            if (matchedRule) {
              currentProfileId = matchedRule.profileId;
            }

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

            row.querySelector('.failed-domain-select').addEventListener('change', (e) => {
              addOrUpdateRule(failedPattern, e.target.value, false, false);
            });

            failedList.appendChild(row);
          });
        } else {
          failedBtn.style.display = 'none';
          failedDrawer.style.display = 'none';
        }

        // 2. Render Third-party Tracker Domains
        const trackers = response.trackers || [];
        trackersCountLabel.textContent = `${trackers.length} domains`;

        if (trackers.length > 0) {
          trackersContainer.style.display = 'block';
          trackersList.innerHTML = '';

          trackers.forEach(trackerDomain => {
            const cleanTrackerDomain = trackerDomain.startsWith('www.') ? trackerDomain.substring(4) : trackerDomain;
            const trackerPattern = `*${cleanTrackerDomain}`;

            let currentProfileId = 'direct';
            const matchedRule = rules.find(r => r.pattern === trackerPattern || r.pattern === trackerDomain);
            if (matchedRule) {
              currentProfileId = matchedRule.profileId;
            }

            let optionsHtml = '<option value="direct">DIRECT</option>';
            Object.keys(profiles).forEach(id => {
              optionsHtml += `<option value="${id}" ${currentProfileId === id ? 'selected' : ''}>${escapeHTML(profiles[id].name)}</option>`;
            });

            const row = document.createElement('div');
            row.className = 'tracker-row';
            row.innerHTML = `
              <span class="tracker-name" title="${escapeHTML(trackerDomain)}">${escapeHTML(trackerDomain)}</span>
              <select class="tracker-action-select" data-pattern="${trackerPattern}">
                ${optionsHtml}
              </select>
            `;

            row.querySelector('.tracker-action-select').addEventListener('change', (e) => {
              addOrUpdateRule(trackerPattern, e.target.value, false, false);
            });

            trackersList.appendChild(row);
          });
        } else {
          trackersContainer.style.display = 'none';
        }
      }
    });
  }

  // Add or Update Switch Rules (Permanent or Session-only)
  function addOrUpdateRule(pattern, profileId, closeOnSave = true, sessionOnly = false) {
    const storageArea = sessionOnly ? chrome.storage.session : chrome.storage.local;

    storageArea.get(['rules'], (result) => {
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

      storageArea.set({ rules: currentRules }, () => {
        // Automatically switch active profile to auto-switch
        chrome.storage.local.set({ activeProfileId: 'auto-switch' }, () => {
          updateSelectionInDOM('auto-switch');
          
          if (closeOnSave) {
            setTimeout(() => {
              window.close();
            }, 150);
          } else {
            // Update rules in local memory
            rules = currentRules;
          }
        });
      });
    });
  }

  // Theme Controller
  function initThemeUI() {
    if (!themeToggleBtn) return;

    chrome.storage.local.get(['theme'], (result) => {
      const theme = result.theme || 'dark';
      setPopupTheme(theme);
    });

    themeToggleBtn.addEventListener('click', () => {
      chrome.storage.local.get(['theme'], (result) => {
        const currentTheme = result.theme || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setPopupTheme(newTheme);
        chrome.storage.local.set({ theme: newTheme });
      });
    });
  }

  function setPopupTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      themeToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-dark"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    } else {
      document.body.classList.remove('light-theme');
      themeToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-light"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    }
  }

  // Helper: Escape HTML strings
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 100% Secure read-only Geo-IP Lookup
  function fetchGeoIP() {
    const badge = document.getElementById('geoip-badge');
    if (!badge) return;

    badge.textContent = 'Locating...';
    badge.style.opacity = '0.7';

    fetch('https://freeipapi.com/api/json')
      .then(res => {
        if (!res.ok) throw new Error('API Rate Limit or Offline');
        return res.json();
      })
      .then(data => {
        const ip = data.ipAddress || 'Unknown IP';
        const country = data.countryName || 'Unknown';
        const city = data.cityName || '';
        const flag = getFlagEmoji(data.countryCode);
        
        const locationStr = city ? `${city}, ${country}` : country;
        badge.textContent = `${ip} • ${locationStr} ${flag}`;
        badge.setAttribute('title', `IP Address: ${ip}\nLocation: ${locationStr}\nISP: ${data.isp || 'Local Network'}`);
        badge.style.opacity = '1';
      })
      .catch(err => {
        console.error('GeoIP lookup failed:', err);
        badge.textContent = 'DIRECT / Offline';
        badge.setAttribute('title', 'Offline or direct connection. Unable to retrieve tunnel GeoIP.');
        badge.style.opacity = '0.6';
      });
  }

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
});
