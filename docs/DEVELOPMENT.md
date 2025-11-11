# Development Guide

This guide covers local development setup, testing, debugging, and common issues for OpenSafe development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Quality Tools](#code-quality-tools)
- [Debugging](#debugging)
- [Common Issues](#common-issues)
- [Project Structure](#project-structure)
- [Useful Scripts](#useful-scripts)

---

## Prerequisites

Before setting up OpenSafe locally, ensure you have:

### Required Software

- **Node.js**: v18.17.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: Latest version
- **OpenSSL**: For generating secrets (usually pre-installed on macOS/Linux)

### Required Accounts

You'll need to create accounts and obtain credentials for:

1. **GitHub**: For OAuth authentication and API access
   - Personal account for development
   - GitHub Personal Access Token (Classic)

2. **Google Cloud / AI Studio**: For Gemini AI API
   - Free tier available for development
   - Get API key at https://aistudio.google.com/app/apikey

3. **Auth0**: For authentication service
   - Free tier available (7,000 active users)
   - Create account at https://auth0.com

4. **Snowflake**: For database
   - Free trial available (30 days, $400 credits)
   - Create account at https://signup.snowflake.com/

### Verify Installation

```bash
node --version  # Should be v18.17.0 or higher
npm --version   # Should be v9.0.0 or higher
git --version   # Should be 2.0 or higher
```

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/gitrlawton/opensafe.git
cd opensafe
```

### 2. Install Dependencies

```bash
npm install
```

This will install all dependencies and set up Husky git hooks automatically.

### 3. Verify Installation

```bash
npm run type-check  # Should complete without errors
npm run lint        # Should show no linting errors
```

---

## Environment Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Required Services

You need to configure the following services. See `.env.example` for detailed instructions on each variable.

#### GitHub API Configuration

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scope: `public_repo` (for public repositories)
4. Copy the token and set it in `.env`:

```bash
GITHUB_TOKEN=ghp_your_token_here
```

#### Google Gemini AI Configuration

1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy the key and set it in `.env`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Auth0 Configuration

1. Create an Auth0 account at https://auth0.com
2. Create a new "Regular Web Application"
3. Configure the application:
   - **Allowed Callback URLs**: `http://localhost:3000/api/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`
4. Enable GitHub social connection:
   - Go to Authentication > Social
   - Enable GitHub
   - Configure with your GitHub OAuth app credentials
5. Copy your application credentials and set in `.env`:

```bash
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_SECRET=generate_with_openssl  # See below
APP_BASE_URL=http://localhost:3000
AUTH0_SCOPE=openid profile email
```

6. Generate AUTH0_SECRET:

```bash
openssl rand -hex 32
```

Copy the output and use it as your `AUTH0_SECRET`.

#### Snowflake Configuration

See [Database Setup](#database-setup) section below for detailed Snowflake configuration.

### 3. Optional Configuration

These optimization flags control scan behavior:

```bash
# Skip AI scans for popular repositories (1000+ stars)
ENABLE_STAR_THRESHOLD_CHECK=true

# Return cached results for unchanged repositories
ENABLE_UNCHANGED_REPO_CHECK=true
```

For development/testing, you may want to set these to `false` to force fresh scans.

---

## Database Setup

OpenSafe uses Snowflake for data persistence. Follow these steps to set up your local development database.

### 1. Create Snowflake Account

1. Go to https://signup.snowflake.com/
2. Sign up for a free trial (30 days, $400 credits)
3. Choose a cloud provider and region (any will work for development)

### 2. Create Database and Warehouse

In the Snowflake web console:

```sql
-- Create database
CREATE DATABASE OPENSAFE_DB;

-- Create warehouse (use X-Small for development to minimize costs)
CREATE WAREHOUSE OPENSAFE_WH
  WITH WAREHOUSE_SIZE = 'X-SMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE;
```

### 3. Run Initialization Script

Execute the initialization script to create the required tables:

```sql
-- In Snowflake web console, run:
USE DATABASE OPENSAFE_DB;
USE SCHEMA PUBLIC;

-- Then paste and run the contents of:
-- scripts/init-snowflake.sql
```

Or use the Snowflake CLI:

```bash
snowsql -f scripts/init-snowflake.sql
```

### 4. Configure Environment Variables

Add your Snowflake credentials to `.env`:

```bash
SNOWFLAKE_ACCOUNT=your_account.region  # e.g., ab12345.us-east-1
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=OPENSAFE_WH
SNOWFLAKE_DATABASE=OPENSAFE_DB
SNOWFLAKE_SCHEMA=PUBLIC
```

### 5. Verify Connection

Test your Snowflake connection:

```bash
npm run test-github  # This will verify your setup without consuming Gemini API credits
```

### Database Schema

The `SCANNED_REPOS` table stores scan results:

| Column       | Type           | Description                                   |
| ------------ | -------------- | --------------------------------------------- |
| ID           | NUMBER         | Auto-incrementing primary key                 |
| REPO_OWNER   | VARCHAR(255)   | GitHub repository owner                       |
| REPO_NAME    | VARCHAR(255)   | GitHub repository name                        |
| LANGUAGE     | VARCHAR(100)   | Primary programming language                  |
| SAFETY_SCORE | VARCHAR(10)    | 'SAFE', 'CAUTION', or 'UNSAFE'                |
| FINDINGS     | VARIANT (JSON) | Detailed scan findings and threat information |
| SCANNED_AT   | TIMESTAMP      | When the scan was performed                   |
| SCANNED_BY   | VARCHAR(255)   | User email from Auth0 who initiated the scan  |

---

## Running the Application

### Development Server

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at: http://localhost:3000

### Features in Development Mode

- **Hot Reload**: Changes to code automatically refresh the browser
- **Error Overlay**: Displays compilation and runtime errors in the browser
- **Fast Refresh**: Preserves component state during edits
- **Source Maps**: Debug with original TypeScript source

### Building for Production

Build the production-optimized bundle:

```bash
npm run build
```

Then start the production server:

```bash
npm start
```

---

## Development Workflow

### Making Changes

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards (see [CONTRIBUTING.md](../CONTRIBUTING.md))

3. **Run tests**:

   ```bash
   npm test
   ```

4. **Check code quality**:

   ```bash
   npm run lint
   npm run type-check
   npm run format:check
   ```

5. **Commit your changes**:

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Git hooks will automatically:
   - Run linting and formatting on staged files (pre-commit)
   - Run all tests before push (pre-push)

6. **Push and create a pull request**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Git Hooks

This project uses Husky and lint-staged to enforce code quality:

- **Pre-commit**: Runs ESLint and Prettier on staged files
- **Pre-push**: Runs all tests to ensure nothing is broken

To skip hooks (not recommended):

```bash
git commit --no-verify -m "message"  # Skip pre-commit
git push --no-verify                  # Skip pre-push
```

---

## Testing

OpenSafe uses Jest and React Testing Library for testing.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test File Locations

Tests can be placed in two ways:

1. **Co-located with source files**: `ComponentName.test.tsx`
2. **In `__tests__` directories**: `__tests__/ComponentName.test.tsx`

### Writing Tests

Example test structure:

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const { user } = render(<MyComponent />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Coverage Reports

After running `npm run test:coverage`, view the HTML report:

```bash
# Open coverage report (macOS)
open coverage/lcov-report/index.html

# Open coverage report (Linux)
xdg-open coverage/lcov-report/index.html

# Open coverage report (Windows)
start coverage/lcov-report/index.html
```

### Testing API Scripts

Test individual services without running the full app:

```bash
# Test GitHub API connection
npm run test-github

# Test Gemini AI API connection
npm run test-gemini

# Test end-to-end scan workflow
npm run test-scan-gemini
```

---

## Code Quality Tools

### Linting (ESLint)

Check for code quality issues:

```bash
# Check for linting errors
npm run lint

# Automatically fix linting errors
npm run lint:fix
```

Configuration: `eslint.config.mjs`

### Formatting (Prettier)

Ensure consistent code formatting:

```bash
# Check if code is formatted correctly
npm run format:check

# Automatically format all files
npm run format
```

Configuration: `.prettierrc`

Prettier settings:

- **Semi-colons**: Required
- **Quotes**: Single quotes
- **Print width**: 80 characters
- **Tab width**: 2 spaces
- **Trailing commas**: ES5-compatible

### Type Checking (TypeScript)

Verify TypeScript types:

```bash
npm run type-check
```

This runs the TypeScript compiler in no-emit mode to check for type errors without building.

### Editor Integration

For the best development experience, configure your editor:

#### VS Code

Install these extensions:

- **ESLint**: `dbaeumer.vscode-eslint`
- **Prettier**: `esbenp.prettier-vscode`
- **TypeScript**: Built-in

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Debugging

### Next.js Debugging

#### Browser DevTools

1. Open Chrome/Edge DevTools (F12)
2. Source maps are enabled by default in development
3. Set breakpoints directly in your TypeScript code

#### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "console": "integratedTerminal"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

### Debugging API Routes

Add console logs in API routes to inspect requests:

```typescript
console.log('Request body:', await request.json());
console.log('User session:', await getSession(request, response));
```

### Debugging Database Queries

Enable Snowflake query logging in `lib/database/snowflake.ts`:

```typescript
const result = await connection.execute({
  sqlText: query,
  binds: params,
});
console.log('Executed query:', query, 'with params:', params);
```

### Debugging AI Scans

Use the test scripts to debug scan workflows:

```bash
# Run with detailed console output
npm run test-scan-gemini
```

View detailed logs in the console for:

- GitHub API requests
- Gemini AI API requests
- Rate limiting
- Error handling

### Network Debugging

Monitor API calls in the browser's Network tab:

- Filter by `Fetch/XHR` to see API requests
- Check request/response payloads
- Verify status codes and response times

---

## Common Issues

### Issue: Environment Variables Not Loading

**Symptoms**: Application throws errors about missing environment variables

**Solutions**:

1. Ensure `.env` file exists in the project root
2. Restart the Next.js dev server after changing `.env`
3. Verify variable names match exactly (case-sensitive)
4. Check for spaces around the `=` sign (should be `KEY=value`)

```bash
# Restart the dev server
npm run dev
```

### Issue: Auth0 Authentication Fails

**Symptoms**: "Callback URL mismatch" or "Invalid state" errors

**Solutions**:

1. Verify callback URLs in Auth0 dashboard match exactly:
   - Development: `http://localhost:3000/api/auth/callback`
   - Production: `https://yourdomain.com/api/auth/callback`

2. Ensure `APP_BASE_URL` in `.env` matches your current environment:

   ```bash
   APP_BASE_URL=http://localhost:3000  # No trailing slash
   ```

3. Clear browser cookies and try again:
   - DevTools > Application > Cookies > Delete all cookies

4. Regenerate `AUTH0_SECRET`:
   ```bash
   openssl rand -hex 32
   ```

### Issue: Snowflake Connection Errors

**Symptoms**: "Failed to connect to Snowflake" or timeout errors

**Solutions**:

1. Verify credentials in `.env` are correct
2. Check that your IP is not blocked (Snowflake network policies)
3. Ensure warehouse is running (auto-resume should handle this)
4. Test connection with Snowflake CLI:

   ```bash
   snowsql -a your_account.region -u your_username
   ```

5. Verify warehouse size is appropriate (X-SMALL for dev):
   ```sql
   SHOW WAREHOUSES;
   ALTER WAREHOUSE OPENSAFE_WH SET WAREHOUSE_SIZE = 'X-SMALL';
   ```

### Issue: Rate Limit Errors (GitHub or Gemini)

**Symptoms**: "Rate limit exceeded" or 429 errors

**Solutions**:

1. **GitHub Rate Limits**:
   - Authenticated: 5,000 requests/hour
   - Unauthenticated: 60 requests/hour
   - Verify `GITHUB_TOKEN` is set in `.env`
   - Check rate limit status:
     ```bash
     curl -H "Authorization: token $GITHUB_TOKEN" \
       https://api.github.com/rate_limit
     ```

2. **Gemini AI Rate Limits**:
   - Default: 60 requests/minute
   - The app has built-in rate limiting and retry logic
   - If testing, add delays between scans
   - Monitor usage at https://console.cloud.google.com/

### Issue: TypeScript Errors After Updating Dependencies

**Symptoms**: Build fails with type errors after `npm install` or update

**Solutions**:

1. Delete `node_modules` and reinstall:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear Next.js cache:

   ```bash
   rm -rf .next
   npm run dev
   ```

3. Update TypeScript types:
   ```bash
   npm update @types/node @types/react @types/react-dom
   ```

### Issue: Tests Failing

**Symptoms**: Tests pass locally but fail in CI, or vice versa

**Solutions**:

1. Clear Jest cache:

   ```bash
   npx jest --clearCache
   npm test
   ```

2. Ensure environment variables are set for testing:
   - Create `.env.test` for test-specific variables
   - Jest automatically loads this file

3. Check for timing issues in async tests:
   - Use `waitFor` for async assertions
   - Use `screen.findBy*` instead of `screen.getBy*` for async elements

### Issue: Hot Reload Not Working

**Symptoms**: Changes to code don't trigger page reload

**Solutions**:

1. Restart the dev server:

   ```bash
   npm run dev
   ```

2. Check file watching limits (Linux):

   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

3. Ensure files are saved properly (check for unsaved indicators)

4. Clear Next.js cache and restart:
   ```bash
   rm -rf .next
   npm run dev
   ```

### Issue: Build Fails in Production

**Symptoms**: `npm run build` fails with errors

**Solutions**:

1. Check for TypeScript errors:

   ```bash
   npm run type-check
   ```

2. Check for linting errors:

   ```bash
   npm run lint
   ```

3. Ensure all environment variables are set for production build

4. Review build logs for specific error messages

5. Test production build locally:
   ```bash
   npm run build
   npm start
   ```

---

## Project Structure

Understanding the codebase organization:

```
opensafe/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (HTTP handlers)
│   │   ├── repos/         # GET scanned repositories
│   │   └── scan-gemini/   # POST/GET scan operations
│   ├── repo/              # Repository detail pages
│   ├── scan/              # Scan interface page
│   └── page.tsx           # Home page (repository index)
├── lib/                   # Business logic (reusable services)
│   ├── ai/               # AI service layer
│   │   └── gemini/       # Gemini AI client and workflow
│   ├── database/         # Database operations (Snowflake)
│   ├── github/           # GitHub API client
│   ├── scan/             # Scan helper utilities
│   ├── validations/      # Input validation and sanitization
│   ├── auth0.ts          # Auth0 configuration
│   ├── constants.ts      # Application constants
│   └── ui-helpers.ts     # UI utility functions
├── components/           # React components
│   └── ui/              # Reusable UI components (shadcn/ui)
├── types/               # TypeScript type definitions
│   ├── api.ts          # API request/response types
│   ├── database.ts     # Database schema types
│   ├── github.ts       # GitHub API types
│   └── scan.ts         # Scan result types
├── scripts/            # Utility scripts
│   ├── init-snowflake.sql  # Database initialization
│   ├── test-gemini.ts      # Test Gemini API connection
│   ├── test-github.ts      # Test GitHub API connection
│   └── test-scan-gemini.ts # Test end-to-end scan
├── docs/               # Documentation
│   ├── API.md          # API endpoint documentation
│   ├── ARCHITECTURE.md # System design and architecture
│   └── DEVELOPMENT.md  # This file
└── .github/            # GitHub configuration
    └── workflows/      # CI/CD workflows (when available)
```

### Architecture Principles

OpenSafe follows a **service layer pattern**:

- **API routes** (`app/api/`) are thin HTTP handlers
  - Handle authentication, validation, and HTTP concerns
  - Delegate business logic to service layer

- **Service layer** (`lib/`) contains reusable business logic
  - Framework-agnostic (can be used in API routes, CLI scripts, etc.)
  - Easier to test (no HTTP overhead)
  - Highly reusable

**Example**:

- ❌ Don't put business logic in API routes
- ✅ Do put business logic in `lib/` and call it from API routes

This pattern makes the codebase:

- More testable
- More reusable
- More maintainable
- Framework-agnostic

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architectural documentation.

---

## Useful Scripts

### Development

| Script          | Description                                    |
| --------------- | ---------------------------------------------- |
| `npm run dev`   | Start development server with hot reload       |
| `npm run build` | Build production bundle                        |
| `npm start`     | Start production server (requires build first) |

### Code Quality

| Script                 | Description                            |
| ---------------------- | -------------------------------------- |
| `npm run lint`         | Check for linting errors               |
| `npm run lint:fix`     | Automatically fix linting errors       |
| `npm run type-check`   | Run TypeScript type checking           |
| `npm run format`       | Format all files with Prettier         |
| `npm run format:check` | Check if files are formatted correctly |

### Testing

| Script                     | Description                           |
| -------------------------- | ------------------------------------- |
| `npm test`                 | Run all tests once                    |
| `npm run test:watch`       | Run tests in watch mode (recommended) |
| `npm run test:coverage`    | Run tests with coverage report        |
| `npm run test-github`      | Test GitHub API connection            |
| `npm run test-gemini`      | Test Gemini AI API connection         |
| `npm run test-scan-gemini` | Test end-to-end scan workflow         |

### Git Hooks

| Hook       | Description                                 |
| ---------- | ------------------------------------------- |
| Pre-commit | Runs linting and formatting on staged files |
| Pre-push   | Runs all tests before pushing               |

---

## Additional Resources

- **API Documentation**: [docs/API.md](API.md)
- **Architecture Guide**: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Contributing Guide**: [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Security Policy**: [SECURITY.md](../SECURITY.md)

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [API Documentation](API.md) for endpoint details
2. Review the [Architecture Documentation](ARCHITECTURE.md) for system design
3. Search existing [GitHub Issues](https://github.com/gitrlawton/opensafe/issues)
4. Open a new issue with the "question" template

---

**Happy coding! 🚀**
