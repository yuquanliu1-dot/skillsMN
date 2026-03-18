# End-to-End Testing with Playwright

This directory contains automated end-to-End (E2E) tests for the Skills Manager Electron application using Playwright.

## Prerequisites

- Node.js 18+ or Node.js 20 LTS
- npm dependencies installed
- Application built (`npm run build`)

## Installation

Playwright is already installed as a dev dependency:

```bash
npm install
```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests with UI mode (Interactive)
```bash
npm run test:e2e:ui
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test tests/e2e/app.spec.ts
```

### Run specific test
```bash
npx playwright test -g "should search for skills"
```

## Test Structure

```
tests/e2e/
├── helpers/
│   └── test-helpers.ts      # Test utilities and helpers
├── app.spec.ts               # Application launch and basic tests
├── registry.spec.ts          # Registry search and installation tests
└── README.md                 # This file
```

## Test Coverage

### Application Tests (`app.spec.ts`)
- ✅ Application launch and window visibility
- ✅ UI component loading
- ✅ Navigation between views
- ✅ Skill management (create, preview, edit, delete)

### Registry Tests (`registry.spec.ts`)
- ✅ Skill search functionality
- ✅ Search results display
- ✅ Skill installation from registry
- ✅ Installation progress and error handling
- ✅ Skill preview functionality

## Adding `data-testid` Attributes

To make tests more reliable, add `data-testid` attributes to your components:

### Example in React Component

```tsx
// Before
<button onClick={handleInstall}>Install</button>

// After
<button
  data-testid="install-button"
  onClick={handleInstall}
>
  Install
</button>
```

### Recommended Test IDs

Add these `data-testid` attributes to your components:

#### Navigation
- `data-testid="sidebar"` - Main sidebar container
- `data-testid="nav-skills"` - Skills navigation button
- `data-testid="nav-discover"` - Discover navigation button
- `data-testid="nav-private-repos"` - Private Repos navigation button

#### Skills View
- `data-testid="skills-list"` - Skills list container
- `data-testid="skill-card"` - Individual skill card
- `data-testid="skill-name"` - Skill name element
- `data-testid="create-skill-button"` - Create new skill button
- `data-testid="delete-button"` - Delete skill button

#### Discover View
- `data-testid="search-input"` - Search input field
- `data-testid="loading-indicator"` - Loading spinner
- `data-testid="install-button"` - Install skill button
- `data-testid="install-dialog"` - Installation confirmation dialog
- `data-testid="confirm-install-button"` - Confirm installation button

#### Preview Panel
- `data-testid="skill-preview"` - Skill preview container
- `data-testid="skill-preview-content"` - Preview content area
- `data-testid="close-preview-button"` - Close preview button
- `data-testid="skill-editor"` - Monaco editor container

#### Dialogs
- `data-testid="create-skill-dialog"` - Create skill dialog
- `data-testid="skill-name-input"` - Skill name input
- `data-testid="confirm-create-button"` - Confirm create button
- `data-testid="delete-confirm-dialog"` - Delete confirmation dialog
- `data-testid="confirm-delete-button"` - Confirm delete button

## Test Helpers

### SkillManagerHelper

Main helper class for common operations:

```typescript
const helper = new SkillManagerHelper(app, page);

// Navigation
await helper.navigateToSkills();
await helper.navigateToDiscover();
await helper.navigateToPrivateRepos();

// Search
await helper.searchSkill('claude');

// Installation
await helper.installSkill('claude-api');
const isInstalled = await helper.isSkillInstalled('claude-api');

// Preview
await helper.previewSkill('claude-api');
await helper.closePreview();

// Utilities
await helper.waitForToast('Installation completed');
const count = await helper.getInstalledSkillCount();
```

## Mocking External APIs

For tests that shouldn't hit real APIs:

```typescript
test('should handle API errors', async ({ page }) => {
  // Mock GitHub API
  await page.route('**/api.github.com/**', route => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Server Error' })
    });
  });

  // Test error handling
  await helper.searchSkill('test');
  // Verify error message is shown
});
```

## Debugging Tests

### Visual Debugging
```bash
# Run with UI mode to see test execution
npm run test:e2e:ui
```

### Console Logging
```typescript
test('debug test', async ({ page }) => {
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });

  // Your test code
});
```

### Screenshots on Failure
Screenshots are automatically captured on test failure and saved to:
```
tests/screenshots/
```

### Trace Viewer
```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### 1. Use Stable Selectors
```typescript
// ✅ Good - data-testid
await page.click('[data-testid="install-button"]');

// ❌ Bad - fragile text selector
await page.click('button:has-text("Install")');
```

### 2. Wait for Elements
```typescript
// ✅ Good - explicit wait
await page.waitForSelector('[data-testid="skill-card"]', {
  timeout: 10000,
  state: 'visible'
});

// ❌ Bad - no wait
await page.click('[data-testid="skill-card"]');
```

### 3. Handle Async Operations
```typescript
// ✅ Good - wait for operation to complete
await page.click('[data-testid="install-button"]');
await page.waitForSelector('text=Installation completed', {
  timeout: 30000
});

// ❌ Bad - assume immediate completion
await page.click('[data-testid="install-button"]');
```

### 4. Use Page Object Model
```typescript
// tests/pages/DiscoverPage.ts
export class DiscoverPage {
  constructor(private page: Page) {}

  async search(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
  }

  async installSkill(name: string) {
    // Implementation
  }
}

// Use in tests
const discoverPage = new DiscoverPage(page);
await discoverPage.search('claude');
```

## Troubleshooting

### Tests Timeout
If tests timeout, increase timeout in config:
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000, // 60 seconds
});
```

### Element Not Found
```typescript
// Add explicit waits
await page.waitForSelector('[data-testid="skill-card"]', {
  timeout: 10000
});
```

### Electron App Not Starting
```typescript
// Check app launch logs
console.log(await electronApp.evaluate(() => process.argv));
```

## Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

Report is generated at `playwright-report/index.html`

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Electron Testing Guide](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [Playwright Electron](https://playwright.dev/docs/api/class-electronapplication)

## Contributing

When adding new features, please:
1. Add corresponding E2E tests
2. Add `data-testid` attributes to new components
3. Update this README if needed

## License

MIT
