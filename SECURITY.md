# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Hardening in this System

This application implements several core security practices:
1. **Spreadsheet Formula Injection Protection (CWE-1236)**: User-controlled inputs exported to CSV are checked for dangerous leading symbols (`=`, `+`, `-`, `@`, `\t`, `\r`) and prefixed with a single apostrophe (`'`) to neutralize code execution in Excel or Google Sheets.
2. **Environment Variable Hygiene**: Production credentials and database connection URIs are managed through server environment variables and never exposed to the client bundle or committed to version control.
3. **CORS Control**: Access control headers dynamically restrict allowed origins based on the configured `CLIENT_URL`.
4. **Input Sanitization & Normalization**: Emails are trimmed and lowercased server-side, preventing case-manipulation collisions.
5. **Atomic Operations**: Database queries use atomic counter sequences and MongoDB document locks to eliminate time-of-check to time-of-use (TOCTOU) race conditions.

## Reporting a Vulnerability

If you discover a potential security vulnerability in this project, please report it privately:
- **Maintainer**: Vansh Kesarwani
- **GitHub**: [@vanshkesarwani](https://github.com/vanshkesarwani)
- **Response Time**: Issues will be acknowledged and evaluated within 48 hours.

Please do not disclose security vulnerabilities in public GitHub issues until a fix has been published.
