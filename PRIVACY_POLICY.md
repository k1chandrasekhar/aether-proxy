# AetherProxy Privacy Policy

**Effective Date:** July 5, 2026

AetherProxy (the "Extension") is committed to protecting your privacy. This Privacy Policy explains our practices regarding user data, permissions, and security.

AetherProxy is a **100% Free and Open Source Project**. The complete source code is available for audit at our GitHub repository.

---

## 1. Zero Data Collection & Transmission
AetherProxy operates under a strict privacy-first model:
* **No Telemetry**: We do not collect, transmit, upload, or share any personal data, IP addresses, location data, or network traffic statistics.
* **No Remote Servers**: The Extension runs entirely locally in your browser. It does not communicate with any external developer databases, tracking APIs, or third-party analytics services (e.g., Google Analytics).
* **No Ad Tracking**: The Extension is completely advertisement-free and does not track user behavior or clicks.

---

## 2. Local Storage of Configurations
To perform its core functions, the Extension requires you to configure proxy profiles and switch rules:
* **Local Storage Only**: All proxy server configurations, including custom names, IP addresses, ports, and optional proxy credentials (usernames and passwords), are stored exclusively on your local device using Chrome's native `chrome.storage.local` API.
* **Encryption & Access**: Passwords and credentials stored locally are isolated within Chrome's secure sandbox environment. They are never sent over the internet or transmitted to the developer.

---

## 3. Explanation of Requested Permissions
The Extension requests specific browser permissions to manage your network routing. All of these permissions are executed purely on your local machine:

1. **`proxy`**: Used to programmatically switch Chrome's proxy configuration using your custom profiles or Auto Switch scripts.
2. **`storage`**: Used to save your routing rules and proxy profiles locally in your browser.
3. **`webRequest` & `webRequestAuthProvider`**: Used to detect when a proxy server challenges your browser for credentials, enabling the Extension to securely supply your locally saved username and password.
4. **Host Permission (`<all_urls>`)**: Required to evaluate your Auto Switch rules (such as matching domain wildcards like `*.google.com`) and apply proxy settings across target websites.

---

## 4. Children’s Privacy
The Extension does not collect personal data from anyone, including children under the age of 13, as no data is collected whatsoever.

---

## 5. Changes to This Privacy Policy
We may update this Privacy Policy from time to time. Any changes will be reflected by updating this document directly in our public GitHub repository. Your continued use of AetherProxy after updates are pushed constitutes your acceptance of the updated terms.

---

## 6. Contact Information
If you have any questions or security audits regarding this Privacy Policy, please contact the developer via our GitHub repository issues page or the developer email listed on the Web Store.
