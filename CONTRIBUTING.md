# Contributing to OpenSafe

Thank you for your interest in contributing to OpenSafe! We're excited to have you join our community of developers working to make open source contributions safer for everyone.

This document provides guidelines and instructions for contributing to OpenSafe. Please take a moment to review it before submitting your contribution.

## Table of Contents

- [Security Guidelines](#security-guidelines)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Requirements](#documentation-requirements)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Review Process](#review-process)
- [Getting Help](#getting-help)

## Security Guidelines

Security is a top priority for OpenSafe. Before contributing, please review our comprehensive security guidelines in [SECURITY.md](SECURITY.md), which includes:

- **Security Best Practices** - Never commit secrets, input validation with Zod, authentication checks, dependency security
- **Code Review Security Checklist** - 8 essential security checks before submitting PRs
- **Vulnerability Reporting** - How to responsibly disclose security issues

Key requirements for all contributions:

- Use `npm audit` to check dependencies for vulnerabilities before submitting PRs
- Validate all user inputs using Zod schemas (see `lib/validations/`)
- Never commit API keys, tokens, or credentials (use `.env` files)
- Review [SECURITY.md](SECURITY.md#security-best-practices-for-contributors) before your first contribution

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)

### Required Accounts

To run OpenSafe locally, you'll need accounts with the following services:

1. **GitHub** - For repository access and OAuth authentication
2. **Google Cloud** - For Gemini AI API access
3. **Auth0** - For authentication management
4. **Snowflake** - For database storage

## Development Environment Setup

### 1. Fork and Clone the Repository

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/gitrlawton/opensafe.git
cd opensafe
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit the `.env` file and configure the following:

#### GitHub API Configuration

```env
GITHUB_TOKEN=your_github_personal_access_token_here
```

Create a GitHub Personal Access Token at [github.com/settings/tokens](https://github.com/settings/tokens) with `public_repo` scope.

#### Google Gemini API Configuration

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

#### Auth0 Configuration

```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_SECRET=generate_using_openssl_rand_hex_32
APP_BASE_URL=http://localhost:3000
AUTH0_SCOPE=openid profile email
```

1. Create an Auth0 account at [auth0.com](https://auth0.com)
2. Create a new "Regular Web Application"
3. Configure Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
4. Configure Allowed Logout URLs: `http://localhost:3000`
5. Enable GitHub social connection
6. Generate `AUTH0_SECRET` using: `openssl rand -hex 32`

#### Snowflake Database Configuration

```env
SNOWFLAKE_ACCOUNT=your_account.region
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=PUBLIC
```

1. Create a Snowflake account at [signup.snowflake.com](https://signup.snowflake.com/)
2. Create a database and warehouse (use X-Small for development to minimize costs)
3. Run the SQL initialization script: `scripts/init-snowflake.sql`

#### Optional: Scan Optimization Controls

```env
ENABLE_STAR_THRESHOLD_CHECK=true
ENABLE_UNCHANGED_REPO_CHECK=true
```

See [.env.example](.env.example) for detailed descriptions of all configuration options.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### 5. Verify Your Setup

Test that your environment is configured correctly:

```bash
# Test GitHub API connection
npm run test-github

# Test Gemini API connection
npm run test-gemini
```

## Development Workflow

1. **Create a branch** for your changes (see [Branch Naming Conventions](#branch-naming-conventions))
2. **Make your changes** following our [Coding Standards](#coding-standards)
3. **Write or update tests** for your changes
4. **Run tests** to ensure everything works
5. **Commit your changes** following our [Commit Message Guidelines](#commit-message-guidelines)
6. **Push to your fork** and submit a pull request

## Coding Standards

We maintain high code quality standards to ensure maintainability and consistency.

### TypeScript

- **Always use TypeScript** - No plain JavaScript files
- **Explicit return types** - All functions must have explicit return types
- **No `any` types** - Use proper type definitions or `unknown` if necessary
- **Strict mode** - TypeScript strict mode is enabled

### Code Style

We use automated tools to enforce code style:

- **ESLint** - For code quality and consistency
- **Prettier** - For code formatting
- **lint-staged** - Runs linters on git staged files

These tools run automatically on commit via git hooks, but you can run them manually:

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Check code formatting
npm run format:check

# Format code with Prettier
npm run format

# Type-check TypeScript
npm run type-check
```

### Naming Conventions

- **Variables and functions**: `camelCase`
- **Components and classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**:
  - Components: `PascalCase.tsx`
  - Utilities/Services: `kebab-case.ts`
  - Types: `kebab-case.ts`

### Code Organization

- **Service Layer Pattern**: Business logic goes in `lib/`, not in API routes
- **Thin API Routes**: API routes should only handle HTTP concerns (auth, validation, responses)
- **Domain-Grouped Files**: Organize by domain (`lib/ai/`, `lib/github/`, `lib/database/`)
- **Shared Types**: Define types in `types/` directory

### Documentation

- **JSDoc comments** required for all:
  - Exported functions
  - Classes and methods
  - Complex utility functions
- **Inline comments** for complex logic
- **Type documentation** in type definition files

Example JSDoc format:

````typescript
/**
 * Scans a GitHub repository for security threats
 *
 * @param repoUrl - The GitHub repository URL to scan
 * @param options - Optional scan configuration
 * @param options.skipCache - Force a fresh scan even if cached results exist
 * @returns The scan results including safety level and detected threats
 * @throws {ValidationError} If the repository URL is invalid
 * @throws {APIError} If the scan service is unavailable
 * @example
 * ```typescript
 * const results = await scanRepository('https://github.com/user/repo', {
 *   skipCache: false
 * });
 * ```
 */
````

## Testing Requirements

All code contributions must include appropriate tests.

### Test Types

- **Unit tests** - For utility functions and services
- **Integration tests** - For API routes and database operations
- **Component tests** - For React components

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Guidelines

- Write tests for new features before or alongside implementation
- Maintain or improve test coverage (aim for >80%)
- Test edge cases and error conditions
- Use descriptive test names that explain what is being tested
- Mock external dependencies (API calls, database queries)

### Example Test

```typescript
describe('scanRepository', () => {
  it('should return SAFE for repositories with no threats', async () => {
    const result = await scanRepository('https://github.com/safe/repo');
    expect(result.safetyLevel).toBe('SAFE');
    expect(result.threats).toHaveLength(0);
  });

  it('should throw ValidationError for invalid URLs', async () => {
    await expect(scanRepository('not-a-url')).rejects.toThrow(ValidationError);
  });
});
```

### Git Hooks

Our git hooks automatically run checks before commits and pushes:

- **Pre-commit**: Runs `lint-staged` (ESLint + Prettier on staged files)
- **Pre-push**: Runs all tests

If these checks fail, the commit or push will be blocked. Fix the issues and try again.

## Documentation Requirements

Documentation is crucial for project maintainability. When contributing:

### Code Documentation

- Add JSDoc comments to all exported functions, classes, and methods
- Document complex algorithms and business logic
- Update type definitions when changing data structures

### README Updates

- Update README.md if you add new features or change setup instructions
- Add screenshots for UI changes

### API Documentation

- Document new API endpoints in `docs/API.md`
- Include request/response examples

### Architecture Documentation

- Update `docs/ARCHITECTURE.md` for significant architectural changes
- Explain design decisions in pull request descriptions

## Commit Message Guidelines

We follow the **imperative mood** convention for commit messages.

### Format

```
<type>: <subject>

<body (optional)>
```

### Type

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates, etc.
- `perf`: Performance improvements

### Subject Line

- Use imperative mood: "Add feature" not "Added feature" or "Adds feature"
- Keep it under 72 characters
- Don't end with a period
- Capitalize the first letter

### Examples

**Good:**

```
feat: Add malicious dependency detection to scan workflow

fix: Resolve race condition in concurrent API requests

docs: Update environment setup instructions in CONTRIBUTING.md

refactor: Extract file prioritization logic into separate utility

test: Add coverage for GitHub API error handling
```

**Bad:**

```
Added new feature
fixed bug
WIP
Update files
```

### Body (Optional)

If your commit requires explanation:

- Separate from subject with a blank line
- Explain _what_ and _why_, not _how_
- Wrap at 72 characters

## Branch Naming Conventions

Use descriptive branch names that indicate the purpose of your changes:

### Format

```
<type>/<short-description>
```

### Types

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes
- `chore/` - Maintenance tasks

### Examples

```
feature/dependency-vulnerability-scanning
fix/github-api-rate-limit-handling
docs/api-endpoint-documentation
refactor/scan-workflow-optimization
test/github-client-coverage
chore/update-dependencies
```

### Guidelines

- Use lowercase
- Use hyphens to separate words
- Keep it short but descriptive
- Avoid special characters

## Pull Request Process

### Before Submitting

1. **Sync with main branch**:

   ```bash
   git checkout main
   git pull upstream main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run all checks**:

   ```bash
   npm run lint
   npm run type-check
   npm test
   ```

3. **Update documentation** if needed

4. **Test your changes** thoroughly

### Submitting a Pull Request

1. **Push to your fork**:

   ```bash
   git push origin your-feature-branch
   ```

2. **Create PR on GitHub** with a clear title and description

3. **Fill out the PR template** which will be automatically loaded:
   - The template includes all required sections
   - Complete all relevant checkboxes
   - Provide clear descriptions and testing details
   - Link related issues using keywords (e.g., "Closes #123", "Fixes #456")
   - See `.github/PULL_REQUEST_TEMPLATE.md` for the full template

4. **Ensure CI checks pass** - All automated checks must pass before merge

### PR Guidelines

- **One PR per feature/fix** - Keep changes focused
- **Small, reviewable PRs** - Break large changes into smaller PRs
- **Clear description** - Explain what and why, not just what changed
- **Update tests** - Include test updates or additions
- **No merge commits** - Rebase on main before submitting
- **CI must pass** - All automated checks must pass

### PR Title Format

Follow the same format as commit messages:

```
feat: Add malicious dependency detection
fix: Resolve database connection timeout
docs: Improve API documentation
```

## Reporting Bugs

Found a bug? Please help us fix it!

### Before Reporting

1. **Check existing issues** - Someone may have already reported it
2. **Verify it's a bug** - Ensure it's not a configuration issue
3. **Test on latest version** - Pull the latest changes and test again

### Bug Report Template

When creating a bug report, include:

1. **Clear title** - Descriptive summary of the bug
2. **Description** - What happened vs. what you expected
3. **Steps to reproduce**:
   ```
   1. Go to '...'
   2. Click on '...'
   3. Scroll down to '...'
   4. See error
   ```
4. **Environment details**:
   - OS (Windows, macOS, Linux)
   - Node.js version
   - Browser (if UI-related)
5. **Screenshots** - If applicable
6. **Error messages** - Full error output or stack traces
7. **Possible solution** - If you have ideas

### Security Vulnerabilities

**Do not open public issues for security vulnerabilities.**

Instead, report security vulnerabilities through GitHub's security advisory feature:

1. Navigate to the [Security tab](../../security/advisories/new)
2. Click "Report a vulnerability"
3. Fill out the vulnerability details

See [SECURITY.md](SECURITY.md#reporting-a-vulnerability) for complete reporting guidelines, including what information to provide and our response timeline.

## Suggesting Features

We love new ideas! Here's how to suggest features:

### Feature Request Template

1. **Clear title** - Brief description of the feature
2. **Problem statement** - What problem does this solve?
3. **Proposed solution** - How should it work?
4. **Alternatives considered** - Other approaches you've thought about
5. **Additional context** - Screenshots, mockups, examples
6. **Use cases** - Real-world scenarios where this would help

### Feature Discussion

- Be open to feedback and discussion
- Consider implementation complexity
- Think about edge cases and potential issues
- Be willing to contribute the implementation

## Review Process

### What to Expect

1. **Initial review** - A maintainer will review within 1-3 business days
2. **Feedback** - You may receive requests for changes
3. **Iteration** - Make requested changes and push updates
4. **Approval** - Once approved, a maintainer will merge your PR
5. **Recognition** - You'll be added to our contributors list

### Review Criteria

Reviewers will check:

- Code quality and style compliance
- Test coverage and passing tests
- Documentation completeness
- Adherence to architectural patterns
- Security compliance (see [SECURITY.md Code Review Checklist](SECURITY.md#code-review-checklist))
- Performance implications
- Backward compatibility

### Addressing Feedback

- Respond to all comments, even if just to acknowledge
- Make requested changes in new commits (don't force push during review)
- Ask questions if feedback is unclear
- Be open to suggestions and alternative approaches
- Mark conversations as resolved when addressed

### After Merge

- Your contribution will be included in the next release
- Delete your feature branch
- Celebrate your contribution!

## Getting Help

Need help contributing? Here are some resources:

### Documentation

- [README.md](README.md) - Project overview and setup
- [SECURITY.md](SECURITY.md) - Security policies
- [.env.example](.env.example) - Environment configuration

### Communication

- **[GitHub Discussions](https://github.com/gitrlawton/opensafe/discussions)** - For questions, help, ideas, and general discussion
- **GitHub Issues** - For bugs and feature requests
- **Pull Request Comments** - For code-specific discussions

### Common Issues

**"My pre-commit hook is failing"**

- Run `npm run lint:fix` to auto-fix linting issues
- Run `npm run format` to format code
- Check that all files are properly typed

**"Tests are failing locally"**

- Ensure your `.env` file is properly configured
- Run `npm install` to ensure dependencies are up to date
- Check that test databases/services are running

**"I don't know where to start"**

- Look for issues labeled `good first issue`
- Check our roadmap for planned features
- Ask in the issue comments before starting work

## Recognition

All contributors will be recognized in:

- Project README
- Release notes
- AUTHORS.md file (coming soon)

Thank you for contributing to OpenSafe and helping make open source safer!
