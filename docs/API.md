# OpenSafe API Documentation

This document provides comprehensive documentation for the OpenSafe REST API endpoints.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Endpoints](#endpoints)
  - [GET /api/repos](#get-apirepos)
  - [POST /api/scan-gemini](#post-apiscan-gemini)
  - [GET /api/scan-gemini](#get-apiscan-gemini)

---

## Overview

The OpenSafe API provides programmatic access to repository security scanning and scan history. All endpoints return JSON responses.

**Base URL**: `https://www.opensafe.app` (production)
**Development**: `http://localhost:3000`

**API Version**: 1.0
**Content-Type**: `application/json`

---

## Authentication

OpenSafe uses **Auth0** for authentication via GitHub OAuth.

### Protected Endpoints

The following endpoints require authentication:

- `POST /api/scan-gemini` - Requires valid Auth0 session

### Public Endpoints

The following endpoints are publicly accessible:

- `GET /api/repos` - No authentication required
- `GET /api/scan-gemini` - API status endpoint

### Authentication Flow

1. User signs in via Auth0 (GitHub OAuth)
2. Auth0 creates a session with encrypted cookie
3. Protected endpoints verify session using `@auth0/nextjs-auth0`
4. Unauthorized requests receive `401` response

### Error Response

```json
{
  "error": "Unauthorized - Please log in"
}
```

**Status Code**: `401 Unauthorized`

---

## Error Handling

All API errors follow a consistent format:

### Validation Error Response

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "repoUrl",
      "message": "Invalid GitHub repository URL format. Expected: https://github.com/owner/repository"
    }
  ]
}
```

**Status Code**: `400 Bad Request`

### Generic Error Response

```json
{
  "error": "Failed to fetch repositories",
  "message": "An error occurred while processing your request"
}
```

**Status Codes**:

- `400 Bad Request` - Invalid input or validation error
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Server-side error

### Common Error Scenarios

| Error Message                   | Status Code | Cause                                    |
| ------------------------------- | ----------- | ---------------------------------------- |
| `Invalid GitHub repository URL` | 400         | Malformed or non-GitHub URL              |
| `Invalid JSON in request body`  | 400         | Request body is not valid JSON           |
| `Unauthorized - Please log in`  | 401         | Missing or invalid Auth0 session         |
| `Server configuration error`    | 500         | Missing environment variables (API keys) |
| `Failed to fetch repositories`  | 500         | Database connection error                |
| `Scan failed`                   | 500         | AI service error or GitHub API error     |

---

## Rate Limits

### External API Rate Limits

OpenSafe is subject to rate limits from external services:

**GitHub API**:

- Authenticated: 5,000 requests/hour
- Unauthenticated: 60 requests/hour

**Google Gemini API**:

- Free tier: 10 requests/minute, 250 requests/day
- Token limit: 250,000 tokens/minute

### Optimization Flags

To reduce API consumption, OpenSafe supports optional optimization flags (configured via environment variables):

- `ENABLE_STAR_THRESHOLD_CHECK=true` - Skips AI scanning for repositories with 1000+ stars (assumes popular repos are heavily vetted)
- `ENABLE_UNCHANGED_REPO_CHECK=true` - Returns cached results if repository hasn't changed since last scan

### Rate Limit Headers

Currently, OpenSafe does not return rate limit headers. Rate limiting is handled by external services.

---

## Endpoints

### GET /api/repos

Fetches a list of previously scanned repositories with their safety scores and metadata.

**Authentication**: Not required (public endpoint)

#### Query Parameters

| Parameter  | Type   | Required | Default | Description                                          |
| ---------- | ------ | -------- | ------- | ---------------------------------------------------- |
| `limit`    | number | No       | 100     | Number of repositories to return (max: 100)          |
| `offset`   | number | No       | 0       | Pagination offset (not yet implemented in DB query)  |
| `owner`    | string | No       | -       | Filter by repository owner (not yet implemented)     |
| `language` | string | No       | -       | Filter by programming language (not yet implemented) |

**Note**: `offset`, `owner`, and `language` parameters are validated but not yet implemented in database queries. They are reserved for future use.

#### Request Example

```bash
# Fetch default 100 repositories
curl https://www.opensafe.app/api/repos

# Fetch 10 repositories
curl https://www.opensafe.app/api/repos?limit=10

# Filter by language (not yet implemented, but validates)
curl https://www.opensafe.app/api/repos?language=JavaScript
```

#### Response Schema

**Status Code**: `200 OK`

```json
[
  {
    "id": "unique-identifier",
    "name": "repository-name",
    "owner": "owner-username",
    "language": "JavaScript",
    "safetyScore": "SAFE",
    "lastScanned": "2 hours ago",
    "scannedBy": "user@example.com"
  }
]
```

#### Response Fields

| Field         | Type                                  | Description                                      |
| ------------- | ------------------------------------- | ------------------------------------------------ |
| `id`          | string                                | Unique identifier for the scanned repository     |
| `name`        | string                                | Repository name                                  |
| `owner`       | string                                | Repository owner username                        |
| `language`    | string                                | Primary programming language (or "Unknown")      |
| `safetyScore` | `"SAFE"` \| `"CAUTION"` \| `"UNSAFE"` | Safety assessment level                          |
| `lastScanned` | string                                | Human-readable timestamp (e.g., "2 hours ago")   |
| `scannedBy`   | string                                | Email or username of user who initiated the scan |

#### Error Responses

**Invalid Query Parameters** - `400 Bad Request`

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Expected number, received string"
    }
  ]
}
```

**Database Error** - `500 Internal Server Error`

```json
{
  "error": "Failed to fetch repositories",
  "message": "An error occurred while processing your request"
}
```

---

### POST /api/scan-gemini

Initiates a security scan for a GitHub repository. This is the main scanning endpoint.

**Authentication**: Required (Auth0 session)

#### Request Body

```json
{
  "repoUrl": "https://github.com/owner/repository"
}
```

| Field     | Type   | Required | Description                                                 |
| --------- | ------ | -------- | ----------------------------------------------------------- |
| `repoUrl` | string | Yes      | Valid GitHub repository URL (https://github.com/owner/repo) |

#### Request Example

```bash
curl -X POST https://www.opensafe.app/api/scan-gemini \
  -H "Content-Type: application/json" \
  -H "Cookie: appSession=..." \
  -d '{"repoUrl": "https://github.com/facebook/react"}'
```

```javascript
// Client-side JavaScript
const response = await fetch('/api/scan-gemini', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    repoUrl: 'https://github.com/facebook/react',
  }),
});
const result = await response.json();
console.log(result.safetyLevel); // "safe" | "caution" | "unsafe"
```

#### Scan Workflow

The endpoint performs the following steps:

1. **Authentication** - Verifies Auth0 session
2. **Validation** - Validates and sanitizes repository URL
3. **Cache Check** - Checks if repository is unchanged since last scan (if `ENABLE_UNCHANGED_REPO_CHECK=true`)
4. **Star Threshold Check** - Skips AI scan for repos with 1000+ stars (if `ENABLE_STAR_THRESHOLD_CHECK=true`)
5. **GitHub API** - Fetches repository metadata and file contents
6. **AI Scanning** - Analyzes code using Google Gemini AI
7. **Database Save** - Stores scan results in Snowflake database
8. **Response** - Returns scan results to client

#### Response Schema

**Status Code**: `200 OK`

```json
{
  "repoUrl": "https://github.com/owner/repo",
  "repoMetadata": {
    "owner": "owner",
    "name": "repo",
    "description": "Repository description",
    "stars": 1500,
    "forks": 200,
    "openIssues": 45,
    "language": "JavaScript",
    "createdAt": "2020-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "defaultBranch": "main",
    "license": "MIT",
    "latestCommitSha": "abc123...",
    "latestCommitDate": "2024-01-01T00:00:00Z"
  },
  "safetyLevel": "safe",
  "findings": {
    "maliciousCode": [],
    "dependencies": [],
    "networkActivity": [],
    "fileSystemSafety": [],
    "credentialSafety": []
  },
  "aiSummary": "This repository appears safe for contribution...",
  "scannedAt": "2024-01-15T12:00:00.000Z",
  "validated": true,
  "trustedByStar": true,
  "unchangedSinceLastScan": false
}
```

#### Response Fields

| Field                    | Type                                  | Description                                                |
| ------------------------ | ------------------------------------- | ---------------------------------------------------------- |
| `repoUrl`                | string                                | The scanned repository URL                                 |
| `repoMetadata`           | object                                | GitHub repository metadata (see RepoMetadata below)        |
| `safetyLevel`            | `"safe"` \| `"caution"` \| `"unsafe"` | Overall safety assessment                                  |
| `findings`               | object                                | Categorized security findings (see Findings below)         |
| `aiSummary`              | string                                | AI-generated summary of the scan                           |
| `scannedAt`              | string                                | ISO 8601 timestamp of scan completion                      |
| `validated`              | boolean                               | Whether the scan was validated/completed                   |
| `trustedByStar`          | boolean (optional)                    | True if repo was trusted based on star count (1000+ stars) |
| `unchangedSinceLastScan` | boolean (optional)                    | True if cached results were returned (repo unchanged)      |

#### RepoMetadata Object

| Field              | Type           | Description                         |
| ------------------ | -------------- | ----------------------------------- |
| `owner`            | string         | Repository owner username           |
| `name`             | string         | Repository name                     |
| `description`      | string         | Repository description              |
| `stars`            | number         | Number of stars                     |
| `forks`            | number         | Number of forks                     |
| `openIssues`       | number         | Number of open issues               |
| `language`         | string         | Primary programming language        |
| `createdAt`        | string         | ISO 8601 timestamp of creation      |
| `updatedAt`        | string         | ISO 8601 timestamp of last update   |
| `defaultBranch`    | string         | Default branch name (e.g., "main")  |
| `license`          | string \| null | License identifier (e.g., "MIT")    |
| `latestCommitSha`  | string         | SHA of the latest commit            |
| `latestCommitDate` | string         | ISO 8601 timestamp of latest commit |

#### Findings Object

Each category contains an array of findings. Each finding has the following structure:

```json
{
  "item": "filename.js",
  "location": "src/utils/helpers.js:42",
  "issue": "Potential command injection vulnerability",
  "severity": "severe",
  "codeSnippet": "exec(userInput)",
  "batchId": 1,
  "dependencyUrl": "https://npmjs.com/package/example"
}
```

| Field           | Type                                  | Description                                         |
| --------------- | ------------------------------------- | --------------------------------------------------- |
| `item`          | string                                | The affected file or dependency name                |
| `location`      | string                                | File path and line number                           |
| `issue`         | string                                | Description of the security issue                   |
| `severity`      | `"low"` \| `"moderate"` \| `"severe"` | Severity level                                      |
| `codeSnippet`   | string (optional)                     | Relevant code snippet                               |
| `batchId`       | number (optional)                     | Batch identifier for grouped findings               |
| `dependencyUrl` | string (optional)                     | URL to dependency package (for dependency findings) |

**Finding Categories**:

- `maliciousCode` - Backdoors, obfuscation, malicious patterns
- `dependencies` - Suspicious or vulnerable dependencies
- `networkActivity` - Unexpected network requests or data exfiltration
- `fileSystemSafety` - Dangerous file operations
- `credentialSafety` - Exposed credentials or API keys

#### Error Responses

**Invalid URL** - `400 Bad Request`

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "repoUrl",
      "message": "Invalid GitHub repository URL format. Expected: https://github.com/owner/repository"
    }
  ]
}
```

**Unauthorized** - `401 Unauthorized`

```json
{
  "error": "Unauthorized - Please log in"
}
```

**Repository Not Found** - `400 Bad Request`

```json
{
  "error": "Failed to fetch repository information",
  "message": "An error occurred while processing your request"
}
```

**Missing API Key** - `500 Internal Server Error`

```json
{
  "error": "Server configuration error",
  "details": "Missing GEMINI_API_KEY environment variable"
}
```

**Scan Failure** - `500 Internal Server Error`

```json
{
  "error": "Scan failed",
  "message": "An error occurred while processing your request"
}
```

---

### GET /api/scan-gemini

Returns API status and metadata. Useful for health checks.

**Authentication**: Not required (public endpoint)

#### Request Example

```bash
curl https://www.opensafe.app/api/scan-gemini
```

#### Response Schema

**Status Code**: `200 OK`

```json
{
  "status": "online",
  "message": "OpenSafe Repository Scanner API (Gemini-powered)",
  "provider": "Google Gemini API",
  "model": "gemini-2.5-flash-lite",
  "rateLimits": {
    "free": "10 requests/minute, 250 requests/day",
    "tokenLimit": "250,000 tokens/minute"
  },
  "endpoints": {
    "scan": "POST /api/scan-gemini"
  }
}
```

#### Response Fields

| Field        | Type   | Description            |
| ------------ | ------ | ---------------------- |
| `status`     | string | API status ("online")  |
| `message`    | string | API description        |
| `provider`   | string | AI provider name       |
| `model`      | string | AI model being used    |
| `rateLimits` | object | Rate limit information |
| `endpoints`  | object | Available endpoints    |

---

## Security Considerations

### Input Validation

All API inputs are validated using **Zod schemas** to ensure:

- Type safety
- Format validation (URLs, emails, etc.)
- Length limits to prevent buffer overflow
- Sanitization to prevent XSS and injection attacks

### Authentication & Authorization

- Protected endpoints use Auth0 middleware
- Sessions are encrypted and stored in HTTP-only cookies
- No API keys are exposed to the client
- All sensitive operations happen server-side

### Data Sanitization

All string inputs are sanitized to remove:

- JavaScript protocols (`javascript:`, `data:`)
- HTML event handlers (`onclick`, `onerror`, etc.)
- Special characters that could cause injection attacks

### Error Messages

Error messages are sanitized to avoid leaking:

- System paths
- Database schemas
- API keys or credentials
- Internal implementation details

---

## Versioning

The OpenSafe API does not currently use versioning in the URL path. Breaking changes will be communicated via:

- GitHub releases
- CHANGELOG.md updates
- Migration guides in documentation

---

## Support

For API issues, questions, or feature requests:

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/yourusername/opensafe/issues)
- **Documentation**: See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup
- **Security**: Report vulnerabilities via [SECURITY.md](../SECURITY.md)

---

**Last Updated**: 2025-11-07
**API Version**: 1.0
