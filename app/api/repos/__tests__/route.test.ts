/**
 * Tests for GET /api/repos API Route
 *
 * This test suite validates the repository listing endpoint,
 * including query parameter validation, data transformation, and error handling.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { ZodError } from 'zod';
import * as snowflake from '@/lib/database/snowflake';
import * as utils from '@/lib/utils';

// Mock the database module
jest.mock('@/lib/database/snowflake');

// Mock the utils module
jest.mock('@/lib/utils', () => ({
  formatTimestamp: jest.fn((date) => {
    if (!date) return '';
    return new Date(date).toISOString();
  }),
  createApiError: jest.fn((message) => ({ error: message })),
  logError: jest.fn(),
}));

jest.mock('@/lib/validations/api', () => {
  const { ZodError: ActualZodError } = jest.requireActual('zod');
  return {
    reposQuerySchema: {
      parse: jest.fn((params) => {
        const limit = params.limit ? parseInt(params.limit, 10) : undefined;
        if (params.limit && isNaN(limit)) {
          throw new ActualZodError([
            {
              code: 'invalid_type',
              expected: 'number',
              received: 'nan',
              path: ['limit'],
              message: 'Expected number, received nan',
            },
          ]);
        }
        if (limit && limit < 0) {
          throw new ActualZodError([
            {
              code: 'too_small',
              minimum: 0,
              type: 'number',
              inclusive: true,
              path: ['limit'],
              message: 'Number must be greater than or equal to 0',
            },
          ]);
        }
        return {
          limit,
          offset: params.offset ? parseInt(params.offset, 10) : undefined,
          owner: params.owner,
          language: params.language,
        };
      }),
    },
    createValidationError: jest.fn((error) => ({ error: 'Validation failed' })),
    sanitizeString: jest.fn((str) => {
      // Simple sanitization mock - removes < and > characters
      return String(str || '').replace(/[<>]/g, '');
    }),
  };
});

describe('GET /api/repos', () => {
  const mockRepos = [
    {
      ID: '1',
      REPO_NAME: 'test-repo',
      REPO_OWNER: 'test-owner',
      LANGUAGE: 'TypeScript',
      SAFETY_SCORE: 'SAFE',
      SCANNED_AT: new Date('2025-01-01T12:00:00Z'),
      SCANNED_BY: 'user@example.com',
    },
    {
      ID: '2',
      REPO_NAME: 'another-repo',
      REPO_OWNER: 'another-owner',
      LANGUAGE: 'JavaScript',
      SAFETY_SCORE: 'CAUTION',
      SCANNED_AT: new Date('2025-01-01T10:00:00Z'),
      SCANNED_BY: 'admin@example.com',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a list of repositories', async () => {
    (snowflake.getScannedRepos as jest.Mock).mockResolvedValue(mockRepos);

    const request = new NextRequest('http://localhost:3000/api/repos');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      id: '1',
      name: 'test-repo',
      owner: 'test-owner',
      language: 'TypeScript',
      safetyScore: 'SAFE',
    });
  });

  it('should use default limit when no limit is provided', async () => {
    (snowflake.getScannedRepos as jest.Mock).mockResolvedValue(mockRepos);

    const request = new NextRequest('http://localhost:3000/api/repos');
    await GET(request);

    // Default limit is 100 (MAX_REPOS_FETCH_LIMIT)
    expect(snowflake.getScannedRepos).toHaveBeenCalledWith(100);
  });

  it('should respect custom limit parameter', async () => {
    (snowflake.getScannedRepos as jest.Mock).mockResolvedValue(mockRepos);

    const request = new NextRequest('http://localhost:3000/api/repos?limit=10');
    await GET(request);

    expect(snowflake.getScannedRepos).toHaveBeenCalledWith(10);
  });

  it('should not exceed maximum limit', async () => {
    (snowflake.getScannedRepos as jest.Mock).mockResolvedValue(mockRepos);

    const request = new NextRequest('http://localhost:3000/api/repos?limit=999');
    await GET(request);

    // Should be capped at MAX_REPOS_FETCH_LIMIT (100)
    expect(snowflake.getScannedRepos).toHaveBeenCalledWith(100);
  });

  it('should return 400 for invalid limit parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/repos?limit=invalid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Validation failed');
  });

  it('should return 400 for negative limit', async () => {
    const request = new NextRequest('http://localhost:3000/api/repos?limit=-5');
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('should handle empty repository list', async () => {
    (snowflake.getScannedRepos as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/repos');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should handle database errors', async () => {
    (snowflake.getScannedRepos as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new NextRequest('http://localhost:3000/api/repos');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Failed to fetch repositories');
    expect(utils.logError).toHaveBeenCalled();
  });

  it('should sanitize string values in response', async () => {
    const repoWithSpecialChars = [
      {
        ...mockRepos[0],
        REPO_NAME: '<script>alert("xss")</script>',
        REPO_OWNER: 'test<script>',
      },
    ];

    (snowflake.getScannedRepos as jest.Mock).mockResolvedValue(repoWithSpecialChars);

    const request = new NextRequest('http://localhost:3000/api/repos');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0].name).not.toContain('<script>');
    expect(data[0].owner).not.toContain('<script>');
  });

  it('should handle missing optional fields gracefully', async () => {
    const repoWithMissingFields = [
      {
        ID: '1',
        REPO_NAME: 'test-repo',
        REPO_OWNER: 'test-owner',
        LANGUAGE: null,
        SAFETY_SCORE: 'SAFE',
        SCANNED_AT: new Date(),
        SCANNED_BY: null,
      },
    ];

    (snowflake.getScannedRepos as jest.Mock).mockResolvedValue(repoWithMissingFields);

    const request = new NextRequest('http://localhost:3000/api/repos');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0].language).toBe('Unknown');
    expect(data[0].scannedBy).toBe('');
  });

  it('should format timestamp correctly', async () => {
    (snowflake.getScannedRepos as jest.Mock).mockResolvedValue(mockRepos);

    const request = new NextRequest('http://localhost:3000/api/repos');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0]).toHaveProperty('lastScanned');
    expect(typeof data[0].lastScanned).toBe('string');
  });
});
