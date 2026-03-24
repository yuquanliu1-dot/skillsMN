"use strict";
/**
 * AppPage - Base Page Object Model for Application Interactions
 *
 * Provides common methods for navigating and interacting with the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppPage = void 0;
class AppPage {
    constructor(app, page) {
        this.app = app;
        this.page = page;
    }
    /**
     * Navigate to a specific view
     */
    async navigateTo(view) {
        await this.page.click(`[data-testid="nav-${view}"]`);
        await this.page.waitForLoadState('domcontentloaded');
        // Wait for view-specific content
        switch (view) {
            case 'skills':
                // Use :is() pseudo-selector or wait for either element
                try {
                    await this.page.waitForSelector('[data-testid="skills-list"]', { timeout: 5000 });
                }
                catch {
                    // Try waiting for no skills message
                    await this.page.waitForSelector('text=No skills', { timeout: 5000 });
                }
                break;
            case 'discover':
                await this.page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 });
                break;
            case 'private-repos':
                await this.page.waitForSelector('[data-testid="private-repos-list"]', { timeout: 10000 });
                break;
        }
    }
    /**
     * Open Settings modal
     */
    async openSettings() {
        // Click settings button using data-testid
        await this.page.click('[data-testid="settings-button"]');
        await this.page.waitForSelector('[data-testid="settings-modal"]', { timeout: 5000 });
    }
    /**
     * Close Settings modal
     */
    async closeSettings() {
        await this.page.click('[data-testid="close-settings-button"]');
        await this.page.waitForSelector('[data-testid="settings-modal"]', { state: 'hidden', timeout: 5000 });
    }
    /**
     * Wait for toast notification
     */
    async waitForToast(message, timeout = 5000) {
        const selector = message
            ? `[data-testid="toast"]:has-text("${message}")`
            : '[data-testid="toast"]';
        await this.page.waitForSelector(selector, { timeout });
    }
    /**
     * Check if toast is visible
     */
    async isToastVisible(message) {
        const selector = message
            ? `[data-testid="toast"]:has-text("${message}")`
            : '[data-testid="toast"]';
        return await this.page.isVisible(selector);
    }
    /**
     * Wait for toast to disappear
     */
    async waitForToastToDisappear(timeout = 10000) {
        await this.page.waitForSelector('[data-testid="toast"]', { state: 'hidden', timeout });
    }
    /**
     * Check if loading spinner is visible
     */
    async isLoadingVisible() {
        return await this.page.isVisible('[data-testid="loading-indicator"]');
    }
    /**
     * Wait for loading to complete
     */
    async waitForLoadingComplete(timeout = 30000) {
        await this.page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout });
    }
    /**
     * Get current view based on active navigation
     */
    async getCurrentView() {
        const views = ['skills', 'discover', 'private-repos'];
        for (const view of views) {
            const navButton = await this.page.$(`[data-testid="nav-${view}"].bg-blue-50`);
            if (navButton) {
                return view;
            }
        }
        return null;
    }
    /**
     * Open DevTools for debugging
     */
    async openDevTools() {
        await this.app.evaluate(({ BrowserWindow }) => {
            BrowserWindow.getFocusedWindow()?.webContents.openDevTools();
        });
    }
    /**
     * Take screenshot
     */
    async takeScreenshot(name) {
        await this.page.screenshot({
            path: `tests/screenshots/${name}.png`,
            fullPage: true
        });
    }
    /**
     * Get console logs
     */
    getConsoleLogs() {
        const logs = [];
        this.page.on('console', msg => {
            logs.push(`[${msg.type()}] ${msg.text()}`);
        });
        return logs;
    }
    /**
     * Mock API response
     */
    async mockAPI(url, response) {
        await this.page.route(url, route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(response)
            });
        });
    }
    /**
     * Press keyboard shortcut
     */
    async pressShortcut(shortcut) {
        await this.page.keyboard.press(shortcut);
    }
    /**
     * Check if element is visible
     */
    async isElementVisible(testId) {
        return await this.page.isVisible(`[data-testid="${testId}"]`);
    }
    /**
     * Get element text content
     */
    async getTextContent(testId) {
        const element = await this.page.$(`[data-testid="${testId}"]`);
        if (!element)
            return '';
        return await element.textContent() || '';
    }
    /**
     * Wait for app to be ready
     */
    async waitForAppReady(timeout = 15000) {
        // Wait for sidebar to load
        await this.page.waitForSelector('[data-testid="sidebar"]', { timeout });
        // Wait for main content area
        await this.page.waitForSelector('[data-testid="main-content"]', { timeout });
    }
    /**
     * Restart the application
     */
    async restartApp() {
        await this.app.close();
        // Relaunch would need to be done by the test runner
        // This is a placeholder for now
    }
    /**
     * Check application title
     */
    async getTitle() {
        return await this.page.title();
    }
    /**
     * Check if dialog is open
     */
    async isDialogOpen(dialogTestId) {
        return await this.page.isVisible(`[data-testid="${dialogTestId}"]`);
    }
    /**
     * Close any open dialog by clicking outside
     */
    async closeDialogByClickingOutside() {
        // Click on the backdrop/overlay
        await this.page.click('.fixed.inset-0.bg-slate-900\\/50, .fixed.inset-0.bg-black\\/60');
        await this.page.waitForTimeout(200);
    }
}
exports.AppPage = AppPage;
//# sourceMappingURL=AppPage.js.map