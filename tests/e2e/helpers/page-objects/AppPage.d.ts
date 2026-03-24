/**
 * AppPage - Base Page Object Model for Application Interactions
 *
 * Provides common methods for navigating and interacting with the application
 */
import { Page, ElectronApplication } from '@playwright/test';
export type ViewType = 'skills' | 'discover' | 'private-repos';
export declare class AppPage {
    protected app: ElectronApplication;
    protected page: Page;
    constructor(app: ElectronApplication, page: Page);
    /**
     * Navigate to a specific view
     */
    navigateTo(view: ViewType): Promise<void>;
    /**
     * Open Settings modal
     */
    openSettings(): Promise<void>;
    /**
     * Close Settings modal
     */
    closeSettings(): Promise<void>;
    /**
     * Wait for toast notification
     */
    waitForToast(message?: string, timeout?: number): Promise<void>;
    /**
     * Check if toast is visible
     */
    isToastVisible(message?: string): Promise<boolean>;
    /**
     * Wait for toast to disappear
     */
    waitForToastToDisappear(timeout?: number): Promise<void>;
    /**
     * Check if loading spinner is visible
     */
    isLoadingVisible(): Promise<boolean>;
    /**
     * Wait for loading to complete
     */
    waitForLoadingComplete(timeout?: number): Promise<void>;
    /**
     * Get current view based on active navigation
     */
    getCurrentView(): Promise<ViewType | null>;
    /**
     * Open DevTools for debugging
     */
    openDevTools(): Promise<void>;
    /**
     * Take screenshot
     */
    takeScreenshot(name: string): Promise<void>;
    /**
     * Get console logs
     */
    getConsoleLogs(): string[];
    /**
     * Mock API response
     */
    mockAPI(url: string, response: unknown): Promise<void>;
    /**
     * Press keyboard shortcut
     */
    pressShortcut(shortcut: string): Promise<void>;
    /**
     * Check if element is visible
     */
    isElementVisible(testId: string): Promise<boolean>;
    /**
     * Get element text content
     */
    getTextContent(testId: string): Promise<string>;
    /**
     * Wait for app to be ready
     */
    waitForAppReady(timeout?: number): Promise<void>;
    /**
     * Restart the application
     */
    restartApp(): Promise<void>;
    /**
     * Check application title
     */
    getTitle(): Promise<string>;
    /**
     * Check if dialog is open
     */
    isDialogOpen(dialogTestId: string): Promise<boolean>;
    /**
     * Close any open dialog by clicking outside
     */
    closeDialogByClickingOutside(): Promise<void>;
}
//# sourceMappingURL=AppPage.d.ts.map