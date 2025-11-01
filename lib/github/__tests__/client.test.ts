/**
 * Tests for GitHub API Client
 *
 * This test suite validates the GitHubClient class methods for
 * parsing GitHub URLs, fetching repository metadata, and handling errors.
 */

import { GitHubClient } from '../client';

// Mock the global fetch function
global.fetch = jest.fn();

describe('GitHubClient', () => {
  let client: GitHubClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new GitHubClient('test-token');
  });

  describe('constructor', () => {
    it('should create client with token', () => {
      const tokenClient = new GitHubClient('my-token');
      expect(tokenClient).toBeInstanceOf(GitHubClient);
    });

    it('should create client without token', () => {
      const noTokenClient = new GitHubClient();
      expect(noTokenClient).toBeInstanceOf(GitHubClient);
    });
  });

  describe('parseRepoUrl', () => {
    it('should parse standard GitHub URL', () => {
      const result = client.parseRepoUrl('https://github.com/facebook/react');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
      });
    });

    it('should parse GitHub URL with .git suffix', () => {
      const result = client.parseRepoUrl('https://github.com/facebook/react.git');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
      });
    });

    it('should parse GitHub URL without https protocol', () => {
      const result = client.parseRepoUrl('github.com/facebook/react');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
      });
    });

    it('should throw error for invalid GitHub URL', () => {
      expect(() => client.parseRepoUrl('https://gitlab.com/user/repo')).toThrow(
        'Invalid GitHub URL'
      );
    });

    it('should throw error for malformed URL', () => {
      expect(() => client.parseRepoUrl('not-a-url')).toThrow('Invalid GitHub URL');
    });

    it('should handle URLs with dashes and underscores', () => {
      const result = client.parseRepoUrl('https://github.com/my-org_name/my-repo_name');
      expect(result).toEqual({
        owner: 'my-org_name',
        repo: 'my-repo_name',
      });
    });
  });

  describe('getRepoMetadata', () => {
    const mockRepoData = {
      name: 'react',
      full_name: 'facebook/react',
      owner: {
        login: 'facebook',
      },
      language: 'JavaScript',
      stargazers_count: 200000,
      default_branch: 'main',
      pushed_at: '2025-01-01T12:00:00Z',
    };

    it('should fetch repository metadata successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRepoData,
      });

      const metadata = await client.getRepoMetadata('facebook', 'react');

      expect(metadata).toMatchObject({
        owner: 'facebook',
        name: 'react',
        language: 'JavaScript',
        stars: 200000,
        defaultBranch: 'main',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/facebook/react',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.github.v3+json',
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should include authorization header when token is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRepoData,
      });

      await client.getRepoMetadata('facebook', 'react');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should not include authorization header when token is not provided', async () => {
      const noTokenClient = new GitHubClient();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRepoData,
      });

      await noTokenClient.getRepoMetadata('facebook', 'react');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers;

      expect(headers).not.toHaveProperty('Authorization');
      expect(headers).toHaveProperty('Accept');
    });

    it('should call progress callback when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRepoData,
      });

      const onProgress = jest.fn();
      await client.getRepoMetadata('facebook', 'react', onProgress);

      expect(onProgress).toHaveBeenCalledWith(
        expect.stringContaining('Fetching repository info')
      );
    });

    it('should throw error when repository not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(client.getRepoMetadata('invalid', 'repo')).rejects.toThrow(
        'Failed to fetch repo metadata: 404 Not Found'
      );
    });

    it('should throw error when API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.getRepoMetadata('facebook', 'react')).rejects.toThrow(
        'Failed to fetch repo metadata'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.getRepoMetadata('facebook', 'react')).rejects.toThrow(
        'Network error'
      );
    });
  });
});
