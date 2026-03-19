/**
 * Registry API Mock Utilities
 *
 * Provides utilities for mocking the skills registry API
 */

import { Page } from '@playwright/test';
import { mockSearchResultsResponse } from '../fixtures/api-responses';

export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
}

export interface MockRegistryOptions {
  searchDelay?: number;
  failSearch?: boolean;
  failInstall?: boolean;
  emptyResults?: boolean;
}

/**
 * Mock the registry search API
 */
export async function mockRegistrySearch(
  page: Page,
  options: MockRegistryOptions = {}
): Promise<void> {
  const { searchDelay = 0, failSearch = false, emptyResults = false } = options;

  await page.route('**/api/registry/search**', async (route) => {
    if (searchDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, searchDelay));
    }

    if (failSearch) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'SEARCH_ERROR', message: 'Search failed' },
        }),
      });
      return;
    }

    const response = emptyResults
      ? { results: [], total: 0, page: 1 }
      : mockSearchResultsResponse;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Mock the registry skill content API
 */
export async function mockRegistrySkillContent(
  page: Page,
  skillId: string,
  content: string
): Promise<void> {
  await page.route(`**/api/registry/skills/${skillId}**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          content,
          metadata: {
            name: skillId,
            description: 'Mock skill content',
            version: '1.0.0',
          },
        },
      }),
    });
  });
}

/**
 * Mock the registry install API
 */
export async function mockRegistryInstall(
  page: Page,
  options: { fail?: boolean; delay?: number } = {}
): Promise<void> {
  const { fail = false, delay = 0 } = options;

  await page.route('**/api/registry/install**', async (route) => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (fail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'INSTALL_ERROR', message: 'Installation failed' },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          message: 'Installation completed',
          path: '/skills/installed-skill/skill.md',
        },
      }),
    });
  });
}

/**
 * Mock network timeout
 */
export async function mockRegistryTimeout(page: Page): Promise<void> {
  await page.route('**/api/registry/**', async (route) => {
    await route.abort('timedout');
  });
}

/**
 * Mock rate limit response
 */
export async function mockRegistryRateLimit(page: Page): Promise<void> {
  await page.route('**/api/registry/**', async (route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many requests' },
      }),
    });
  });
}

/**
 * Clear all registry mocks
 */
export async function clearRegistryMocks(page: Page): Promise<void> {
  await page.unroute('**/api/registry/**');
}
