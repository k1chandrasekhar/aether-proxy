// AetherProxy Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
  const customContainer = document.getElementById('custom-profiles-container');
  const emptyState = document.getElementById('empty-custom-state');
  const activeModeLabel = document.getElementById('active-mode-label');
  const statusLight = document.getElementById('status-light');
  const openSettingsBtn = document.getElementById('open-settings');

  // Load and render current profiles
  chrome.storage.local.get(['profiles', 'activeProfileId'], (result) => {
    const profiles = result.profiles || {};
    const activeProfileId = result.activeProfileId || 'system';

    // 1. Update UI Selection for Built-in Modes
    updateSelectionInDOM(activeProfileId);

    // 2. Render Custom Profiles
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
        
        // Setup visual color indicators based on scheme
        item.innerHTML = `
          <div class="profile-bullet custom"></div>
          <div class="profile-info">
            <div class="profile-name">${escapeHTML(prof.name)}</div>
            <div class="profile-meta">${prof.scheme.toUpperCase()} Proxy • ${escapeHTML(prof.host)}:${prof.port}</div>
          </div>
        `;

        // Click handler for custom profile
        item.addEventListener('click', () => {
          setActiveProfile(id);
        });

        customContainer.appendChild(item);
      });
    }
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

  // Helper: Update Active profile in storage and close popup
  function setActiveProfile(profileId) {
    chrome.storage.local.set({ activeProfileId: profileId }, () => {
      updateSelectionInDOM(profileId);
      // Close popup after a slight delay for visual transition
      setTimeout(() => {
        window.close();
      }, 150);
    });
  }

  // Helper: Update active selected items in popup DOM
  function updateSelectionInDOM(profileId) {
    // Clear previous active items
    document.querySelectorAll('.profile-item').forEach(item => {
      item.classList.remove('active');
    });

    // Find and set active item
    const targetItem = document.querySelector(`.profile-item[data-id="${profileId}"]`);
    if (targetItem) {
      targetItem.classList.add('active');
    }

    // Update footer status bar
    let label = 'System Default';
    let statusClass = 'system';

    if (profileId === 'direct') {
      label = 'Direct Mode';
      statusClass = 'direct';
    } else if (profileId === 'auto-switch') {
      label = 'Auto Switch';
      statusClass = 'switch';
    } else if (profileId !== 'system') {
      // It is a custom profile, fetch name from DOM item
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

  // Helper: Escape HTML strings to prevent XSS injection
  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
