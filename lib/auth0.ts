/**
 * Auth0 Authentication Configuration
 *
 * Initializes the Auth0 client for server-side authentication.
 * This configuration is used by middleware.ts to protect routes and manage sessions.
 *
 * Environment Variables Required:
 * - AUTH0_DOMAIN: Your Auth0 tenant domain
 * - AUTH0_CLIENT_ID: Application client ID
 * - AUTH0_CLIENT_SECRET: Application client secret
 * - APP_BASE_URL: Base URL of your application
 * - AUTH0_SECRET: Secret for encrypting session cookies (min 32 chars)
 * - AUTH0_SCOPE: OAuth scopes (default: "openid profile email")
 *
 * @module lib/auth0
 */

import 'server-only';
import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  appBaseUrl: process.env.APP_BASE_URL!,
  secret: process.env.AUTH0_SECRET!,
  authorizationParameters: {
    scope: process.env.AUTH0_SCOPE || 'openid profile email',
  },
});
