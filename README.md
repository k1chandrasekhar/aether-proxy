# AetherProxy 🌐

AetherProxy is a lightweight, modern, and privacy-focused Manifest V3 Chrome Extension proxy manager. It is designed to switch proxy servers, manage custom proxy profiles (HTTP, HTTPS, SOCKS5, SOCKS4), and define domain-based routing rules (Auto Switch) completely offline.

This is a **100% Free and Open Source Project**. Contributions, audits, and forks are welcome!

---

## 📖 Table of Contents
- [Key Features](#-key-features)
- [Understanding Proxy Modes ("The Proxy Thing")](#-understanding-proxy-modes-the-proxy-thing)
- [Protocol Schemes Explained](#-protocol-schemes-explained)
- [Auto Switch Rules](#-auto-switch-rules)
- [Import & Export Details](#-import--export-details)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Loading into Chrome / Edge / Opera](#-loading-into-chrome--edge--opera)

---

## ⚙️ Key Features

- ⚙️ **Proxy Profiles**: Easily configure HTTP, HTTPS, SOCKS4, and SOCKS5 proxy servers. Supports optional user/password authentication.
- 🔀 **Auto Switch Rules**: Define domain wildcard patterns (e.g. `*.google.com`) or custom RegEx expressions to dynamically route traffic through different proxies or DIRECT mode.
- ⚡ **Sleek Popup Selector**: Switch between System settings, DIRECT mode, Auto Switch, or custom proxy profiles in two clicks.
- 🎨 **Premium Visuals**: AMOLED Dark-slate design with responsive indicators and glassmorphic panels.
- ⚡ **Connection Ping Tester**: Actively measures and displays response times for configured proxy servers before saving.
- 📁 **Import & Export**: Backup your proxy configurations and switch rules as a single `.json` file.
- 🛡️ **Privacy Guard**: Run completely local and offline. Zero tracking telemetry or remote databases.

---

## 🌐 Understanding Proxy Modes ("The Proxy Thing")

A proxy server acts as an intermediary between your browser and the internet. When you configure AetherProxy, you can route your requests through different modes:

| Mode / Concept | Description |
| :--- | :--- |
| **System Default** | Instructs the browser to use your operating system's global proxy settings (e.g. Windows proxy configuration). |
| **Direct Mode** | Bypasses all proxy configurations. Your browser connects directly to target websites using your local internet connection and real IP address. |
| **Auto Switch** | Dynamically routes traffic on a per-site basis. When active, it evaluates the website domain you are visiting against your custom routing rules and forwards it through the assigned proxy profile or falls back to DIRECT mode. |
| **Custom Proxy Profiles** | User-defined proxy server configurations (e.g., a profile named **Tunnel** configured as a SOCKS5 proxy). Selecting a custom profile routes **all** browser traffic through that specific proxy server. |
| **Active Mode** | The footer status bar indicator in the popup that displays which proxy profile or connection rule is currently controlling the browser network stack. |

---

## ⚡ Protocol Schemes Explained

AetherProxy supports four major proxy protocol schemes:

### 1. HTTP Proxy (`http://`)
* **Standard Web Proxy**: Typically used for plain web browsing. 
* **Security**: Traffic between your browser and the proxy server is unencrypted. (Note: HTTPS traffic to final websites is still encrypted, but headers/metadata are visible to the proxy proxy owner).
* **Authentication**: Supports standard basic authentication (username & password).

### 2. HTTPS Proxy (`https://`)
* **Secure Web Proxy**: Establishes an encrypted SSL/TLS connection between your browser and the proxy server.
* **Security**: All traffic (including headers, requests, and metadata) is completely encrypted between you and the proxy. Excellent for public Wi-Fi safety.
* **Authentication**: Supports secure basic authentication.

### 3. SOCKS4 Proxy (`socks4://`)
* **Low-Level Protocol**: A simple protocol that routes raw TCP packets. It is protocol-agnostic and does not read web headers.
* **Security**: No native encryption or authentication.
* **Limitations**: Supports IPv4 addresses only and does not support UDP traffic.

### 4. SOCKS5 Proxy (`socks5://`)
* **Advanced Low-Level Protocol**: An extension of SOCKS4.
* **Capabilities**: Supports both TCP and UDP packets, IPv6 addresses, and DNS resolution on the proxy side (resolving domains through the proxy to prevent DNS leaks).
* **Authentication**: Supports secure username and password authentication.

---

## 🔀 Auto Switch Rules

Auto Switch rules allow you to build a dynamic routing table. When you visit a website, AetherProxy evaluates the domain from top-to-bottom:

### Rule Types:
1. **Wildcard Patterns**: 
   * Simplest pattern matching.
   * Example: `*.google.com` matches `mail.google.com`, `drive.google.com`, etc.
   * Example: `example.com` matches exactly `example.com`.
2. **Regular Expressions (Regex)**:
   * Power-user pattern matching.
   * Example: `^https?:\/\/([^\/]+)?google\.com` matches any URL hosted under a google.com domain.

### Compilation (PAC Scripts):
Under the hood, AetherProxy compiles your rules into a browser-native **Proxy Auto-Config (PAC) script**. A PAC script is a JavaScript function called `FindProxyForURL(url, host)`. By compiling your rules directly into JavaScript, Chrome processes routing logic inside the native network layer, ensuring zero network latency overhead.

---

## 📁 Import & Export Details

You can back up your entire configuration or sync it across devices:
* **Format**: Settings are stored and exported as a single, portable JSON backup file.
* **Contents**: The backup includes all custom proxy server profiles (including encrypted passwords), wildcard/regex switch rules, active settings, and default fallbacks.
* **Portability**: The JSON backup can be shared across any machine running AetherProxy. Simply choose **Import Configuration** on your target device.

---

## 📁 Project Structure

```text
aether-proxy/
├── dist/                    # Compiled assets ready to load into Chrome
├── public/
│   ├── manifest.json        # Extension Manifest V3 configuration
│   └── favicon.svg          # Extension branding logo
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

## 🛠️ Getting Started

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

## 📥 Loading into Chrome / Edge / Opera

To test the extension locally:

1. Open your browser and navigate to the Extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer Mode** (usually a toggle in the top-right corner).
3. Click the **Load unpacked** button.
4. Select the **`dist/`** folder inside the `aether-proxy` directory.
5. **AetherProxy** is now active! Pin it to your browser toolbar to open the popup.
