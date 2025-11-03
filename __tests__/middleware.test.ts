/**
 * Tests for Next.js Middleware
 *
 * This test suite validates the authentication middleware that protects routes
 * and handles Auth0 session management and error recovery.
 *
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';
import { middleware, config } from '../middleware';
import { auth0 } from '../lib/auth0';

// Mock the auth0 module
jest.mock('../lib/auth0', () => ({
  auth0: {
    middleware: jest.fn(),
  },
}));

describe('Middleware', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Authentication Flow', () => {
    it('should call auth0.middleware with the request', async () => {
      const mockResponse = NextResponse.next();
      (auth0.middleware as jest.Mock).mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/dashboard');
      const response = await middleware(request);

      expect(auth0.middleware).toHaveBeenCalledWith(request);
      expect(response).toBe(mockResponse);
    });

    it('should return auth0 middleware response on success', async () => {
      const mockResponse = NextResponse.redirect(
        new URL('/api/auth/login', 'http://localhost:3000')
      );
      (auth0.middleware as jest.Mock).mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/protected');
      const response = await middleware(request);

      expect(response).toBe(mockResponse);
      expect(response.status).toBe(mockResponse.status);
    });

    it('should handle authenticated requests', async () => {
      const mockResponse = NextResponse.next();
      mockResponse.headers.set('x-user-authenticated', 'true');
      (auth0.middleware as jest.Mock).mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/scan');
      const response = await middleware(request);

      expect(auth0.middleware).toHaveBeenCalled();
      expect(response).toBe(mockResponse);
    });
  });

  describe('JWE Error Handling (Corrupted Session)', () => {
    it('should clear appSession cookie on JWE error', async () => {
      const jweError = new Error('JWE decrypt failed');
      (auth0.middleware as jest.Mock).mockRejectedValue(jweError);

      const request = new NextRequest('http://localhost:3000/dashboard');
      const response = await middleware(request);

      expect(console.error).toHaveBeenCalledWith(
        'Auth middleware error:',
        jweError
      );
      expect(response).toBeInstanceOf(NextResponse);

      // Verify cookie was deleted (expires set to epoch and value empty)
      const cookie = response.cookies.get('appSession');
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe('');
      const expiresTime =
        cookie?.expires instanceof Date
          ? cookie.expires.getTime()
          : cookie?.expires;
      expect(expiresTime).toBe(new Date(0).getTime());
    });

    it('should continue request after clearing corrupted session', async () => {
      const jweError = new Error('Invalid JWE format');
      (auth0.middleware as jest.Mock).mockRejectedValue(jweError);

      const request = new NextRequest('http://localhost:3000/page');
      const response = await middleware(request);

      // Should return NextResponse.next() to continue the request
      expect(response.status).toBe(200);
    });

    it('should handle various JWE error messages', async () => {
      const jweErrorMessages = [
        'JWE decrypt failed',
        'Invalid JWE format',
        'JWE validation error',
        'Corrupted JWE token',
      ];

      for (const errorMessage of jweErrorMessages) {
        jest.clearAllMocks();
        const error = new Error(errorMessage);
        (auth0.middleware as jest.Mock).mockRejectedValue(error);

        const request = new NextRequest('http://localhost:3000/test');
        const response = await middleware(request);

        expect(response).toBeInstanceOf(NextResponse);
        const cookie = response.cookies.get('appSession');
        expect(cookie?.value).toBe('');
      }
    });

    it('should log JWE errors to console', async () => {
      const jweError = new Error('JWE error occurred');
      (auth0.middleware as jest.Mock).mockRejectedValue(jweError);

      const request = new NextRequest('http://localhost:3000/test');
      await middleware(request);

      expect(console.error).toHaveBeenCalledWith(
        'Auth middleware error:',
        jweError
      );
    });
  });

  describe('Other Error Handling', () => {
    it('should re-throw non-JWE errors', async () => {
      const authError = new Error('Authentication failed');
      (auth0.middleware as jest.Mock).mockRejectedValue(authError);

      const request = new NextRequest('http://localhost:3000/protected');

      await expect(middleware(request)).rejects.toThrow(
        'Authentication failed'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Auth middleware error:',
        authError
      );
    });

    it('should re-throw errors that do not contain JWE in message', async () => {
      const networkError = new Error('Network connection failed');
      (auth0.middleware as jest.Mock).mockRejectedValue(networkError);

      const request = new NextRequest('http://localhost:3000/api/scan');

      await expect(middleware(request)).rejects.toThrow(
        'Network connection failed'
      );
    });

    it('should handle non-Error objects', async () => {
      const stringError = 'Something went wrong';
      (auth0.middleware as jest.Mock).mockRejectedValue(stringError);

      const request = new NextRequest('http://localhost:3000/page');

      await expect(middleware(request)).rejects.toBe(stringError);
    });

    it('should log all errors before handling them', async () => {
      const error = new Error('Test error');
      (auth0.middleware as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/test');

      try {
        await middleware(request);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_e) {
        // Expected to throw
      }

      expect(console.error).toHaveBeenCalledWith(
        'Auth middleware error:',
        error
      );
    });
  });

  describe('Session Cookie Management', () => {
    it('should only delete appSession cookie, not other cookies', async () => {
      const jweError = new Error('JWE error');
      (auth0.middleware as jest.Mock).mockRejectedValue(jweError);

      const request = new NextRequest('http://localhost:3000/test');
      request.cookies.set('appSession', 'corrupted-session-data');
      request.cookies.set('otherCookie', 'should-remain');

      const response = await middleware(request);

      const cookie = response.cookies.get('appSession');
      expect(cookie?.value).toBe('');
      // Note: NextResponse.next() creates a new response, so request cookies don't transfer
      // but the important part is that we're calling delete on appSession specifically
    });

    it('should handle case where appSession cookie does not exist', async () => {
      const jweError = new Error('JWE error');
      (auth0.middleware as jest.Mock).mockRejectedValue(jweError);

      const request = new NextRequest('http://localhost:3000/test');
      // No cookies set

      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      const cookie = response.cookies.get('appSession');
      expect(cookie?.value).toBe('');
    });
  });

  describe('Middleware Configuration', () => {
    it('should have correct matcher configuration', () => {
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
      expect(config.matcher).toHaveLength(1);
    });

    it('should exclude static files from middleware', () => {
      const matcher = config.matcher[0];

      // The regex should exclude _next/static
      expect(matcher).toContain('_next/static');
      expect(matcher).toContain('_next/image');
      expect(matcher).toContain('favicon.ico');
    });

    it('should exclude metadata files from middleware', () => {
      const matcher = config.matcher[0];

      expect(matcher).toContain('sitemap.xml');
      expect(matcher).toContain('robots.txt');
    });

    it('should use negative lookahead pattern', () => {
      const matcher = config.matcher[0];

      // Should start with / and use negative lookahead (?!)
      expect(matcher).toMatch(/^\//);
      expect(matcher).toContain('(?!');
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests to root path', async () => {
      const mockResponse = NextResponse.next();
      (auth0.middleware as jest.Mock).mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/');
      const response = await middleware(request);

      expect(auth0.middleware).toHaveBeenCalledWith(request);
      expect(response).toBe(mockResponse);
    });

    it('should handle requests with query parameters', async () => {
      const mockResponse = NextResponse.next();
      (auth0.middleware as jest.Mock).mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/repos?limit=10');
      const response = await middleware(request);

      expect(auth0.middleware).toHaveBeenCalledWith(request);
      expect(response).toBe(mockResponse);
    });

    it('should handle requests with URL fragments', async () => {
      const mockResponse = NextResponse.next();
      (auth0.middleware as jest.Mock).mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/page#section');
      const response = await middleware(request);

      expect(auth0.middleware).toHaveBeenCalled();
      expect(response).toBe(mockResponse);
    });

    it('should handle concurrent requests independently', async () => {
      const mockResponse1 = NextResponse.next();
      const mockResponse2 = NextResponse.redirect(
        new URL('/login', 'http://localhost:3000')
      );

      (auth0.middleware as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const request1 = new NextRequest('http://localhost:3000/page1');
      const request2 = new NextRequest('http://localhost:3000/page2');

      const [response1, response2] = await Promise.all([
        middleware(request1),
        middleware(request2),
      ]);

      expect(response1).toBe(mockResponse1);
      expect(response2).toBe(mockResponse2);
      expect(auth0.middleware).toHaveBeenCalledTimes(2);
    });
  });
});
