# AetherProxy - Chrome Web Store Listing Configurations

This file contains copy-pasteable assets for your Chrome Web Store listing.

---

## ⚡ Short Description (Max 150 characters)
> Sleek, privacy-focused offline proxy manager with rules-based Auto Switch, SOCKS5/HTTP support, and live speed connection tests.

---

## 📝 Long Description (Detailed Description)

### Overview
Take full control of your browser’s network traffic with **AetherProxy**—a modern, lightweight, and privacy-first proxy management extension built for Google Chrome. 

Whether you are a developer testing local server environments, a security analyst routing traffic through encrypted tunnels, or a power user seeking dynamic domain-based bypasses, AetherProxy provides a fluid, glassmorphic dashboard to configure, test, and manage all your proxy configurations with ease.

---

### 🚀 Key Features

* **Custom Proxy Profiles**: Create and save multiple profiles supporting HTTP, HTTPS, SOCKS4, and SOCKS5 protocol schemes. Full support for optional secure username and password authentication.
* **Auto Switch Rules**: Build a dynamic routing table. Define domain wildcard patterns (e.g. `*.google.com`, `localhost`) or regular expressions (Regex) to route traffic through different proxies or DIRECT mode instantly.
* **Sleek Popup Selector**: Switch between System settings, DIRECT mode, Auto Switch, or custom proxy profiles in just two clicks via our compact extensions toolbar popup.
* **Live Connection Ping Tester**: Actively measure, calculate, and display response latencies (in milliseconds) for configured proxy servers before saving. Never connect to a stale or offline proxy again.
* **Easy Import & Export**: Back up, restore, or sync your proxy rules and profiles across multiple machines using a single, portable `.json` configuration file.
* **AMOLED Dark-slate Design**: Enjoy a premium user interface with fluid CSS transitions, interactive hover effects, and a collapsible sidebar dashboard layout.

---

### 🛡️ Privacy & Security First

* **100% Offline & Local**: AetherProxy operates completely locally on your computer. It does not contain telemetry, tracking scripts, third-party analytics, or remote database connections. Your browsing history, proxy details, and credentials never leave your browser.
* **No Registration Required**: Simply load the extension and start routing.

---

### 🛠️ When to Use AetherProxy?

* **Development & Testing**: Easily toggle between staging, testing, and production servers.
* **Privacy & Anonymity**: Encrypt your traffic headers using secure HTTPS proxies on public Wi-Fi.
* **Domain Routing**: Bypass local intranets while routing external domains through high-speed SOCKS5 tunnels.

---

## 🔒 Chrome Console Privacy Practices Justifications

Here are the copy-pasteable justifications to clear the errors on the **Privacy Practices** tab:

### 1. Single Purpose Description
> AetherProxy is a lightweight, offline browser proxy switch manager that allows users to switch network proxy servers and set domain-based routing rules.

### 2. Justification for Host Permission Use (`<all_urls>`)
> The extension requires host permissions on all URLs in order to evaluate domain-based routing rules (Auto Switch) and intercept proxy authentication challenges across any website the user visits.

### 3. Justification for `proxy` Permission
> Required to programmatically set and configure the browser's proxy settings using custom user profiles or dynamic Proxy Auto-Config (PAC) scripts.

### 4. Justification for `storage` Permission
> Required to store user-configured proxy server profiles, credentials, and Auto Switch routing rules locally and securely on the user's device.

### 5. Justification for `webRequest` Permission
> Required to intercept network authentication challenges from proxy servers so the extension can supply the user's saved proxy credentials.

### 6. Justification for `webRequestAuthProvider` Permission
> Required by Chrome's Manifest V3 specifications to asynchronously listen for and resolve credential challenges from authenticated SOCKS or HTTP proxies.

### 7. Justification for Remote Code Use
Select the option: **"No, my extension does not use remote code."**
If a text field is provided, paste:
> AetherProxy is built entirely using local static files (HTML, CSS, JavaScript) compiled in the extension bundle. It runs completely offline with zero remote execution or scripts.

---

## ⚙️ Chrome Console Account Settings Instructions

To resolve the remaining publishing block errors:

### 1. Certification of Data Usage
At the bottom of the **Privacy practices** tab:
1. Locate the **Data usage certification** check box.
2. Check the box to certify that your data usage complies with the Developer Program Policies (specifically, that data is handled locally and is not sold, transferred, or used for credit checks/profiling).

### 2. Developer Contact Email
On the **Settings** page (accessed via the left sidebar in the Developer Console):
1. Locate the **Publisher contact email** input field.
2. Enter your public support/developer email address.
3. Click **Save** at the top right of the settings page.
4. Check your inbox for a verification email from Google and click the verification link to complete the email validation process.
