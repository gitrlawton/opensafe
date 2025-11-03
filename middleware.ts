/**
 * Next.js Middleware - Global Request Interceptor
 *
 * This middleware runs on every request to the application (except static assets).
 * Integrates Auth0 authentication to protect routes and manage user sessions.
 *
 * Features:
 * - Enforces authentication on protected routes
 * - Handles Auth0 session validation
 * - Gracefully recovers from invalid/expired sessions
 * - Clears corrupted session cookies (JWE errors)
 *
 * Protected Routes:
 * - All routes except: /_next/static, /_next/image, /favicon.ico, /sitemap.xml, /robots.txt
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 * @module middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

/**
 * Global middleware function that handles authentication for all routes
 *
 * Wraps Auth0 middleware with error handling to gracefully recover from
 * session corruption or authentication errors.
 *
 * Error Handling:
 * - JWE errors (corrupted session): Clears session cookie and allows request
 * - Other errors: Re-throws to be handled by Next.js error boundaries
 *
 * @param request - Incoming Next.js request object
 * @returns NextResponse with authentication headers or redirect to login
 */
export async function middleware(request: NextRequest) {
  try {
    return await auth0.middleware(request);
  } catch (error) {
    console.error('Auth middleware error:', error);

    // Only handle session errors, not auth flow errors
    if (error instanceof Error && error.message.includes('JWE')) {
      // If there's an invalid session cookie, clear it and continue
      const response = NextResponse.next();
      response.cookies.delete('appSession');
      return response;
    }

    // Re-throw other errors (like auth flow errors)
    throw error;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
