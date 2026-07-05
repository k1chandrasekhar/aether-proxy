// AetherProxy Manifest V3 Service Worker

let activeProfiles = {};
let activeRules = [];
let activeProfileId = 'system';
let defaultProfileId = 'direct';

// Helper: Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['profiles', 'rules', 'activeProfileId', 'defaultProfileId'], (result) => {
      activeProfiles = result.profiles || {};
      activeRules = result.rules || [];
      activeProfileId = result.activeProfileId || 'system';
      defaultProfileId = result.defaultProfileId || 'direct';
      resolve();
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
      // shExpMatch expects wildcard patterns like *.google.com or google.com
      script += `
      if (shExpMatch(host, '${rule.pattern}')) {
        return '${targetProxy}';
      }
      `;
    } else if (rule.patternType === 'regexp') {
      // Regex match in PAC
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
    // Compile rules into a PAC Script
    const pacScript = compilePacScript();
    config = {
      mode: 'pac_script',
      pacScript: {
        data: pacScript
      }
    };
  } else {
    // Single fixed server proxy profile
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

  // Set the proxy configuration
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
  
  // Set default settings if not exists
  chrome.storage.local.get(['activeProfileId', 'profiles'], (result) => {
    if (!result.activeProfileId) {
      chrome.storage.local.set({
        activeProfileId: 'system',
        defaultProfileId: 'direct',
        profiles: {},
        rules: []
      }, () => {
        applyProxySettings();
      });
    } else {
      applyProxySettings();
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  applyProxySettings();
});

// Watch for settings changes and hot-swap proxy config immediately
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    applyProxySettings();
  }
});

// Proxy Credentials challenge interceptor (Sync Auth)
chrome.webRequest.onAuthRequired.addListener(
  (details) => {
    if (!details.isProxy) return {};

    console.log(`Proxy auth requested by ${details.challenger.host}:${details.challenger.port}`);

    // Loop through profiles to find a match
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
        return {
          authCredentials: {
            username: prof.username,
            password: prof.password
          }
        };
      }
    }

    return {};
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);
