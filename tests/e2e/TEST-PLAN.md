# E2E Test Plan for New Features

## Overview

This document outlines the comprehensive E2E test plan for the newly added features using Playwright.

## Test Environment

- **Framework**: Playwright with Electron
- **Test Files**: `tests/e2e/specs/12-new-features.spec.ts`
- **Page Objects**: Updated `EditorPage.ts` and `SkillsPage.ts`

## Features Under Test

### 1. "Test in Claude" Button (Terminal Integration)

**Location**: Skill Editor Header

**Functionality**:
- Opens a new terminal window
- Sets working directory to current skill directory
- Automatically runs `claude` command

**Test Cases**:

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| TC1.1 | Button visible in editor header | P0 | ✅ |
| TC1.2 | Button has purple styling | P0 | ✅ |
| TC1.3 | Click doesn't crash the app | P0 | ✅ |
| TC1.4 | Terminal icon displayed | P1 | ✅ |
| TC1.5 | Error handling for terminal failure | P1 | ✅ |

**Platform-Specific Behavior**:
- Windows: Uses `start cmd /K`
- macOS: Uses `open -a Terminal`
- Linux: Uses `gnome-terminal` or `xterm`

### 2. Edit Button on SkillCard

**Location**: Each Skill Card in the skills list

**Functionality**:
- Opens full-screen editor directly from skill card
- Bypasses preview drawer
- Loads skill content immediately

**Test Cases**:

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| TC2.1 | Edit button visible on hover | P0 | ✅ |
| TC2.2 | Clicking opens full-screen editor | P0 | ✅ |
| TC2.3 | Correct skill loaded in editor | P0 | ✅ |
| TC2.4 | Button has pencil icon | P1 | ✅ |
| TC2.5 | Button accessible via keyboard | P1 | Pending |

### 3. Full-Screen Editor Layout

**Location**: SkillEditorFull component

**Functionality**:
- Two-column layout: Monaco Editor + AI Assistant
- Fixed header with action buttons
- Keyboard shortcuts support

**Test Cases**:

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| TC3.1 | Two-column layout displayed | P0 | ✅ |
| TC3.2 | Monaco editor visible | P0 | ✅ |
| TC3.3 | Back button visible | P0 | ✅ |
| TC3.4 | Action buttons in header | P0 | ✅ |
| TC3.5 | Close with back button | P0 | ✅ |
| TC3.6 | AI sidebar visible | P1 | ✅ |
| TC3.7 | Ctrl+W closes editor | P0 | ✅ |

### 4. Create New Skill Flow

**Location**: Create Skill Button + Full-Screen Editor

**Functionality**:
- Create button in header
- Opens full-screen editor after skill creation
- Shows "New Skill" badge

**Test Cases**:

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| TC4.1 | Create button visible | P0 | ✅ |
| TC4.2 | Full-screen editor opens after create | P0 | ✅ |
| TC4.3 | "New Skill" badge shown | P1 | ✅ |
| TC4.4 | Ctrl+N opens create dialog | P0 | ✅ |

## Test Execution

### Running Tests

```bash
# Run all tests
npx playwright test

# Run only new features tests
npx playwright test tests/e2e/specs/12-new-features.spec.ts

# Run with headed mode (visible browser)
npx playwright test --headed

# Run specific test
npx playwright test -g "Edit Button on SkillCard"
```

### Test Report

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Code Changes Summary

### Modified Files

1. **src/shared/constants.ts**
   - Added `TERMINAL_OPEN_CLAUDE` IPC channel

2. **src/main/ipc/configHandlers.ts**
   - Added handler for opening terminal with Claude

3. **src/main/preload.ts**
   - Exposed `openClaudeInTerminal` API

4. **src/renderer/types/electron.d.ts**
   - Added type definition for `openClaudeInTerminal`

5. **src/renderer/components/SkillEditorFull.tsx**
   - Added "Test in Claude" button

6. **src/renderer/components/SkillEditor.tsx**
   - Added "Test in Claude" button

7. **src/renderer/components/SkillCard.tsx**
   - Added `onEdit` prop and edit button

8. **src/renderer/components/SkillList.tsx**
   - Added `onEditSkill` prop

9. **src/renderer/App.tsx**
   - Added `onEditSkill` handler

10. **Translation files**
    - Added English and Chinese translations

### Test Files

1. **tests/e2e/specs/12-new-features.spec.ts** (new)
   - Comprehensive tests for all new features

2. **tests/e2e/helpers/page-objects/EditorPage.ts** (updated)
   - Added methods for full-screen editor testing
   - Added `isTestInClaudeButtonVisible()`
   - Added `clickTestInClaude()`
   - Added `isFullScreenEditor()`
   - Added `getSkillName()`
   - Added `isAISidebarVisible()`
   - Added `closeWithBackButton()`

3. **tests/e2e/helpers/page-objects/SkillsPage.ts** (updated)
   - Added `clickEditButton()`
   - Added `isEditButtonVisible()`
   - Added `getActionButtons()`

## Continuous Integration

These tests should be run:
- Before every merge to main branch
- On every pull request
- Nightly for regression testing

## Known Limitations

1. **Terminal Testing**: E2E tests cannot verify actual terminal window opening (platform limitation)
2. **AI Sidebar**: Full AI interaction testing requires mocking
3. **External Applications**: Cannot test interaction with external Claude CLI

## Future Improvements

1. Add visual regression testing for UI components
2. Add accessibility testing (a11y)
3. Add performance benchmarks
4. Add API mocking for AI features
