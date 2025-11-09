# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

The Cortex team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to the [Security tab](https://github.com/sahalkaabi2/cortex/security/advisories) of this repository
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **Email**
   - Send an email to the maintainer (email address available in GitHub profile)
   - Use a descriptive subject line like "Cortex Security Vulnerability"

### What to Include

Please include the following information in your report:

- **Type of vulnerability** (e.g., SQL injection, XSS, authentication bypass, etc.)
- **Full paths** of source file(s) related to the vulnerability
- **Location** of the affected source code (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact** of the vulnerability, including how an attacker might exploit it

### What to Expect

When you submit a vulnerability report, here's what happens:

1. **Acknowledgment**: We'll acknowledge receipt of your vulnerability report within 48 hours
2. **Investigation**: We'll investigate and validate the vulnerability
3. **Updates**: We'll keep you informed about our progress
4. **Resolution**: We'll work on a fix and coordinate disclosure with you
5. **Credit**: We'll publicly credit you for the discovery (unless you prefer to remain anonymous)

### Disclosure Policy

- We'll work with you to understand and resolve the issue quickly
- We ask that you give us a reasonable amount of time to fix the issue before public disclosure
- We'll credit you for the discovery in our security advisories (unless you prefer anonymity)

## Security Best Practices for Users

### API Keys

- **Never commit API keys** to version control
- **Use environment variables** (`.env.local`) for all sensitive credentials
- **Rotate keys regularly**, especially if they may have been exposed
- **Use separate API keys** for development and production
- **Set minimal permissions** on exchange API keys (e.g., no withdrawal)

### Trading Security

- **Start with paper trading** to test the system
- **Use small amounts** when switching to live trading
- **Enable IP whitelisting** on your Binance API keys
- **Disable withdrawals** on exchange API keys
- **Monitor regularly** for unusual activity
- **Set position limits** to control risk exposure

### Infrastructure Security

- **Keep dependencies updated** (`npm update`)
- **Use HTTPS** if exposing the application over a network
- **Implement authentication** if making the dashboard publicly accessible
- **Regular backups** of your database
- **Firewall rules** to restrict access to your server

### Deployment Security

- **Use environment variables** instead of hardcoded secrets
- **Secure your database** with strong passwords
- **Enable two-factor authentication** on all service accounts
- **Monitor logs** for suspicious activity
- **Keep your system updated** (OS, Node.js, dependencies)

## Known Security Considerations

### API Key Storage

- API keys are stored in environment variables
- Never commit `.env` or `.env.local` files to version control
- The `.gitignore` file is configured to exclude these files

### Database Security

- Supabase provides built-in security features
- Use Row Level Security (RLS) policies if sharing database access
- Keep your Supabase keys secure

### Trading Risks

- **This is experimental software** for educational purposes
- Always start with paper trading mode
- Never invest more than you can afford to lose
- The software is provided "as is" without warranties

### Third-Party Dependencies

- We use dependencies from npm that are regularly audited
- Run `npm audit` to check for known vulnerabilities
- Keep dependencies up to date

## Security Updates

Security updates will be released as patch versions (e.g., 0.1.1, 0.1.2) and announced through:

- GitHub Security Advisories
- GitHub Releases
- README.md file

## Vulnerability Disclosure

We will disclose vulnerabilities through:

1. **GitHub Security Advisories**
2. **Release notes** in CHANGELOG.md
3. **Fix commits** with clear descriptions

## Hall of Fame

We thank the following individuals for responsibly disclosing security vulnerabilities:

_No vulnerabilities reported yet_

## Questions?

If you have questions about this security policy, please open a GitHub issue (for general security questions only, not for reporting vulnerabilities).

---

**Remember**: Cryptocurrency trading involves significant financial risk. This software is experimental and for educational purposes. Use at your own risk.
