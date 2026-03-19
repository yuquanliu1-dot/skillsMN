# skillsMN E2E Tests

This directory contains comprehensive end-to-end tests for the skillsMN Electron application using Playwright.

## Test Structure

```
tests/e2e/
├── helpers/
│   ├── page-objects/     # Page Object Model classes
│   │   ├── AppPage.ts    # Base application interactions
│   │   ├── SkillsPage.ts # Skills list management
│   │   ├── EditorPage.ts # Monaco editor interactions
│   │   ├── DiscoverPage.ts # Registry search
│   │   ├── PrivateReposPage.ts # Private repository browsing
│   │   └── SettingsPage.ts # Settings management
│   ├── fixtures/         # Test data and fixtures
│   │   ├── skills.ts     # Sample skill data
│   │   ├── config.ts     # Sample configuration data
│   │   └── api-responses.ts # Mock API responses
│   ├── mocks/            # API mocking utilities
│   │   ├── registry-api.ts
│   │   ├── github-api.ts
│   │   └── ai-api.ts
│   ├── index.ts          # Main exports
│   └── test-helpers.ts   # Legacy helper (backward compatible)
├── specs/                # Test specifications
│   ├── 00-setup.spec.ts      # Setup and configuration (P0)
│   ├── 01-navigation.spec.ts # Navigation tests (P0)
│   ├── 02-skills.spec.ts     # Local skills management (P0)
│   ├── 03-editor.spec.ts     # Skill editor (P0)
│   ├── 04-discover.spec.ts   # Registry search (P0)
│   ├── 05-private-repos.spec.ts # Private repositories (P1)
│   ├── 06-ai-creation.spec.ts # AI skill creation (P1)
│   ├── 07-settings.spec.ts   # Settings (P1)
│   └── 08-error-handling.spec.ts # Error handling (P2)
├── app.spec.ts           # Legacy app tests
├── registry.spec.ts      # Legacy registry tests
└── README.md             # This file
```

## Prerequisites

- Node.js 18+ or Node.js 20 LTS
- npm dependencies installed
- Application built (`npm run build`)

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### By Priority
```bash
# P0 - Critical path tests (must pass for release)
npm run test:e2e:p0

# P1 - Important functionality
npm run test:e2e:p1

# P2 - Edge cases and error handling
npm run test:e2e:p2
```

### By Feature
```bash
# Smoke tests (quick validation)
npm run test:e2e:smoke

# Skills and editor tests
npm run test:e2e:skills

# Registry discovery
npm run test:e2e:discover

# Private repositories
npm run test:e2e:private

# AI skill creation
npm run test:e2e:ai

# Settings
npm run test:e2e:settings

# Error handling
npm run test:e2e:errors
```

### Development Mode
```bash
# UI mode (interactive test runner)
npm run test:e2e:ui

# Debug mode (headed with devtools)
npm run test:e2e:debug

# View HTML report
npm run test:e2e:report
```

### Run Specific Tests
```bash
# Run specific test file
npx playwright test tests/e2e/specs/02-skills.spec.ts

# Run specific test by name
npx playwright test -g "should create new skill"
```

## Test Priorities

### P0: Critical Path (~35 tests)
- Application launch and setup
- Navigation between views
- Skill creation, editing, deletion
- Editor functionality
- Registry search and installation

### P1: Important Functionality (~40 tests)
- Private repository management
- AI skill generation
- Settings configuration
- Advanced editor features

### P2: Edge Cases (~25 tests)
- Error handling
- Performance edge cases
- Network failures
- File system errors

## Writing Tests

### Using Page Objects

```typescript
import { test, expect, _electron as electron } from '@playwright/test';
import { SkillsPage, generateUniqueSkillName } from '../helpers';

test.describe('My Feature @P0', () => {
  let skillsPage: SkillsPage;

  test.beforeEach(async () => {
    // Setup electron app and page
    skillsPage = new SkillsPage(electronApp, page);
    await skillsPage.goto();
  });

  test('should create skill', async () => {
    const skillName = generateUniqueSkillName('test');
    await skillsPage.createSkill(skillName);
    expect(await skillsPage.skillExists(skillName)).toBeTruthy();
  });
});
```

### Using API Mocks

```typescript
import { mockRegistrySearch, mockRegistryInstall } from '../helpers';

test.beforeEach(async ({ page }) => {
  await mockRegistrySearch(page, { emptyResults: true });
  await mockRegistryInstall(page);
});

test('should handle empty results', async () => {
  await discoverPage.search('test');
  expect(await discoverPage.hasNoResults()).toBeTruthy();
});
```

## Recommended Test IDs

Add these `data-testid` attributes to components for reliable testing:

### Navigation
- `data-testid="sidebar"` - Main sidebar container
- `data-testid="nav-skills"` - Skills navigation button
- `data-testid="nav-discover"` - Discover navigation button
- `data-testid="nav-private-repos"` - Private Repos navigation button

### Skills View
- `data-testid="skills-list"` - Skills list container
- `data-testid="skill-card"` - Individual skill card
- `data-testid="skill-name"` - Skill name element
- `data-testid="create-skill-button"` - Create new skill button
- `data-testid="ai-create-skill-button"` - AI create button
- `data-testid="delete-button"` - Delete skill button

### Editor
- `data-testid="skill-editor"` - Editor container
- `data-testid="skill-preview"` - Preview container

### Discover View
- `data-testid="search-input"` - Search input field
- `data-testid="loading-indicator"` - Loading spinner
- `data-testid="install-button"` - Install skill button

### Dialogs
- `data-testid="create-skill-dialog"` - Create skill dialog
- `data-testid="skill-name-input"` - Skill name input
- `data-testid="confirm-create-button"` - Confirm create button
- `data-testid="delete-confirm-dialog"` - Delete confirmation dialog
- `data-testid="confirm-delete-button"` - Confirm delete button
- `data-testid="settings-modal"` - Settings modal

## Page Objects API

### AppPage (Base)
```typescript
await appPage.navigateTo('skills' | 'discover' | 'private-repos');
await appPage.openSettings();
await appPage.closeSettings();
await appPage.waitForToast(message);
await appPage.waitForAppReady();
```

### SkillsPage
```typescript
await skillsPage.goto();
await skillsPage.createSkill(name);
await skillsPage.clickSkill(name);
await skillsPage.deleteSkill(name);
await skillsPage.searchSkills(query);
await skillsPage.sortSkills('name' | 'modified');
await skillsPage.filterSkills('all' | 'local' | 'registry' | 'private-repo');
```

### EditorPage
```typescript
await editorPage.waitForEditor();
await editorPage.getContent();
await editorPage.setContent(content);
await editorPage.save();
await editorPage.close();
await editorPage.toggleSymlink();
```

### DiscoverPage
```typescript
await discoverPage.goto();
await discoverPage.search(query);
await discoverPage.waitForResults();
await discoverPage.installSkill(name);
await discoverPage.closePreview();
```

## Best Practices

1. **Use Page Objects**: Encapsulate UI interactions in page object classes
2. **Generate Unique Names**: Use `generateUniqueSkillName()` for test isolation
3. **Wait Strategically**: Use Playwright's auto-waiting instead of arbitrary timeouts
4. **Clean Up**: Delete test skills after tests to avoid pollution
5. **Mock External APIs**: Use mock utilities for consistent test results
6. **Tag by Priority**: Use `@P0`, `@P1`, `@P2` tags for test classification

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
});
```

### Screenshots on Failure
Screenshots are automatically captured on test failure and saved to `tests/screenshots/`

### Trace Viewer
```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

```yaml
# Example GitHub Actions workflow
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

      - name: Run P0 E2E tests
        run: npm run test:e2e:p0

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Coverage Goals

- P0 tests: 100% pass rate required for release
- P1 tests: 95% pass rate acceptable
- P2 tests: 80% pass rate acceptable

## Troubleshooting

### Tests Timeout
- Increase timeout in playwright.config.ts
- Check for missing await statements
- Verify app is launching correctly

### Element Not Found
- Check data-testid attributes in components
- Use `page.waitForSelector()` before interactions
- Verify element is visible with `isVisible()`

### Electron App Issues
- Ensure build is up to date: `npm run build`
- Check console for errors
- Use `test:e2e:debug` for headed mode

## Contributing

When adding new features:
1. Add corresponding Page Object methods
2. Create test fixtures for new data types
3. Add API mocks if needed
4. Write tests with appropriate priority tags
5. Update this README if adding new test categories

## License

MIT
