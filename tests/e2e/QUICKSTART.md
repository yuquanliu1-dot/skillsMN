# Playwright Test Quick Start Guide

## 🚀 Quick Start

### 1. First-time Setup
```bash
# Install dependencies (if not done already)
npm install

# Build the application
npm run build

# Install Playwright browsers
npx playwright install chromium
```

### 2. Run Your First Test
```bash
# Run all tests
npm run test:e2e

# Or run with UI mode for better debugging
npm run test:e2e:ui
```

## 📋 What Tests Are Available?

### Application Tests (`tests/e2e/app.spec.ts`)
- ✅ Application launches successfully
- ✅ UI components load correctly
- ✅ Navigation between views works
- ✅ Skill management (create, preview, edit, delete)

### Registry Tests (`tests/e2e/registry.spec.ts`)
- ✅ Search functionality
- ✅ Skill preview
- ✅ Skill installation
- ✅ Error handling

## 🐛 Debugging Failed Tests

### View Test Report
```bash
npm run test:e2e:report
```

### Run in Debug Mode
```bash
npm run test:e2e:debug
```

### Run Specific Test
```bash
npx playwright test -g "should search for skills"
```

## 📸 Screenshots & Videos

Failed tests automatically capture:
- Screenshots: `tests/screenshots/`
- Videos: `test-results/`
- Traces: `trace.zip`

## ⚙️ Configuration

Test configuration is in `playwright.config.ts`

### Key Settings
- **Timeout**: 60 seconds per test
- **Retries**: 2 in CI, 0 locally
- **Workers**: 1 (Electron requires single worker)
- **Report**: HTML report in `playwright-report/`

## 🔧 Common Issues

### Tests Fail on Startup
- Ensure app is built: `npm run build`
- Check Node version: Node 18+ or 20 LTS required

### Element Not Found
- Add `data-testid` to the component
- Use `await page.waitForSelector()`

### Timeout Errors
- Increase timeout in test:
```typescript
test('slow test', async () => {
  // ...
}, { timeout: 120000 }) // 2 minutes
```

## 📝 Writing New Tests

### Template
```typescript
import { test, expect } from '@playwright/test';

test('my new test', async ({ page }) => {
  // Navigate
  await page.click('[data-testid="nav-discover"]');

  // Interact
  await page.fill('[data-testid="search-input"]', 'test');

  // Verify
  await expect(page.locator('[data-testid="skill-card"]')).toBeVisible();
});
```

### Using Helper
```typescript
import { SkillManagerHelper } from './helpers/test-helpers';

test('using helper', async ({ page }) => {
  const helper = new SkillManagerHelper(app, page);
  await helper.navigateToDiscover();
  await helper.searchSkill('claude');
});
```

## 📚 Learn More

- [Full README](./README.md)
- [Playwright Docs](https://playwright.dev/)
- [Test Helpers](./helpers/test-helpers.ts)
