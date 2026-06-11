# Security Policy

## Supported Versions

Currently, only the latest `main` branch version of Vibe Social is actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| < `1.0` | :x:                |

## Reporting a Vulnerability

Security is a top priority for Vibe Social. If you discover a security vulnerability within the platform, please follow these steps:

1. **Do not disclose the vulnerability publicly.**
2. Send an email to the repository maintainer outlining the vulnerability, steps to reproduce, and any potential impact.
3. We will acknowledge receipt of your vulnerability report within 48 hours and strive to send you regular updates about our progress.

### Scope

- **In Scope:** Session hijacking, XSS, SQL Injection (though mitigated via parameterized queries and `sql.js`), directory traversal in image uploads.
- **Out of Scope:** Volumetric DDoS attacks, vulnerabilities in third-party libraries (unless actionable by updating).

Thank you for helping keep Vibe Social secure.
