/**
 * RegistryService Unit Tests
 *
 * Tests for skills.sh API search functionality, response validation, and error handling
 */

import { RegistryService } from '../../../src/main/services/RegistryService';
import { REGISTRY_API_BASE_URL, REGISTRY_SEARCH_ENDPOINT, REGISTRY_SEARCH_LIMIT } from '../../../shared/constants';

// Mock fetch
global.fetch = jest.fn();

describe('RegistryService', () => {
  let registryService: RegistryService;

  beforeEach(() => {
    jest.clearAllMocks();
    registryService = new RegistryService();
  });

  describe('searchSkills()', () => {
    it('should search skills with valid query', async () => {
      const query = 'data analysis';
      const mockResponse = {
        skills: [
          {
            id: 'abc123',
            skillId: 'data-analysis-helper',
            name: 'Data Analysis Helper',
            installs: 1247,
            source: 'username/data-analysis-skills'
          }
        ],
        total: 1,
        query: 'data analysis'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const results = await registryService.searchSkills(query);

      expect(results).toHaveLength(1);
      expect(results[0].skillId).toBe('data-analysis-helper');
      expect(results[0].name).toBe('Data Analysis Helper');
      expect(results[0].installs).toBe(1247);
      expect(results[0].source).toBe('username/data-analysis-skills');
    });

    it('should encode query parameters correctly', async () => {
      const query = 'data analysis & visualization';
      const mockResponse = { skills: [], total: 0, query };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await registryService.searchSkills(query);

      const expectedUrl = `${REGISTRY_API_BASE_URL}${REGISTRY_SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&limit=${REGISTRY_SEARCH_LIMIT}`;
      expect(global.fetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/json'
          })
        })
      );
    });

    it('should use custom limit when provided', async () => {
      const query = 'testing';
      const customLimit = 50;
      const mockResponse = { skills: [], total: 0, query };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await registryService.searchSkills(query, customLimit);

      const expectedUrl = expect.stringContaining(`limit=${customLimit}`);
      expect(global.fetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.any(Object)
      );
    });

    it('should trim whitespace from query', async () => {
      const query = '  data analysis  ';
      const mockResponse = { skills: [], total: 0, query: 'data analysis' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await registryService.searchSkills(query);

      const expectedUrl = expect.stringContaining(`q=${encodeURIComponent('data analysis')}`);
      expect(global.fetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });

    it('should set correct request headers', async () => {
      const mockResponse = { skills: [], total: 0, query: 'test' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await registryService.searchSkills('test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'skillsMN-Desktop/1.0'
          }
        })
      );
    });

    it('should handle empty results', async () => {
      const query = 'nonexistent skill';
      const mockResponse = { skills: [], total: 0, query };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const results = await registryService.searchSkills(query);

      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle network errors', async () => {
      const query = 'test';
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(registryService.searchSkills(query)).rejects.toThrow('Network error');
    });

    it('should handle HTTP 400 errors', async () => {
      const query = 'test';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid query parameter',
          message: 'Query must be at least 1 character'
        })
      });

      await expect(registryService.searchSkills(query)).rejects.toThrow();
    });

    it('should handle HTTP 429 rate limit errors', async () => {
      const query = 'test';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => name === 'Retry-After' ? '60' : null
        },
        json: async () => ({
          error: 'Rate limit exceeded',
          message: 'Try again in 60 seconds'
        })
      });

      await expect(registryService.searchSkills(query)).rejects.toThrow('Rate limit');
    });

    it('should handle HTTP 500 server errors', async () => {
      const query = 'test';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error',
          message: 'An unexpected error occurred'
        })
      });

      await expect(registryService.searchSkills(query)).rejects.toThrow();
    });

    it('should handle timeout with AbortController', async () => {
      const query = 'test';

      // Mock abort signal
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        expect(options.signal).toBeInstanceOf(AbortSignal);
        return Promise.reject(new Error('The operation was aborted'));
      });

      await expect(registryService.searchSkills(query)).rejects.toThrow();
    }, 15000);

    it('should validate response data structure', async () => {
      const query = 'test';
      const invalidResponse = {
        skills: [
          {
            id: 'abc123',
            // Missing skillId
            name: 'Test Skill',
            installs: 100,
            source: 'owner/repo'
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse
      });

      // Should filter out invalid results
      const results = await registryService.searchSkills(query);
      expect(results).toHaveLength(0);
    });

    it('should validate installs is a non-negative number', async () => {
      const query = 'test';
      const mockResponse = {
        skills: [
          {
            id: 'abc123',
            skillId: 'test-skill',
            name: 'Test Skill',
            installs: -1, // Invalid negative number
            source: 'owner/repo'
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const results = await registryService.searchSkills(query);
      expect(results).toHaveLength(0);
    });

    it('should validate source format (owner/repo)', async () => {
      const query = 'test';
      const mockResponse = {
        skills: [
          {
            id: 'abc123',
            skillId: 'test-skill',
            name: 'Test Skill',
            installs: 100,
            source: 'invalid-source-format' // Missing slash
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const results = await registryService.searchSkills(query);
      expect(results).toHaveLength(0);
    });

    it('should handle multiple valid results', async () => {
      const query = 'code review';
      const mockResponse = {
        skills: [
          {
            id: 'abc123',
            skillId: 'code-review-1',
            name: 'Code Review Helper',
            installs: 500,
            source: 'owner1/code-review-skills'
          },
          {
            id: 'def456',
            skillId: 'code-review-2',
            name: 'Advanced Code Review',
            installs: 750,
            source: 'owner2/review-tools'
          }
        ],
        total: 2,
        query
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const results = await registryService.searchSkills(query);

      expect(results).toHaveLength(2);
      expect(results[0].skillId).toBe('code-review-1');
      expect(results[1].skillId).toBe('code-review-2');
    });
  });

  describe('extractSearchResults()', () => {
    it('should extract skills array from response', () => {
      const response = {
        skills: [
          {
            id: 'abc123',
            skillId: 'test-skill',
            name: 'Test Skill',
            installs: 100,
            source: 'owner/repo'
          }
        ],
        total: 1,
        query: 'test'
      };

      const results = (registryService as any).extractSearchResults(response);

      expect(results).toHaveLength(1);
      expect(results[0].skillId).toBe('test-skill');
    });

    it('should return empty array if skills field missing', () => {
      const response = {
        total: 0,
        query: 'test'
      };

      const results = (registryService as any).extractSearchResults(response);

      expect(results).toEqual([]);
    });

    it('should return empty array if skills is not an array', () => {
      const response = {
        skills: 'not an array',
        total: 0,
        query: 'test'
      };

      const results = (registryService as any).extractSearchResults(response);

      expect(results).toEqual([]);
    });
  });
});
