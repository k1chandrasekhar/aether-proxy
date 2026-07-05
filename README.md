# AetherProxy 🌐

AetherProxy is a lightweight, modern, and privacy-focused Manifest V3 Chrome Extension proxy manager. It is designed to switch proxy servers, manage custom proxy profiles (HTTP, HTTPS, SOCKS5, SOCKS4), and define domain-based routing rules (Auto Switch) completely offline.

---

## Key Features

- ⚙️ **Proxy Profiles**: Easily configure HTTP, HTTPS, SOCKS4, and SOCKS5 proxy servers. Supports optional user/password authentication.
- 🔀 **Auto Switch Rules**: Define domain wildcard patterns (e.g. `*.google.com`) or custom RegEx expressions to dynamically route traffic through different proxies or DIRECT mode.
- ⚡ **Sleek Popup Selector**: Switch between System settings, DIRECT mode, Auto Switch, or custom proxy profiles in two clicks.
- 🎨 **Premium Visuals**: AMOLED Dark-slate design with responsive indicators and glassmorphic panels.
- ⚡ **Connection Ping Tester**: Actively measures and displays response times for configured proxy servers before saving.
- 📁 **Import & Export**: Backup your proxy configurations and switch rules as a single `.json` file.
- 🛡️ **Privacy Guard**: Run completely local and offline. Zero tracking telemetry or remote databases.

---

## Project Structure

```text
aether-proxy/
├── dist/                    # Compiled assets ready to load into Chrome
├── public/
│   └── manifest.json        # Extension Manifest V3 configuration
├── src/
│   ├── background/
│   │   └── service-worker.js # Handles proxy routing & auth challenges
│   ├── popup/
│   │   ├── popup.css
│   │   └── popup.js
│   └── options/
│       ├── options.css
│       └── options.js
├── popup.html               # Popup HTML structure
├── options.html             # Options Dashboard HTML structure
├── vite.config.js           # Multi-page build bundler
├── package.json             # Build commands
└── README.md
```

---

## Getting Started

### 1. Install Dependencies
Run this in the project root folder:
```bash
npm install
```

### 2. Compile Project
Build the production-ready extension package into the `dist/` folder:
```bash
npm run build
```

---

## Loading into Chrome / Edge / Opera

To test the extension locally:

1. Open your browser and navigate to the Extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer Mode** (usually a toggle in the top-right corner).
3. Click the **Load unpacked** button.
4. Select the **`dist/`** folder inside the `aether-proxy` directory.
5. **AetherProxy** is now active! Pin it to your browser toolbar to open the popup.

---

## Submitting to Web Stores

When you are ready to publish your extension to the Chrome Web Store or Microsoft Edge Add-ons:

1. Re-compile the latest code:
   ```bash
   npm run build
   ```
2. Compress the **`dist/`** folder into a standard `.zip` file (e.g., `aetherproxy.zip`). Make sure `manifest.json` is at the root level of the ZIP file structure.
3. Upload this `.zip` package to the Chrome Web Store Developer Console or partner dashboard.
