// AetherProxy Manifest V3 Service Worker

let activeProfiles = {};
let activeRules = [];
let activeProfileId = 'system';
let defaultProfileId = 'direct';

// Helper: Load settings from local storage and session storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['profiles', 'rules', 'activeProfileId', 'defaultProfileId'], (localResult) => {
      activeProfiles = localResult.profiles || {};
      activeProfileId = localResult.activeProfileId || 'system';
      defaultProfileId = localResult.defaultProfileId || 'direct';

      // Read session storage for temporary rules
      chrome.storage.session.get(['rules'], (sessionResult) => {
        const sessionRules = sessionResult.rules || [];
        // Combine session rules and local rules (session rules take precedence)
        activeRules = [...sessionRules, ...(localResult.rules || [])];
        resolve();
      });
    });
  });
}

// Helper: Compile Auto Switch rules into a browser PAC Script
function compilePacScript() {
  let script = `
    function FindProxyForURL(url, host) {
      // 1. Host match bypasses (localhost, intranet)
      if (
        isPlainHostName(host) ||
        shExpMatch(host, '127.0.0.1') ||
        shExpMatch(host, 'localhost') ||
        shExpMatch(host, '10.*') ||
        shExpMatch(host, '172.16.*') ||
        shExpMatch(host, '192.168.*')
      ) {
        return 'DIRECT';
      }
  `;

  // 2. Add custom switch rules
  activeRules.forEach(rule => {
    if (!rule.pattern || !rule.profileId) return;

    let targetProxy = 'DIRECT';
    if (rule.profileId !== 'direct') {
      const prof = activeProfiles[rule.profileId];
      if (prof) {
        // Scheme in PAC: 'PROXY' (HTTP), 'SOCKS' (SOCKS4), 'SOCKS5' (SOCKS5), or 'HTTPS' (HTTPS)
        let pacScheme = 'PROXY';
        if (prof.scheme === 'socks5') pacScheme = 'SOCKS5';
        else if (prof.scheme === 'socks4') pacScheme = 'SOCKS';
        else if (prof.scheme === 'https') pacScheme = 'HTTPS';
        targetProxy = `${pacScheme} ${prof.host}:${prof.port}`;
      }
    }

    if (rule.patternType === 'wildcard') {
      script += `
      if (shExpMatch(host, '${rule.pattern}')) {
        return '${targetProxy}';
      }
      `;
    } else if (rule.patternType === 'regexp') {
      script += `
      if (/${rule.pattern}/i.test(url)) {
        return '${targetProxy}';
      }
      `;
    }
  });

  // 3. Fallback default profile
  let defaultProxy = 'DIRECT';
  if (defaultProfileId !== 'direct') {
    const defaultProf = activeProfiles[defaultProfileId];
    if (defaultProf) {
      let pacScheme = 'PROXY';
      if (defaultProf.scheme === 'socks5') pacScheme = 'SOCKS5';
      else if (defaultProf.scheme === 'socks4') pacScheme = 'SOCKS';
      else if (defaultProf.scheme === 'https') pacScheme = 'HTTPS';
      defaultProxy = `${pacScheme} ${defaultProf.host}:${defaultProf.port}`;
    }
  }

  script += `
      return '${defaultProxy}';
    }
  `;

  return script;
}

// Main: Apply the active proxy profile config to Chrome settings
async function applyProxySettings() {
  await loadSettings();
  console.log(`Applying proxy configuration: Active Profile ID = ${activeProfileId}`);

  let config = {};

  if (activeProfileId === 'system') {
    config = { mode: 'system' };
  } else if (activeProfileId === 'direct') {
    config = { mode: 'direct' };
  } else if (activeProfileId === 'auto-switch') {
    const pacScript = compilePacScript();
    config = {
      mode: 'pac_script',
      pacScript: {
        data: pacScript
      }
    };
  } else if (activeProfileId === 'smart-auto-select') {
    const fastestProfileId = (await getLocalStorage('fastestProfileId')) || 'direct';
    const profile = activeProfiles[fastestProfileId];
    if (!profile) {
      config = { mode: 'direct' };
    } else {
      config = {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: profile.scheme || 'http',
            host: profile.host,
            port: parseInt(profile.port)
          },
          bypassList: profile.bypassList ? profile.bypassList.split(',').map(s => s.trim()).filter(Boolean) : []
        }
      };
    }
  } else if (activeProfileId === 'rotation') {
    const rotationActiveId = (await getLocalStorage('rotationActiveId')) || 'direct';
    const profile = activeProfiles[rotationActiveId];
    if (!profile) {
      config = { mode: 'direct' };
    } else {
      config = {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: profile.scheme || 'http',
            host: profile.host,
            port: parseInt(profile.port)
          },
          bypassList: profile.bypassList ? profile.bypassList.split(',').map(s => s.trim()).filter(Boolean) : []
        }
      };
    }
  } else {
    const profile = activeProfiles[activeProfileId];
    if (!profile) {
      console.warn(`Profile ID "${activeProfileId}" not found, falling back to system default.`);
      config = { mode: 'system' };
    } else {
      let scheme = profile.scheme || 'http';
      config = {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: scheme,
            host: profile.host,
            port: parseInt(profile.port)
          },
          bypassList: profile.bypassList ? profile.bypassList.split(',').map(s => s.trim()).filter(Boolean) : []
        }
      };
    }
  }

  chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error applying proxy settings:', chrome.runtime.lastError.message);
    } else {
      console.log('Proxy settings successfully applied!');
    }
  });
}

// Initialize on background startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('AetherProxy installed.');
  
  chrome.storage.local.get(['activeProfileId'], (result) => {
    if (!result.activeProfileId) {
      chrome.storage.local.set({
        activeProfileId: 'system',
        defaultProfileId: 'direct',
        profiles: {},
        rules: [],
        healthCheckEnabled: false,
        healthCheckInterval: 60000,
        fallbackProfileId: 'direct',
        rotationEnabled: false,
        rotationInterval: 300000,
        rotationActiveId: 'direct'
      }, () => {
        applyProxySettings();
        startHealthCheck();
        startSmartAutoSelectChecker();
        startProxyRotation();
      });
    } else {
      applyProxySettings();
      startHealthCheck();
      startSmartAutoSelectChecker();
      startProxyRotation();
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  applyProxySettings();
  startHealthCheck();
  startSmartAutoSelectChecker();
  startProxyRotation();
});

function onStorageChange(changes, area) {
  if (area === 'local') {
    applyProxySettings();
    if (changes.healthCheckEnabled || changes.healthCheckInterval || changes.activeProfileId) {
      startHealthCheck();
    }
    if (changes.activeProfileId) {
      startSmartAutoSelectChecker();
    }
    if (changes.rotationEnabled || changes.rotationInterval || changes.activeProfileId) {
      startProxyRotation();
    }
  } else if (area === 'session') {
    applyProxySettings();
  }
}

// Watch for settings changes and hot-swap proxy config immediately
chrome.storage.onChanged.addListener(onStorageChange);

// Proxy Credentials challenge interceptor (Async Auth for Manifest V3)
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (!details.isProxy) {
      callback({});
      return;
    }

    console.log(`Proxy auth requested by ${details.challenger.host}:${details.challenger.port}`);

    for (const profId in activeProfiles) {
      const prof = activeProfiles[profId];
      if (
        prof &&
        prof.username &&
        prof.password &&
        prof.host.toLowerCase() === details.challenger.host.toLowerCase() &&
        parseInt(prof.port) === details.challenger.port
      ) {
        console.log(`Supplying credentials for proxy profile "${prof.name}"`);
        callback({
          authCredentials: {
            username: prof.username,
            password: prof.password
          }
        });
        return;
      }
    }

    callback({});
  },
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
);

// ----------------------------------------------------
// FAILED RESOURCES & THIRD-PARTY TRACKER AUDITING
// ----------------------------------------------------
const failedResourcesByTab = {};
const trackersByTab = {};

// Helper: Extract root domain name (e.g. mail.google.com -> google.com)
function getRootDomain(hostname) {
  if (!hostname) return '';
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  const lastTwo = parts.slice(-2).join('.');
  if (['co.uk', 'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'co.jp', 'com.br'].includes(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

// Capture network load errors
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.tabId < 0) return;
    if (details.error === 'net::ERR_ABORTED') return;
    if (details.url.startsWith('chrome-extension://')) return;

    try {
      const url = new URL(details.url);
      const host = url.hostname;

      if (!failedResourcesByTab[details.tabId]) {
        failedResourcesByTab[details.tabId] = new Set();
      }

      failedResourcesByTab[details.tabId].add(host);

      // Update badge text and color (amber warning count) — guard against closed tabs
      const count = failedResourcesByTab[details.tabId].size;
      chrome.tabs.get(details.tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return; // Tab was already closed
        chrome.action.setBadgeText({ text: String(count), tabId: details.tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId: details.tabId });
      });
    } catch (e) {
      console.error('Error tracking failed resource:', e);
    }
  },
  { urls: ['<all_urls>'] }
);

// Audit outgoing requests for third-party trackers
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;
    if (details.url.startsWith('chrome-extension://')) return;
    if (!details.initiator) return;

    try {
      const initiatorUrl = new URL(details.initiator);
      const requestUrl = new URL(details.url);

      const initiatorRoot = getRootDomain(initiatorUrl.hostname);
      const requestRoot = getRootDomain(requestUrl.hostname);

      if (initiatorRoot && requestRoot && initiatorRoot !== requestRoot) {
        if (!trackersByTab[details.tabId]) {
          trackersByTab[details.tabId] = new Set();
        }
        trackersByTab[details.tabId].add(requestUrl.hostname);
      }
    } catch (e) {
      // Fail silently
    }
  },
  { urls: ['<all_urls>'] }
);

// Reset error/tracker cache when a tab navigates to a new site
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) { // Only reset on main page loads
    delete failedResourcesByTab[details.tabId];
    delete trackersByTab[details.tabId];
    // Guard against stale tab IDs during rapid navigation or tab close
    chrome.tabs.get(details.tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) return;
      chrome.action.setBadgeText({ text: '', tabId: details.tabId });
    });
  }
});

// Clean up tracker caches when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete failedResourcesByTab[tabId];
  delete trackersByTab[tabId];
});

// Listen for queries from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getFailedResources') {
    const failedList = failedResourcesByTab[message.tabId] ? Array.from(failedResourcesByTab[message.tabId]) : [];
    const trackerList = trackersByTab[message.tabId] ? Array.from(trackersByTab[message.tabId]) : [];
    sendResponse({ 
      failedResources: failedList,
      trackers: trackerList
    });
  }
});

// ----------------------------------------------------
// ACTIVE PROXY HEALTH MONITOR & FAILOVER
// ----------------------------------------------------
let healthIntervalId = null;
let failedChecksCount = 0;

function startHealthCheck() {
  if (healthIntervalId) {
    clearInterval(healthIntervalId);
    healthIntervalId = null;
  }

  chrome.storage.local.get(['healthCheckEnabled', 'healthCheckInterval'], (res) => {
    const enabled = res.healthCheckEnabled || false;
    const interval = res.healthCheckInterval || 60000;

    if (enabled) {
      healthIntervalId = setInterval(checkActiveProxyHealth, interval);
    }
  });
}

async function checkActiveProxyHealth() {
  // Only monitor custom single proxy servers
  if (activeProfileId === 'system' || activeProfileId === 'direct' || activeProfileId === 'auto-switch') {
    failedChecksCount = 0;
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response) {
      failedChecksCount = 0;
    } else {
      throw new Error('No response body');
    }
  } catch (err) {
    failedChecksCount++;
    console.warn(`Health monitor failed (${failedChecksCount}/2) for active proxy:`, err);

    if (failedChecksCount >= 2) {
      failedChecksCount = 0;
      triggerFailover();
    }
  }
}

function triggerFailover() {
  chrome.storage.local.get(['fallbackProfileId', 'profiles'], (res) => {
    const fallbackId = res.fallbackProfileId || 'direct';
    const profiles = res.profiles || {};

    const offlineName = profiles[activeProfileId] ? profiles[activeProfileId].name : 'Active Proxy';
    const fallbackName = fallbackId === 'direct' ? 'DIRECT (No Proxy)' : (profiles[fallbackId] ? profiles[fallbackId].name : 'System');

    chrome.storage.local.set({ activeProfileId: fallbackId }, () => {
      // Trigger native notification
      chrome.notifications.create('failover-alert', {
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: 'Proxy Offline - Failover Triggered',
        message: `"${offlineName}" went offline. Traffic auto-routed through fallback: "${fallbackName}".`,
        priority: 2
      });
    });
  });
}

// Helper: Get item from Local Storage asynchronously
function getLocalStorage(key) {
  return new Promise(resolve => {
    chrome.storage.local.get([key], res => resolve(res[key]));
  });
}

// ----------------------------------------------------
// SMART AUTO-SELECT CONNECTION LATENCY RUNNER
// ----------------------------------------------------
let smartIntervalId = null;

function startSmartAutoSelectChecker() {
  if (smartIntervalId) {
    clearInterval(smartIntervalId);
    smartIntervalId = null;
  }

  chrome.storage.local.get(['activeProfileId'], (res) => {
    if (res.activeProfileId === 'smart-auto-select') {
      // Check latency of all proxies every 30 seconds
      smartIntervalId = setInterval(checkAllProxiesLatency, 30000);
      // Run once immediately on start
      checkAllProxiesLatency();
    }
  });
}

async function checkAllProxiesLatency() {
  chrome.storage.local.get(['profiles', 'activeProfileId'], async (res) => {
    const profiles = res.profiles || {};
    const profileIds = Object.keys(profiles);

    if (profileIds.length === 0) {
      chrome.storage.local.set({ fastestProfileId: 'direct' });
      return;
    }

    const latencies = {};
    const backupActiveId = res.activeProfileId;

    // Temporarily unsubscribe global storage listener to prevent event circular loops
    chrome.storage.onChanged.removeListener(onStorageChange);

    for (const id of profileIds) {
      const profile = profiles[id];
      try {
        // Apply temporary proxy settings for this specific server test
        let config = {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: profile.scheme || 'http',
              host: profile.host,
              port: parseInt(profile.port)
            },
            bypassList: []
          }
        };
        await new Promise(resolve => chrome.proxy.settings.set({ value: config, scope: 'regular' }, resolve));

        // Measure ping duration
        const start = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const response = await fetch('https://clients3.google.com/generate_204', {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (response) {
          latencies[id] = Date.now() - start;
        } else {
          latencies[id] = 9999;
        }
      } catch (e) {
        latencies[id] = 9999;
      }
    }

    // Determine the profile with the lowest latency
    let fastestId = 'direct';
    let lowestLatency = 9999;

    profileIds.forEach(id => {
      if (latencies[id] < lowestLatency && latencies[id] < 4000) {
        lowestLatency = latencies[id];
        fastestId = id;
      }
    });

    // Save measured speeds and fastest target
    chrome.storage.local.set({
      proxyLatencies: latencies,
      fastestProfileId: fastestId
    }, () => {
      // Re-subscribe the change listener
      chrome.storage.onChanged.addListener(onStorageChange);
      // Re-apply final correct settings
      applyProxySettings();
    });
  });
}

// ----------------------------------------------------
// DYNAMIC IP PROXY ROTATION CYCLER
// ----------------------------------------------------
let rotationIntervalId = null;

function startProxyRotation() {
  if (rotationIntervalId) {
    clearInterval(rotationIntervalId);
    rotationIntervalId = null;
  }

  chrome.storage.local.get(['activeProfileId', 'rotationEnabled', 'rotationInterval'], (res) => {
    const enabled = res.rotationEnabled || false;
    const interval = parseInt(res.rotationInterval || 300000);
    const activeId = res.activeProfileId;

    if (enabled && activeId === 'rotation') {
      rotationIntervalId = setInterval(cycleProxyRotation, interval);
    }
  });
}

function cycleProxyRotation() {
  chrome.storage.local.get(['profiles', 'rotationActiveId'], (res) => {
    const profiles = res.profiles || {};
    const profileIds = Object.keys(profiles);

    if (profileIds.length === 0) return;

    let nextIndex = 0;
    const currentId = res.rotationActiveId;
    const currentIndex = profileIds.indexOf(currentId);

    if (currentIndex > -1) {
      nextIndex = (currentIndex + 1) % profileIds.length;
    }

    const nextId = profileIds[nextIndex];
    chrome.storage.local.set({ rotationActiveId: nextId }, () => {
      applyProxySettings();
    });
  });
}
