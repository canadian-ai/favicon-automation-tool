# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@canadian.ai**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information:

- Type of issue (e.g., SVG injection, SSRF, path traversal, etc.)
- Full paths of source file(s) related to the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

## Security Measures

Favicon Manager implements multiple layers of security:

### SVG Sanitization

All SVG inputs are sanitized to remove potentially dangerous elements:

**Blocked Elements:**
- `<script>` - Script execution
- `<foreignObject>` - HTML embedding
- `<iframe>`, `<embed>`, `<object>` - External content
- `<style>` - CSS expressions (IE vulnerability)
- Animation elements (`<animate>`, `<set>`, etc.) - JS triggers
- SVG 1.2 handlers (`<handler>`, `<listener>`)

**Blocked Attributes:**
- All `on*` event handlers (onclick, onload, onerror, etc.)
- `javascript:` URLs in href attributes
- `data:` URLs (except for embedded images)
- `formaction`, `action`, `srcdoc`

### URL Validation (SSRF Protection)

External URLs are validated to prevent Server-Side Request Forgery:

**Allowed:**
- `https://` URLs only (HTTP redirected or blocked)
- Public IP addresses and domains

**Blocked:**
- `localhost`, `127.0.0.1`, `0.0.0.0`
- Private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- IPv6 loopback (`::1`)
- Internal domains (`.local`, `.internal`)
- `javascript:`, `data:`, `file:`, `vbscript:` protocols

### Input Validation

All user inputs are validated:

- **Repository names**: Alphanumeric, hyphens, underscores, periods only
- **GitHub tokens**: Format validation before use
- **Favicon text**: Alphanumeric only (1-2 characters)
- **Colors**: Hex format validation (#RRGGBB)
- **File sizes**: 10MB max for images, 1MB max for SVGs

### Token Handling

- Tokens are never logged or stored persistently
- Token format is validated before API calls
- Errors are sanitized to remove token information

## Security Audit Checklist

### External Image Handling

| Risk | Mitigation | Status |
|------|------------|--------|
| SSRF via URL fetch | URL validation, private IP blocking | Implemented |
| Large file DoS | File size limits (10MB/1MB) | Implemented |
| Malicious image content | Sharp library validation | Implemented |
| Path traversal | Absolute path resolution | Implemented |

### SVG Processing

| Risk | Mitigation | Status |
|------|------------|--------|
| XSS via script tags | Element blocklist | Implemented |
| XSS via event handlers | Attribute blocklist | Implemented |
| XSS via javascript: URLs | URL protocol validation | Implemented |
| XXE attacks | No XML entity processing | Implemented |
| CSS injection | Style element removal | Implemented |

### GitHub Integration

| Risk | Mitigation | Status |
|------|------------|--------|
| Token exposure | Format validation, no logging | Implemented |
| Repository access | User token scope limits | Delegated to GitHub |
| Branch protection bypass | PR workflow only | Implemented |

### Dependencies

| Risk | Mitigation | Status |
|------|------------|--------|
| Known vulnerabilities | Regular npm audit | Ongoing |
| Supply chain attacks | Lockfile, minimal deps | Implemented |
| Outdated packages | Dependabot alerts | Enabled |

## Best Practices for Users

1. **Use Fine-Grained Tokens**: Create tokens with minimal required permissions
2. **Use Environment Variables**: Don't pass tokens on command line (visible in logs)
3. **Review PRs**: Always review generated PRs before merging
4. **Verify Sources**: Only use trusted image sources

## Dependency Security

We regularly audit dependencies:

```bash
npm audit
```

Key dependencies and their security posture:

| Package | Purpose | Security Notes |
|---------|---------|----------------|
| sharp | Image processing | Native addon, memory-safe |
| octokit | GitHub API | Official GitHub client |
| recast | AST transforms | No eval, safe parsing |
| commander | CLI parsing | No code execution |

## Security Updates

Security updates are released as patch versions (e.g., 1.0.1) and announced via:

- GitHub Security Advisories
- npm advisory database
- This SECURITY.md file

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who report valid vulnerabilities (with permission).

---

Last updated: 2026-04-05
