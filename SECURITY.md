# Security Policy

## Reporting a Vulnerability

We take the security of OpenSafe seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

To report security vulnerabilities:

- Navigate to the [Security tab](../../security/advisories/new)
- Click "Report a vulnerability"
- Fill out the vulnerability details

### What to Include

When reporting a vulnerability, please provide:

- **Description**: A clear description of the vulnerability
- **Impact**: What an attacker could achieve by exploiting this vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Proof of Concept**: If possible, include a minimal PoC (avoid destructive actions)
- **Affected Versions**: Which versions of OpenSafe are affected
- **Suggested Fix**: If you have ideas for how to fix it (optional)
- **Your Contact Info**: So we can follow up with questions or updates

### Response Timeline

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Updates**: We will keep you informed of progress every 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Public Disclosure**: We will coordinate with you on the disclosure timeline

### Safe Harbor

We support responsible disclosure. If you:

- Make a good faith effort to avoid privacy violations, data destruction, and interruption of service
- Only interact with accounts you own or have explicit permission to access
- Do not exploit the vulnerability beyond what is necessary to demonstrate it
- Report the vulnerability to us promptly

We will:

- Not pursue legal action against you
- Work with you to understand and resolve the issue quickly
- Publicly acknowledge your responsible disclosure (if you wish)

---

## Security Best Practices for Contributors

If you're contributing to OpenSafe, please follow these security guidelines:

### Code Security

1. **Never Commit Secrets**
   - Never commit API keys, passwords, tokens, or credentials
   - Use `.env` files for local development (already in `.gitignore`)
   - Use `.env.example` as a template with placeholder values
   - Check commits with `git diff --cached` before committing

2. **Input Validation**
   - Always validate and sanitize user inputs
   - Use Zod schemas for runtime validation
   - Never trust data from external APIs without validation
   - Sanitize data before database queries to prevent injection

3. **Authentication & Authorization**
   - Never bypass authentication checks
   - Always verify user permissions before sensitive operations
   - Use Auth0 middleware for protected routes
   - Don't expose sensitive endpoints without authentication

4. **Dependencies**
   - Keep dependencies up to date
   - Review dependency changes in pull requests
   - Use `npm audit` to check for known vulnerabilities
   - Avoid dependencies with known security issues

5. **API Keys & Rate Limiting**
   - Never expose API keys in client-side code
   - Keep all API calls server-side
   - Respect rate limits for external APIs (GitHub, Gemini)
   - Implement proper error handling for rate limit errors

6. **Data Handling**
   - Only store necessary data in the database
   - Never log sensitive information (tokens, passwords)
   - Use HTTPS in production environments
   - Sanitize error messages to avoid leaking system details

### Code Review Checklist

Before submitting a pull request, verify:

- [ ] No secrets or credentials committed
- [ ] All user inputs are validated
- [ ] Authentication/authorization checks are in place
- [ ] Dependencies are up to date and secure
- [ ] Error messages don't leak sensitive information
- [ ] API keys are only used server-side
- [ ] Database queries use parameterized statements
- [ ] No sensitive data is logged

---

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

**Note**: OpenSafe is currently in active development. Once we reach v1.0, we will provide a more detailed support policy.

---

## Security Features

OpenSafe includes several security features by design:

### Authentication

- **Auth0 Integration**: Secure OAuth-based authentication via GitHub
- **Session Management**: Encrypted session cookies
- **Protected Routes**: Middleware-based route protection

### API Security

- **Server-Side API Calls**: All sensitive API calls happen server-side
- **Rate Limiting**: Respects GitHub and Gemini API rate limits
- **Input Validation**: Zod schemas validate all API inputs
- **Error Handling**: Safe error messages that don't leak system details

### Data Security

- **Environment Variables**: Secrets stored in environment variables, never in code
- **Database Security**: Snowflake credentials protected and never exposed to client
- **HTTPS**: Production deployment uses HTTPS (Vercel)

### Code Scanning

- **Malicious Code Detection**: AI-powered detection of suspicious patterns
- **Dependency Analysis**: Analyzes npm/package dependencies for risks
- **Pattern Matching**: Identifies obfuscation, crypto mining, data exfiltration attempts

---

## Known Security Considerations

### API Cost Controls

OpenSafe uses optimization flags to reduce token usage:

- `ENABLE_STAR_THRESHOLD_CHECK`: Skips AI scans for repos with 1000+ stars
- `ENABLE_UNCHANGED_REPO_CHECK`: Returns cached results for unchanged repos

**Security Note**: While these optimizations reduce token usage, they may miss threats in popular or unchanged repositories. For maximum security, set both to `false` (increases token usage).

### Rate Limiting

External API rate limits:

- **GitHub API**: 5,000 requests/hour (authenticated)
- **Gemini API**: ~60 requests/minute (varies by tier)

Exceeding these limits will cause scan failures. Implement proper backoff/retry logic.

### Third-Party Dependencies

OpenSafe relies on:

- **Auth0**: For authentication (managed service)
- **Snowflake**: For data storage (managed service)
- **GitHub API**: For repository access
- **Google Gemini**: For AI analysis

Security of these services is managed by their respective providers.

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Auth0 Security Documentation](https://auth0.com/docs/secure)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

---

**Last Updated**: 2025-10-30
