/**
 * GitHub API Mock Utilities
 *
 * Provides utilities for mocking GitHub API calls
 */

import { Page } from '@playwright/test';

export interface MockGitHubOptions {
  failAuth?: boolean;
  rateLimited?: boolean;
  noRepos?: boolean;
  largeRepo?: boolean;
}

/**
 * Mock GitHub API authentication check
 */
export async function mockGitHubAuth(
  page: Page,
  options: MockGitHubOptions = {}
): Promise<void> {
  const { failAuth = false, rateLimited = false } = options;

  await page.route('**/api.github.com/user', async (route) => {
    if (rateLimited) {
      await route.fulfill({
        status: 403,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'API rate limit exceeded',
        }),
      });
      return;
    }

    if (failAuth) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Bad credentials',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        login: 'test-user',
        id: 1,
        name: 'Test User',
      }),
    });
  });
}

/**
 * Mock GitHub repository contents API
 */
export async function mockGitHubRepoContents(
  page: Page,
  owner: string,
  repo: string,
  contents: Array<{ name: string; type: string; path: string }>
): Promise<void> {
  await page.route(
    `**/api.github.com/repos/${owner}/${repo}/contents/**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(contents),
      });
    }
  );
}

/**
 * Mock GitHub file content API
 */
export async function mockGitHubFileContent(
  page: Page,
  owner: string,
  repo: string,
  path: string,
  content: string
): Promise<void> {
  await page.route(
    `**/api.github.com/repos/${owner}/${repo}/contents/${path}`,
    async (route) => {
      const base64Content = Buffer.from(content).toString('base64');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: path.split('/').pop(),
          path,
          content: base64Content,
          encoding: 'base64',
          sha: 'abc123',
        }),
      });
    }
  );
}

/**
 * Mock GitHub create file API (for uploads)
 */
export async function mockGitHubCreateFile(
  page: Page,
  owner: string,
  repo: string
): Promise<void> {
  await page.route(
    `**/api.github.com/repos/${owner}/${repo}/contents/**`,
    async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            content: {
              name: 'skill.md',
              path: 'skills/skill.md',
              sha: 'new-sha-123',
            },
            commit: {
              sha: 'commit-sha-123',
              message: 'Create skill',
            },
          }),
        });
      }
    }
  );
}

/**
 * Mock GitHub update file API (for commits)
 */
export async function mockGitHubUpdateFile(
  page: Page,
  owner: string,
  repo: string
): Promise<void> {
  await page.route(
    `**/api.github.com/repos/${owner}/${repo}/contents/**`,
    async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        // Return existing file
        const base64Content = Buffer.from('existing content').toString('base64');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            name: 'skill.md',
            path: 'skills/skill.md',
            content: base64Content,
            sha: 'existing-sha',
          }),
        });
      } else if (method === 'PUT') {
        // Update file
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: {
              name: 'skill.md',
              path: 'skills/skill.md',
              sha: 'updated-sha',
            },
            commit: {
              sha: 'update-commit-sha',
              message: 'Update skill',
            },
          }),
        });
      }
    }
  );
}

/**
 * Mock GitHub rate limit error
 */
export async function mockGitHubRateLimit(page: Page): Promise<void> {
  await page.route('**/api.github.com/**', async (route) => {
    await route.fulfill({
      status: 403,
      headers: {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
      },
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'API rate limit exceeded',
        documentation_url: 'https://docs.github.com/rest/rate-limit',
      }),
    });
  });
}

/**
 * Mock GitHub server error
 */
export async function mockGitHubServerError(page: Page): Promise<void> {
  await page.route('**/api.github.com/**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Internal Server Error',
      }),
    });
  });
}

/**
 * Clear all GitHub mocks
 */
export async function clearGitHubMocks(page: Page): Promise<void> {
  await page.unroute('**/api.github.com/**');
}
