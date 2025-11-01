/**
 * Jest Setup File
 *
 * This file runs before each test file and sets up global test utilities.
 * It imports custom matchers from @testing-library/jest-dom for better assertions.
 */

import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.AUTH0_SECRET = 'test-secret-key-at-least-32-characters-long';
process.env.APP_BASE_URL = 'http://localhost:3000';
process.env.AUTH0_DOMAIN = 'test.auth0.com';
process.env.AUTH0_CLIENT_ID = 'test-client-id';
process.env.AUTH0_CLIENT_SECRET = 'test-client-secret';
process.env.AUTH0_SCOPE = 'openid profile email';
process.env.GITHUB_TOKEN = 'test-github-token';
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.SNOWFLAKE_ACCOUNT = 'test-account.us-east-1';
process.env.SNOWFLAKE_USERNAME = 'test-username';
process.env.SNOWFLAKE_PASSWORD = 'test-password';
process.env.SNOWFLAKE_DATABASE = 'test-database';
process.env.SNOWFLAKE_SCHEMA = 'PUBLIC';
process.env.SNOWFLAKE_WAREHOUSE = 'test-warehouse';
process.env.ENABLE_STAR_THRESHOLD_CHECK = 'false';
process.env.ENABLE_UNCHANGED_REPO_CHECK = 'false';

// Suppress console errors in tests (optional - uncomment if needed)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };
