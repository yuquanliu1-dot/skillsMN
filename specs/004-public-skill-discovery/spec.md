# Feature Specification: Public Skill Discovery

**Feature Branch**: `004-public-skill-discovery`
**Created**: 2026-03-07
**Status**: Draft
**Input**: Split from 001-skill-manager for better implementation granularity
**Depends On**: 002-local-skill-management (requires skill list and installation capabilities)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search Public Skills (Priority: P1)

As a skill explorer, I want to search GitHub for publicly available skills so that I can discover community-created skills relevant to my needs.

**Why this priority**: Search is the entry point for discovering public skills. Without search, users cannot find skills to install.

**Independent Test**: Can be tested by entering search terms, verifying results appear from GitHub, and checking pagination works correctly.

**Acceptance Scenarios**:

1. **Given** the user is on the "Public Search" tab, **When** they type "React hooks" and wait 500ms (debounce), **Then** GitHub search results display repositories containing .skill files with names, descriptions, and update times
2. **Given** search results are shown, **When** the user scrolls to the bottom, **Then** the next page of results loads automatically (pagination)
3. **Given** a search is in progress, **When** the user types a new query, **Then** the previous search is cancelled and a new search starts after 500ms debounce
4. **Given** search returns no results, **When** the results display, **Then** a helpful message appears with suggestions to broaden the search

---

### User Story 2 - Preview Skill Content (Priority: P1)

As a skill evaluator, I want to preview skill content before installing so that I can verify it meets my needs without downloading the entire repository.

**Why this priority**: Preview is essential for users to make informed installation decisions. Installing without preview risks wasted time and clutter.

**Independent Test**: Can be tested by clicking a skill in search results, verifying the preview displays full content from GitHub, and checking it's read-only.

**Acceptance Scenarios**:

1. **Given** search results are shown, **When** the user clicks a skill file name, **Then** a preview window displays the full skill content fetched from GitHub raw URL
2. **Given** the preview is loading, **When** content is being fetched, **Then** a loading indicator appears
3. **Given** the preview displays content, **When** the user scrolls, **Then** the content scrolls smoothly without lag
4. **Given** the preview is open, **When** the user clicks outside the preview or presses Escape, **Then** the preview closes
5. **Given** the preview fails to load (network error, 404), **When** the error occurs, **Then** a clear error message displays with retry option

---

### User Story 3 - Install Skill from Search Results (Priority: P1)

As a skill adopter, I want to install skills I find through search so that I can use them in my projects.

**Why this priority**: Installation is the primary action after discovery. Users search specifically to find and install skills.

**Independent Test**: Can be tested by clicking "Install" on a search result, selecting target directory, and verifying the skill appears in the local list.

**Acceptance Scenarios**:

1. **Given** a skill is shown in search results or preview, **When** the user clicks "Install", **Then** a dialog appears to select target directory (project/global)
2. **Given** the install dialog is open, **When** the user selects a directory and confirms, **Then** the skill file downloads from GitHub and saves to the selected directory
3. **Given** installation is in progress, **When** the download occurs, **Then** a progress indicator shows completion percentage
4. **Given** installation completes, **When** the file is saved, **Then** a success notification appears and the skill appears in the local skill list
5. **Given** installation fails (network error, permission denied), **When** the error occurs, **Then** a clear error message displays with retry option and partial downloads are cleaned up

---

### User Story 4 - Handle Installation Conflicts (Priority: P1)

As a user, I want to handle cases where a skill with the same name already exists so that I can control how conflicts are resolved.

**Why this priority**: Conflicts are common when installing skills. Users need control to avoid accidental overwrites or clutter from duplicate names.

**Independent Test**: Can be tested by installing a skill when a同名 file exists, selecting a conflict resolution option, and verifying the expected outcome.

**Acceptance Scenarios**:

1. **Given** the user is installing a skill, **When** a file with the same name exists in the target directory, **Then** a conflict dialog appears with options: "Overwrite", "Rename" (auto-add timestamp), "Skip"
2. **Given** the conflict dialog is shown, **When** the user selects "Overwrite", **Then** the existing file is replaced with the new skill
3. **Given** the conflict dialog is shown, **When** the user selects "Rename", **Then** the new skill is saved with a timestamp suffix (e.g., `react-hooks-20260307.skill`)
4. **Given** the conflict dialog is shown, **When** the user selects "Skip", **Then** the installation is cancelled and no changes are made
5. **Given** the user checks "Apply to all" in the conflict dialog, **When** installing multiple skills, **Then** the selected action applies to all subsequent conflicts

---

### User Story 5 - Browse Curated Skill Sources (Priority: P2)

As a new user, I want to browse curated lists of high-quality skill repositories so that I can discover popular and trusted skills without searching.

**Why this priority**: Curated sources help newcomers discover quality skills but are not essential for users who know what they want to search for.

**Independent Test**: Can be tested by viewing the curated sources list, selecting one, and browsing its skills without using the search function.

**Acceptance Scenarios**:

1. **Given** the user is on the "Public Search" tab, **When** they view the sidebar, **Then** a list of curated skill sources appears (e.g., "Claude Code Plugins", "Awesome Claude Skills")
2. **Given** curated sources are listed, **When** the user clicks a source, **Then** all skills from that repository are displayed
3. **Given** a curated source's skills are shown, **When** the user clicks "Install", **Then** the skill installs using the same flow as search results

---

### Edge Cases

- What happens when GitHub API rate limit is exceeded?
  - System displays: "GitHub API rate limit exceeded. Wait 10 minutes or add a Personal Access Token in Settings for higher limits."
- How does the system handle network failures during search?
  - System displays: "Network error. Please check your connection and try again." with retry button
- What happens when a skill file is very large (>1MB)?
  - System displays file size warning in preview: "Large file (X MB). Download may take longer." before installation
- How does the system handle GitHub repositories with many skill files (>50)?
  - System paginates results within the repository, showing 20 skills per page
- What happens when a skill's download URL becomes invalid (404)?
  - System displays: "Skill file not found. It may have been moved or deleted from the repository."
- How does the system handle very slow GitHub responses (>5 seconds)?
  - System displays loading indicator with "Taking longer than expected..." message and cancel option
- What happens when the user's internet connection is lost during installation?
  - System detects the failure, cleans up partial downloads, and displays: "Connection lost. Please retry when back online."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST search GitHub for repositories containing `.skill` files using GitHub Search API
- **FR-002**: System MUST debounce search input by 500ms to avoid excessive API calls
- **FR-003**: System MUST display search results with repository names, descriptions, skill file counts, and last update times
- **FR-004**: System MUST support pagination for search results (20 items per page)
- **FR-005**: System MUST fetch and display skill file content from GitHub raw URLs for preview without downloading entire repository
- **FR-006**: System MUST allow users to install skills by downloading from GitHub to selected local directory (project/global)
- **FR-007**: System MUST display download progress indicator for installations
- **FR-008**: System MUST handle installation conflicts with three options: overwrite, rename with timestamp, or skip
- **FR-009**: System MUST display curated skill source list in sidebar with names, descriptions, and repository URLs
- **FR-010**: System MUST handle GitHub API errors (rate limits, network failures, 404s) with actionable error messages
- **FR-011**: System MUST clean up partial downloads if installation fails or is cancelled
- **FR-012**: System MUST validate downloaded skill files before saving (check for valid file extension and non-empty content)
- **FR-013**: System MUST support canceling in-progress searches and downloads
- **FR-014**: System MUST allow users to open repository URL in browser from search results
- **FR-015**: System MUST use HTTPS for all GitHub API and download requests

### Key Entities

- **Search Query**: User's search terms for finding skills. Attributes: query text, timestamp.
- **Search Result**: A GitHub repository or file match. Attributes: repository full name, URL, description, skill file list with names and download URLs, last update time, star count.
- **Curated Source**: A pre-selected high-quality skill repository. Attributes: source ID, display name, repository URL, description, tags.
- **Installation Request**: User's intent to install a skill. Attributes: skill file download URL, target directory, conflict resolution preference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: GitHub search returns results within 5 seconds for 95% of queries
- **SC-002**: Skill preview loads within 3 seconds for files under 500KB
- **SC-003**: Skill installation completes within 10 seconds for files under 1MB
- **SC-004**: 90% of error messages are actionable (contain specific problem description and solution)
- **SC-005**: Search debounce prevents >80% of unnecessary API calls (measured by comparing raw keystrokes to API calls)
- **SC-006**: Users successfully install a skill from search to local list on first attempt with 85% success rate
- **SC-007**: All GitHub requests use HTTPS with zero HTTP connections (validated by network monitoring)
- **SC-008**: Partial downloads are cleaned up in 100% of failed/cancelled installations (validated by file system checks)

## Assumptions

- Users have GitHub accounts (optional for public search, required for higher rate limits with PAT)
- GitHub API is available 99%+ of the time (occasional outages handled gracefully)
- GitHub rate limits (60 requests/hour unauthenticated, 5000/hour with PAT) are sufficient for typical usage
- Skill files are typically under 1MB (larger files may have degraded performance)
- Users have stable internet connection for search and download operations
- Curated sources are maintained and contain valid skill files
- GitHub raw URLs are accessible without authentication for public repositories
- Users understand basic Git/GitHub concepts (repositories, files)
- HTTPS is available and not blocked by user's network
- Skill file extensions are `.skill` (other extensions ignored by search)

## Dependencies

- Requires 002-local-skill-management for:
  - Local skill list display (to show newly installed skills)
  - File save operations
  - Default install directory configuration
- Integration points:
  - "Public Search" tab in main navigation
  - Settings page for GitHub PAT configuration
  - Error notification system
