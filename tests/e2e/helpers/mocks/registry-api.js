"use strict";
/**
 * Registry API Mock Utilities
 *
 * Provides utilities for mocking the skills registry API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockRegistrySearch = mockRegistrySearch;
exports.mockRegistrySkillContent = mockRegistrySkillContent;
exports.mockRegistryInstall = mockRegistryInstall;
exports.mockRegistryTimeout = mockRegistryTimeout;
exports.mockRegistryRateLimit = mockRegistryRateLimit;
exports.clearRegistryMocks = clearRegistryMocks;
const api_responses_1 = require("../fixtures/api-responses");
/**
 * Mock the registry search API
 */
async function mockRegistrySearch(page, options = {}) {
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
            : api_responses_1.mockSearchResultsResponse;
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
async function mockRegistrySkillContent(page, skillId, content) {
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
async function mockRegistryInstall(page, options = {}) {
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
async function mockRegistryTimeout(page) {
    await page.route('**/api/registry/**', async (route) => {
        await route.abort('timedout');
    });
}
/**
 * Mock rate limit response
 */
async function mockRegistryRateLimit(page) {
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
async function clearRegistryMocks(page) {
    await page.unroute('**/api/registry/**');
}
//# sourceMappingURL=registry-api.js.map