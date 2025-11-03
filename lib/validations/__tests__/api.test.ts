/**
 * Tests for API Request and Response Validation
 *
 * This test suite validates Zod schemas and sanitization functions
 * used to protect against XSS, injection attacks, and invalid data.
 */

import { ZodError } from 'zod';
import {
  githubUrlSchema,
  scanRequestSchema,
  findingSeveritySchema,
  safetyLevelSchema,
  findingSchema,
  findingsSchema,
  repoMetadataSchema,
  scanResultSchema,
  scanResponseSchema,
  reposQuerySchema,
  errorResponseSchema,
  sanitizeString,
  sanitizeObject,
  validateAndSanitize,
  createValidationError,
} from '../api';

describe('API Validation Schemas', () => {
  describe('githubUrlSchema', () => {
    it('should accept valid GitHub HTTPS URLs', () => {
      expect(() =>
        githubUrlSchema.parse('https://github.com/facebook/react')
      ).not.toThrow();
      expect(() =>
        githubUrlSchema.parse('https://www.github.com/microsoft/vscode')
      ).not.toThrow();
    });

    it('should accept valid GitHub HTTP URLs', () => {
      expect(() =>
        githubUrlSchema.parse('http://github.com/nodejs/node')
      ).not.toThrow();
    });

    it('should accept URLs with trailing slash', () => {
      expect(() =>
        githubUrlSchema.parse('https://github.com/torvalds/linux/')
      ).not.toThrow();
    });

    it('should accept repo names with dots and dashes', () => {
      expect(() =>
        githubUrlSchema.parse('https://github.com/org-name/repo.name')
      ).not.toThrow();
    });

    it('should reject non-GitHub URLs', () => {
      expect(() =>
        githubUrlSchema.parse('https://gitlab.com/user/repo')
      ).toThrow(ZodError);
    });

    it('should reject invalid URL formats', () => {
      expect(() => githubUrlSchema.parse('not-a-url')).toThrow(ZodError);
      expect(() => githubUrlSchema.parse('github.com/user/repo')).toThrow(
        ZodError
      );
    });

    it('should reject GitHub URLs with extra path segments', () => {
      expect(() =>
        githubUrlSchema.parse('https://github.com/user/repo/issues')
      ).toThrow(ZodError);
    });

    it('should reject empty strings', () => {
      expect(() => githubUrlSchema.parse('')).toThrow(ZodError);
    });
  });

  describe('scanRequestSchema', () => {
    it('should accept valid scan request', () => {
      const validRequest = {
        repoUrl: 'https://github.com/facebook/react',
      };
      expect(() => scanRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject request with invalid URL', () => {
      const invalidRequest = {
        repoUrl: 'https://gitlab.com/user/repo',
      };
      expect(() => scanRequestSchema.parse(invalidRequest)).toThrow(ZodError);
    });

    it('should reject request without repoUrl', () => {
      expect(() => scanRequestSchema.parse({})).toThrow(ZodError);
    });
  });

  describe('findingSeveritySchema', () => {
    it('should accept valid severity levels', () => {
      expect(() => findingSeveritySchema.parse('low')).not.toThrow();
      expect(() => findingSeveritySchema.parse('moderate')).not.toThrow();
      expect(() => findingSeveritySchema.parse('severe')).not.toThrow();
    });

    it('should reject invalid severity levels', () => {
      expect(() => findingSeveritySchema.parse('critical')).toThrow(ZodError);
      expect(() => findingSeveritySchema.parse('high')).toThrow(ZodError);
      expect(() => findingSeveritySchema.parse('')).toThrow(ZodError);
    });
  });

  describe('safetyLevelSchema', () => {
    it('should accept valid safety levels', () => {
      expect(() => safetyLevelSchema.parse('safe')).not.toThrow();
      expect(() => safetyLevelSchema.parse('caution')).not.toThrow();
      expect(() => safetyLevelSchema.parse('unsafe')).not.toThrow();
    });

    it('should reject invalid safety levels', () => {
      expect(() => safetyLevelSchema.parse('danger')).toThrow(ZodError);
      expect(() => safetyLevelSchema.parse('ok')).toThrow(ZodError);
    });
  });

  describe('findingSchema', () => {
    const validFinding = {
      item: 'package.json',
      location: 'line 10',
      issue: 'Suspicious dependency',
      severity: 'moderate' as const,
    };

    it('should accept valid finding', () => {
      expect(() => findingSchema.parse(validFinding)).not.toThrow();
    });

    it('should accept finding with optional fields', () => {
      const findingWithOptionals = {
        ...validFinding,
        codeSnippet: 'const x = require("evil")',
        batchId: 1,
        dependencyUrl: 'https://npmjs.com/package/evil',
      };
      expect(() => findingSchema.parse(findingWithOptionals)).not.toThrow();
    });

    it('should reject finding without required fields', () => {
      expect(() => findingSchema.parse({ item: 'file.js' })).toThrow(ZodError);
      expect(() => findingSchema.parse({ location: 'line 5' })).toThrow(
        ZodError
      );
    });

    it('should reject finding with empty strings', () => {
      expect(() => findingSchema.parse({ ...validFinding, item: '' })).toThrow(
        ZodError
      );
    });

    it('should reject finding with invalid dependencyUrl', () => {
      expect(() =>
        findingSchema.parse({ ...validFinding, dependencyUrl: 'not-a-url' })
      ).toThrow(ZodError);
    });
  });

  describe('repoMetadataSchema', () => {
    it('should accept valid repository metadata', () => {
      const validMetadata = {
        owner: 'facebook',
        name: 'react',
        defaultBranch: 'main',
        language: 'JavaScript',
        description: 'A JavaScript library',
        stars: 200000,
      };
      expect(() => repoMetadataSchema.parse(validMetadata)).not.toThrow();
    });

    it('should accept metadata without optional fields', () => {
      const minimalMetadata = {
        owner: 'facebook',
        name: 'react',
        defaultBranch: 'main',
      };
      expect(() => repoMetadataSchema.parse(minimalMetadata)).not.toThrow();
    });

    it('should reject metadata with empty owner', () => {
      expect(() =>
        repoMetadataSchema.parse({
          owner: '',
          name: 'react',
          defaultBranch: 'main',
        })
      ).toThrow(ZodError);
    });

    it('should reject metadata with negative stars', () => {
      expect(() =>
        repoMetadataSchema.parse({
          owner: 'facebook',
          name: 'react',
          defaultBranch: 'main',
          stars: -5,
        })
      ).toThrow(ZodError);
    });

    it('should reject metadata with non-integer stars', () => {
      expect(() =>
        repoMetadataSchema.parse({
          owner: 'facebook',
          name: 'react',
          defaultBranch: 'main',
          stars: 123.45,
        })
      ).toThrow(ZodError);
    });
  });

  describe('reposQuerySchema', () => {
    it('should parse valid query parameters', () => {
      const result = reposQuerySchema.parse({
        limit: '10',
        offset: '20',
        owner: 'facebook',
        language: 'JavaScript',
      });
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
      expect(result.owner).toBe('facebook');
    });

    it('should handle missing optional parameters', () => {
      const result = reposQuerySchema.parse({});
      expect(result.limit).toBeUndefined();
      expect(result.offset).toBeUndefined();
    });

    it('should transform string numbers to integers', () => {
      const result = reposQuerySchema.parse({ limit: '50' });
      expect(result.limit).toBe(50);
      expect(typeof result.limit).toBe('number');
    });

    it('should reject limit exceeding maximum', () => {
      expect(() => reposQuerySchema.parse({ limit: '101' })).toThrow(ZodError);
      expect(() => reposQuerySchema.parse({ limit: '1000' })).toThrow(ZodError);
    });

    it('should reject negative limit', () => {
      expect(() => reposQuerySchema.parse({ limit: '-5' })).toThrow(ZodError);
    });

    it('should reject zero limit', () => {
      expect(() => reposQuerySchema.parse({ limit: '0' })).toThrow(ZodError);
    });

    it('should reject negative offset', () => {
      expect(() => reposQuerySchema.parse({ offset: '-1' })).toThrow(ZodError);
    });

    it('should accept zero offset', () => {
      const result = reposQuerySchema.parse({ offset: '0' });
      expect(result.offset).toBe(0);
    });

    it('should reject invalid number strings', () => {
      expect(() => reposQuerySchema.parse({ limit: 'abc' })).toThrow(ZodError);
      expect(() => reposQuerySchema.parse({ offset: 'xyz' })).toThrow(ZodError);
    });
  });

  describe('errorResponseSchema', () => {
    it('should accept valid error response', () => {
      const errorResponse = {
        success: false as const,
        message: 'Validation failed',
        error: 'Invalid input',
        details: [{ field: 'repoUrl', message: 'Invalid URL format' }],
      };
      expect(() => errorResponseSchema.parse(errorResponse)).not.toThrow();
    });

    it('should accept error response without optional fields', () => {
      const minimalError = {
        success: false as const,
        message: 'Error occurred',
      };
      expect(() => errorResponseSchema.parse(minimalError)).not.toThrow();
    });

    it('should reject error response with success: true', () => {
      expect(() =>
        errorResponseSchema.parse({
          success: true,
          message: 'Error',
        })
      ).toThrow(ZodError);
    });

    it('should reject error response with empty message', () => {
      expect(() =>
        errorResponseSchema.parse({
          success: false,
          message: '',
        })
      ).toThrow(ZodError);
    });
  });
});

describe('Sanitization Functions', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('\n\ttest\n\t')).toBe('test');
    });

    it('should remove < and > characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe(
        'scriptalert("xss")/script'
      );
      expect(sanitizeString('<div>content</div>')).toBe('divcontent/div');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)');
      expect(sanitizeString('JAVASCRIPT:alert(1)')).toBe('alert(1)');
      expect(sanitizeString('JaVaScRiPt:alert(1)')).toBe('alert(1)');
    });

    it('should remove event handlers', () => {
      expect(sanitizeString('onclick=alert(1)')).toBe('alert(1)');
      expect(sanitizeString('onload=evil()')).toBe('evil()');
      expect(sanitizeString('ONCLICK=test()')).toBe('test()');
      expect(sanitizeString('onMouseOver=hack()')).toBe('hack()');
    });

    it('should limit string length to 2000 characters', () => {
      const longString = 'a'.repeat(3000);
      const result = sanitizeString(longString);
      expect(result.length).toBe(2000);
    });

    it('should handle combined XSS attempts', () => {
      const malicious = '<img src=x onerror=javascript:alert(1)>';
      const result = sanitizeString(malicious);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('onerror=');
    });

    it('should handle normal strings without modification', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World');
      expect(sanitizeString('user@example.com')).toBe('user@example.com');
      expect(sanitizeString('https://github.com/user/repo')).toBe(
        'https://github.com/user/repo'
      );
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string values in object', () => {
      const input = {
        name: '<script>alert(1)</script>',
        email: 'user@example.com',
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('scriptalert(1)/script');
      expect(result.email).toBe('user@example.com');
    });

    it('should recursively sanitize nested objects', () => {
      const input = {
        user: {
          name: '<script>xss</script>',
          profile: {
            bio: 'javascript:alert(1)',
          },
        },
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('scriptxss/script');
      expect(result.user.profile.bio).toBe('alert(1)');
    });

    it('should preserve non-string values', () => {
      const input = {
        name: 'John',
        age: 30,
        active: true,
        score: null,
        tags: ['tag1', 'tag2'],
      };
      const result = sanitizeObject(input);
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
      expect(result.score).toBe(null);
    });

    it('should not mutate original object', () => {
      const input = {
        name: '<script>test</script>',
      };
      const result = sanitizeObject(input);
      expect(input.name).toBe('<script>test</script>');
      expect(result.name).toBe('scripttest/script');
    });

    it('should handle empty object', () => {
      const result = sanitizeObject({});
      expect(result).toEqual({});
    });
  });

  describe('validateAndSanitize', () => {
    const testSchema = scanRequestSchema;

    it('should validate and sanitize valid data', () => {
      const input = {
        repoUrl: 'https://github.com/facebook/react',
      };
      const result = validateAndSanitize(testSchema, input);
      expect(result.repoUrl).toBe('https://github.com/facebook/react');
    });

    it('should throw ZodError for invalid data', () => {
      const input = {
        repoUrl: 'invalid-url',
      };
      expect(() => validateAndSanitize(testSchema, input)).toThrow(ZodError);
    });

    it('should sanitize strings in validated data', () => {
      const schema = repoMetadataSchema;
      const input = {
        owner: '<script>evil</script>',
        name: 'repo',
        defaultBranch: 'main',
      };
      const result = validateAndSanitize(schema, input);
      expect(result.owner).toBe('scriptevil/script');
    });
  });

  describe('createValidationError', () => {
    it('should format ZodError into ErrorResponse', () => {
      try {
        githubUrlSchema.parse('invalid-url');
      } catch (error) {
        if (error instanceof ZodError) {
          const result = createValidationError(error);
          expect(result.success).toBe(false);
          expect(result.message).toBe('Validation failed');
          expect(result.details).toBeDefined();
          expect(Array.isArray(result.details)).toBe(true);
          expect(result.details!.length).toBeGreaterThan(0);
        }
      }
    });

    it('should include field paths in error details', () => {
      try {
        findingSchema.parse({ item: '' });
      } catch (error) {
        if (error instanceof ZodError) {
          const result = createValidationError(error);
          const fields = result.details!.map((d) => d.field);
          expect(fields).toContain('item');
        }
      }
    });

    it('should include error messages in details', () => {
      try {
        repoMetadataSchema.parse({
          owner: 'test',
          name: 'test',
          defaultBranch: '',
        });
      } catch (error) {
        if (error instanceof ZodError) {
          const result = createValidationError(error);
          expect(result.details![0].message).toBeDefined();
          expect(result.details![0].message.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle nested field paths', () => {
      const nestedSchema = scanResultSchema;
      try {
        nestedSchema.parse({
          repoUrl: 'https://github.com/user/repo',
          findings: {
            maliciousCode: [],
            dependencies: [],
            networkActivity: [],
            fileSystemSafety: [],
            credentialSafety: [],
          },
          safetyLevel: 'safe',
          aiSummary: '',
          scannedAt: new Date().toISOString(),
          validated: true,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          const result = createValidationError(error);
          expect(result.details!.some((d) => d.field.includes('.'))).toBe(
            false
          ); // aiSummary is top-level
        }
      }
    });
  });
});
