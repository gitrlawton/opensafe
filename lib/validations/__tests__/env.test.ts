/**
 * Tests for Environment Variable Validation
 *
 * This test suite validates the Zod schemas and functions that ensure
 * all required environment variables are present and properly formatted.
 *
 * @jest-environment node
 */

import { ZodError } from 'zod';
import {
  serverEnvSchema,
  clientEnvSchema,
  validateServerEnv,
  validateClientEnv,
} from '../env';

describe('Environment Validation', () => {
  // Save original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('serverEnvSchema', () => {
    const validEnv = {
      NODE_ENV: 'test' as const,
      AUTH0_SECRET: 'a'.repeat(32),
      APP_BASE_URL: 'http://localhost:3000',
      AUTH0_DOMAIN: 'test.auth0.com',
      AUTH0_CLIENT_ID: 'test-client-id',
      AUTH0_CLIENT_SECRET: 'test-client-secret',
      GEMINI_API_KEY: 'test-gemini-key',
      SNOWFLAKE_ACCOUNT: 'test-account',
      SNOWFLAKE_USERNAME: 'test-user',
      SNOWFLAKE_PASSWORD: 'test-password',
      SNOWFLAKE_DATABASE: 'test-db',
      SNOWFLAKE_SCHEMA: 'PUBLIC',
      SNOWFLAKE_WAREHOUSE: 'test-warehouse',
    };

    describe('AUTH0 configuration', () => {
      it('should accept valid AUTH0 environment variables', () => {
        expect(() => serverEnvSchema.parse(validEnv)).not.toThrow();
      });

      it('should reject AUTH0_SECRET shorter than 32 characters', () => {
        const invalidEnv = { ...validEnv, AUTH0_SECRET: 'short' };
        expect(() => serverEnvSchema.parse(invalidEnv)).toThrow(ZodError);
      });

      it('should accept AUTH0_SECRET exactly 32 characters', () => {
        const env = { ...validEnv, AUTH0_SECRET: 'a'.repeat(32) };
        expect(() => serverEnvSchema.parse(env)).not.toThrow();
      });

      it('should reject invalid APP_BASE_URL', () => {
        const invalidEnv = { ...validEnv, APP_BASE_URL: 'not-a-url' };
        expect(() => serverEnvSchema.parse(invalidEnv)).toThrow(ZodError);
      });

      it('should accept valid HTTP and HTTPS URLs for APP_BASE_URL', () => {
        const httpEnv = { ...validEnv, APP_BASE_URL: 'http://localhost:3000' };
        const httpsEnv = { ...validEnv, APP_BASE_URL: 'https://example.com' };
        expect(() => serverEnvSchema.parse(httpEnv)).not.toThrow();
        expect(() => serverEnvSchema.parse(httpsEnv)).not.toThrow();
      });

      it('should reject empty AUTH0_DOMAIN', () => {
        const invalidEnv = { ...validEnv, AUTH0_DOMAIN: '' };
        expect(() => serverEnvSchema.parse(invalidEnv)).toThrow(ZodError);
      });

      it('should reject missing AUTH0_CLIENT_ID', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { AUTH0_CLIENT_ID: _AUTH0_CLIENT_ID, ...invalidEnv } = validEnv;
        expect(() => serverEnvSchema.parse(invalidEnv)).toThrow(ZodError);
      });

      it('should accept optional AUTH0_SCOPE', () => {
        const envWithScope = {
          ...validEnv,
          AUTH0_SCOPE: 'openid profile email',
        };
        expect(() => serverEnvSchema.parse(envWithScope)).not.toThrow();
      });

      it('should work without AUTH0_SCOPE', () => {
        expect(() => serverEnvSchema.parse(validEnv)).not.toThrow();
      });
    });

    describe('API Keys', () => {
      it('should require GEMINI_API_KEY', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { GEMINI_API_KEY: _GEMINI_API_KEY, ...invalidEnv } = validEnv;
        expect(() => serverEnvSchema.parse(invalidEnv)).toThrow(ZodError);
      });

      it('should reject empty GEMINI_API_KEY', () => {
        const invalidEnv = { ...validEnv, GEMINI_API_KEY: '' };
        expect(() => serverEnvSchema.parse(invalidEnv)).toThrow(ZodError);
      });

      it('should allow optional GITHUB_TOKEN', () => {
        expect(() => serverEnvSchema.parse(validEnv)).not.toThrow();
        const envWithToken = { ...validEnv, GITHUB_TOKEN: 'ghp_test123' };
        expect(() => serverEnvSchema.parse(envWithToken)).not.toThrow();
      });
    });

    describe('Snowflake configuration', () => {
      it('should require all Snowflake environment variables', () => {
        const snowflakeFields = [
          'SNOWFLAKE_ACCOUNT',
          'SNOWFLAKE_USERNAME',
          'SNOWFLAKE_PASSWORD',
          'SNOWFLAKE_DATABASE',
          'SNOWFLAKE_SCHEMA',
          'SNOWFLAKE_WAREHOUSE',
        ];

        snowflakeFields.forEach((field) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [field]: _removed, ...invalidEnv } = validEnv as any;
          expect(() => serverEnvSchema.parse(invalidEnv)).toThrow(ZodError);
        });
      });

      it('should reject empty Snowflake credentials', () => {
        const invalidEnv = { ...validEnv, SNOWFLAKE_PASSWORD: '' };
        expect(() => serverEnvSchema.parse(invalidEnv)).toThrow(ZodError);
      });

      it('should accept valid Snowflake configuration', () => {
        const snowflakeEnv = {
          ...validEnv,
          SNOWFLAKE_ACCOUNT: 'abc123.us-east-1',
          SNOWFLAKE_USERNAME: 'ADMIN',
          SNOWFLAKE_DATABASE: 'OPENSAFE',
          SNOWFLAKE_SCHEMA: 'PUBLIC',
        };
        expect(() => serverEnvSchema.parse(snowflakeEnv)).not.toThrow();
      });
    });

    describe('Optional configuration', () => {
      it('should accept valid NODE_ENV values', () => {
        const devEnv = { ...validEnv, NODE_ENV: 'development' };
        const prodEnv = { ...validEnv, NODE_ENV: 'production' };
        const testEnv = { ...validEnv, NODE_ENV: 'test' };

        expect(() => serverEnvSchema.parse(devEnv)).not.toThrow();
        expect(() => serverEnvSchema.parse(prodEnv)).not.toThrow();
        expect(() => serverEnvSchema.parse(testEnv)).not.toThrow();
      });

      it('should reject invalid NODE_ENV values', () => {
        const invalidEnv = { ...validEnv, NODE_ENV: 'staging' };
        expect(() => serverEnvSchema.parse(invalidEnv)).toThrow(ZodError);
      });

      it('should allow optional GEMINI_MODEL', () => {
        const envWithModel = { ...validEnv, GEMINI_MODEL: 'gemini-pro' };
        expect(() => serverEnvSchema.parse(envWithModel)).not.toThrow();
      });

      it('should work without optional fields', () => {
        expect(() => serverEnvSchema.parse(validEnv)).not.toThrow();
      });
    });
  });

  describe('clientEnvSchema', () => {
    it('should accept empty object', () => {
      expect(() => clientEnvSchema.parse({})).not.toThrow();
    });

    it('should accept object with any properties', () => {
      const envWithExtras = {
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
        OTHER_VAR: 'value',
      };
      expect(() => clientEnvSchema.parse(envWithExtras)).not.toThrow();
    });
  });

  describe('validateServerEnv', () => {
    const validEnv = {
      AUTH0_SECRET: 'a'.repeat(32),
      APP_BASE_URL: 'http://localhost:3000',
      AUTH0_DOMAIN: 'test.auth0.com',
      AUTH0_CLIENT_ID: 'test-client-id',
      AUTH0_CLIENT_SECRET: 'test-client-secret',
      GEMINI_API_KEY: 'test-gemini-key',
      SNOWFLAKE_ACCOUNT: 'test-account',
      SNOWFLAKE_USERNAME: 'test-user',
      SNOWFLAKE_PASSWORD: 'test-password',
      SNOWFLAKE_DATABASE: 'test-db',
      SNOWFLAKE_SCHEMA: 'PUBLIC',
      SNOWFLAKE_WAREHOUSE: 'test-warehouse',
    };

    it('should return validated environment variables', () => {
      process.env = { ...process.env, ...validEnv };
      const result = validateServerEnv();

      expect(result.AUTH0_SECRET).toBe(validEnv.AUTH0_SECRET);
      expect(result.GEMINI_API_KEY).toBe(validEnv.GEMINI_API_KEY);
      expect(result.SNOWFLAKE_ACCOUNT).toBe(validEnv.SNOWFLAKE_ACCOUNT);
    });

    it('should throw error with descriptive message when validation fails', () => {
      process.env = { ...validEnv, AUTH0_SECRET: 'short' } as any;

      expect(() => validateServerEnv()).toThrow(
        'Invalid environment variables'
      );
      expect(() => validateServerEnv()).toThrow('AUTH0_SECRET');
    });

    it('should list all invalid variables in error message', () => {
      process.env = {
        ...validEnv,
        AUTH0_SECRET: 'short',
        APP_BASE_URL: 'not-a-url',
      } as any;

      try {
        validateServerEnv();
        fail('Should have thrown an error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('AUTH0_SECRET');
          expect(error.message).toContain('APP_BASE_URL');
          expect(error.message).toContain('.env.local');
        }
      }
    });

    it('should throw error when required variable is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { GEMINI_API_KEY: _GEMINI_API_KEY, ...incompleteEnv } = validEnv;
      process.env = incompleteEnv as any;

      expect(() => validateServerEnv()).toThrow();
    });

    it('should provide helpful error message format', () => {
      process.env = { ...validEnv, GEMINI_API_KEY: '' } as any;

      try {
        validateServerEnv();
        fail('Should have thrown an error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Invalid environment variables');
          expect(error.message).toContain('GEMINI_API_KEY');
          expect(error.message).toContain('-'); // Bullet point format
        }
      }
    });
  });

  describe('validateClientEnv', () => {
    it('should return empty object when no client vars are defined', () => {
      const result = validateClientEnv();
      expect(result).toEqual({});
    });

    it('should not throw error with valid environment', () => {
      expect(() => validateClientEnv()).not.toThrow();
    });

    it('should ignore non-public environment variables', () => {
      process.env = {
        NODE_ENV: 'test',
        SECRET_KEY: 'should-not-be-validated',
        NEXT_PUBLIC_TEST: 'public-var',
      };

      expect(() => validateClientEnv()).not.toThrow();
    });
  });

  describe('Type safety', () => {
    it('should provide type-safe access to server environment variables', () => {
      process.env = {
        NODE_ENV: 'test',
        AUTH0_SECRET: 'a'.repeat(32),
        APP_BASE_URL: 'http://localhost:3000',
        AUTH0_DOMAIN: 'test.auth0.com',
        AUTH0_CLIENT_ID: 'test-client-id',
        AUTH0_CLIENT_SECRET: 'test-client-secret',
        GEMINI_API_KEY: 'test-gemini-key',
        SNOWFLAKE_ACCOUNT: 'test-account',
        SNOWFLAKE_USERNAME: 'test-user',
        SNOWFLAKE_PASSWORD: 'test-password',
        SNOWFLAKE_DATABASE: 'test-db',
        SNOWFLAKE_SCHEMA: 'PUBLIC',
        SNOWFLAKE_WAREHOUSE: 'test-warehouse',
      };

      const env = validateServerEnv();

      // TypeScript should recognize these properties
      expect(typeof env.AUTH0_SECRET).toBe('string');
      expect(typeof env.GEMINI_API_KEY).toBe('string');
      expect(typeof env.SNOWFLAKE_ACCOUNT).toBe('string');
    });
  });
});
