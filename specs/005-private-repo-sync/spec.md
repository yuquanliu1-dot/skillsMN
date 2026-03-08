# Feature Specification: Private Repository Sync

**Feature Branch**: `005-private-repo-sync`
**Created**: 2026-03-07
**Status**: Draft
**Input**: Split from 001-skill-manager for better implementation granularity
**Depends On**: 002-local-skill-management (requires skill list and installation), 004-public-skill-discovery (shares installation logic)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Private Repository (Priority: P1)

As a team developer, I want to add my team's private GitHub repository with a Personal Access Token so that I can access team-internal skills.

**Why this priority**: Configuration is the entry point for private repository features. Users cannot access private repos without setup.

**Independent Test**: Can be tested by adding a private repository URL and PAT, testing the connection, and verifying it appears in the configured repos list.

**Acceptance Scenarios**:

1. **Given** the user is in Settings > Private Repositories, **When** they enter repository URL (e.g., `https://github.com/org/team-skills`) and valid PAT, **Then** the system validates access by fetching repository metadata
2. **Given** valid credentials are entered, **When** the user clicks "Test Connection", **Then** the system confirms access with success message and repository name
3. **Given** the connection test succeeds, **When** the user clicks "Save", **Then** the repository configuration is saved with encrypted PAT
4. **Given** invalid credentials are entered, **When** the user clicks "Test Connection", **Then** a clear error message displays (e.g., "Access denied. Check your PAT permissions.")
5. **Given** multiple private repositories are configured, **When** the user views the list, **Then** all configured repositories appear with names, URLs, and last sync times

---

### User Story 2 - Browse Private Repository Skills (Priority: P1)

As a team member, I want to browse all skills in my configured private repository so that I can discover and access team-internal skills.

**Why this priority**: Browsing is essential for discovering available team skills. Users cannot install what they cannot see.

**Independent Test**: Can be tested by selecting a configured private repo, verifying all .skill files are listed with metadata, and checking the list updates on refresh.

**Acceptance Scenarios**:

1. **Given** a private repository is configured, **When** the user selects it from the "Private Repos" tab, **Then** all .skill files in the repository are listed with names, paths, and last commit times within 5 seconds
2. **Given** the skill list is loading, **When** the repository is being scanned, **Then** a loading indicator appears
3. **Given** the skill list is displayed, **When** the user filters by file name or path, **Then** the list updates to show only matching skills
4. **Given** the skill list is displayed, **When** the user clicks "Refresh", **Then** the repository is re-scanned and the list updates with latest data
5. **Given** the repository scan fails (network error, permissions changed), **When** the error occurs, **Then** a clear error message displays with retry option

---

### User Story 3 - Install Skill from Private Repository (Priority: P1)

As a team member, I want to install skills from my private repository to my local directories so that I can use team-standardized skills in my projects.

**Why this priority**: Installation is the primary action after browsing. Users browse specifically to find and install team skills.

**Independent Test**: Can be tested by selecting a skill from private repo, installing it to a local directory, and verifying it appears in the local skill list with source metadata.

**Acceptance Scenarios**:

1. **Given** a private repository skill is shown in the list, **When** the user clicks "Install", **Then** a dialog appears to select target directory (project/global)
2. **Given** the install dialog is open, **When** the user selects a directory and confirms, **Then** the skill file downloads from the private repository and saves to the selected directory
3. **Given** installation completes, **When** the file is saved, **Then** the skill appears in the local skill list with source marked as the private repository name
4. **Given** a skill with the same name exists, **When** the user installs, **Then** conflict resolution follows the same flow as public skill installation (overwrite/rename/skip)
5. **Given** installation fails, **When** the error occurs, **Then** a clear error message displays with retry option and partial downloads are cleaned up

---

### User Story 4 - Detect and Install Updates (Priority: P1)

As a team member, I want to know when skills from my private repository have been updated and install the latest version so that I stay synchronized with team improvements.

**Why this priority**: Updates are critical for team collaboration. Private repos evolve, and users need to stay current with team standards.

**Independent Test**: Can be tested by installing a skill, updating it in the remote repository, refreshing the private repo list, and verifying the update indicator appears and update works.

**Acceptance Scenarios**:

1. **Given** a skill is installed from a private repository, **When** the user views the local skill list, **Then** skills with remote updates show an "Update Available" badge
2. **Given** a skill shows "Update Available", **When** the user clicks "Update", **Then** a confirmation dialog appears showing what will change (optional: show diff summary)
3. **Given** the user confirms the update, **When** the update proceeds, **Then** the latest version downloads and replaces the local file
4. **Given** the user wants a backup before updating, **When** they enable "Backup before update" option, **Then** the old file is saved with timestamp suffix before replacement
5. **Given** the update completes, **When** the file is replaced, **Then** the "Update Available" badge disappears and a success notification shows
6. **Given** the update fails, **When** the error occurs, **Then** the local file remains unchanged and a clear error message displays with retry option

---

### User Story 5 - Manage Multiple Private Repositories (Priority: P2)

As a consultant working with multiple teams, I want to configure and switch between multiple private repositories so that I can access skills from different organizations.

**Why this priority**: Multi-repo support is valuable for users working across organizations but is not essential for single-team users.

**Independent Test**: Can be tested by configuring two private repositories, switching between them, and verifying the correct skill lists appear for each.

**Acceptance Scenarios**:

1. **Given** the user is in Settings, **When** they add multiple private repositories with different PATs, **Then** all repositories are saved and listed
2. **Given** multiple private repositories are configured, **When** the user is on the "Private Repos" tab, **Then** a dropdown allows selecting which repository to browse
3. **Given** a repository is selected, **When** the user switches to another repository, **Then** the skill list updates to show skills from the newly selected repository
4. **Given** multiple repositories are configured, **When** the user removes one, **Then** its configuration and PAT are deleted but locally installed skills from that repository remain
5. **Given** a repository's PAT expires, **When** the user tries to access it, **Then** a clear error message prompts to update the PAT in Settings

---

### User Story 6 - View Repository and Skill Metadata (Priority: P3)

As a user, I want to see metadata about private repositories and individual skills so that I can make informed decisions about which skills to install or update.

**Why this priority**: Metadata is helpful for decision-making but not essential for basic install/update workflows.

**Independent Test**: Can be tested by viewing repository details (description, last sync time) and skill details (file size, commit message, author) in the interface.

**Acceptance Scenarios**:

1. **Given** a private repository is configured, **When** the user hovers over its name in the list, **Then** a tooltip shows repository description, last sync time, and skill count
2. **Given** a skill is shown in the private repository list, **When** the user clicks "Details", **Then** a panel shows file size, last commit message, author, and date
3. **Given** a skill is installed locally, **When** the user views it in the local list, **Then** the source repository name and install date are visible

---

### Edge Cases

- What happens when a private repository is deleted or made public after configuration?
  - System detects access change on next sync, displays: "Repository access changed. Please verify repository status and update configuration."
- How does the system handle PAT expiration?
  - System detects authentication failure, displays: "Personal Access Token expired. Please update in Settings."
- What happens when a skill file is deleted from the private repository after local installation?
  - System shows "File no longer exists in repository" on update check, local skill remains unchanged
- How does the system handle merge conflicts if the user modified the local skill?
  - System warns: "Local file has been modified. Updating will overwrite changes. Continue?" with backup option
- What happens when a user's PAT lacks read permissions for a configured repository?
  - System displays: "Permission denied. Your PAT lacks read access to this repository."
- How does the system handle large private repositories (>500 skills)?
  - System paginates the skill list, showing 50 skills per page with search/filter capability
- What happens when GitHub is down during a sync operation?
  - System displays: "GitHub service unavailable. Please try again later." with retry button

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow configuration of private GitHub repositories with URLs and Personal Access Tokens (PATs)
- **FR-002**: System MUST encrypt and store PATs using secure storage (Electron safeStorage or OS credential manager)
- **FR-003**: System MUST provide connection test functionality to validate repository access with PAT
- **FR-004**: System MUST scan and list all .skill files in configured private repositories with names, paths, and commit metadata
- **FR-005**: System MUST allow users to install skills from private repositories to local directories (project/global)
- **FR-006**: System MUST mark locally installed skills with their source private repository for update tracking
- **FR-007**: System MUST detect updates for skills installed from private repositories by comparing local and remote file commit hashes
- **FR-008**: System MUST display "Update Available" indicators for skills with remote updates
- **FR-009**: System MUST allow one-click update of skills from private repositories with optional backup
- **FR-010**: System MUST support configuration and switching between multiple private repositories
- **FR-011**: System MUST allow removal of private repository configurations while preserving locally installed skills
- **FR-012**: System MUST handle authentication errors (expired PAT, insufficient permissions) with actionable error messages
- **FR-013**: System MUST support manual refresh to re-scan private repositories for changes
- **FR-014**: System MUST cache private repository skill lists for 5 minutes to reduce API calls
- **FR-015**: System MUST display repository metadata (description, last sync time, skill count) and skill metadata (file size, commit info)

### Key Entities

- **Private Repository**: A GitHub repository configured for team skill sharing. Attributes: repository ID, URL, display name, associated PAT (encrypted), last sync timestamp, skill count.
- **Private Repository Skill**: A skill file within a private repository. Attributes: file path in repository, name, description, file size, commit SHA, last commit message, author, commit date.
- **Installed Skill Metadata**: Additional metadata for locally installed skills. Attributes: source repository ID, installation date, installed commit SHA (for update detection).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Private repository configuration and connection test completes within 5 seconds
- **SC-002**: Repository skill list loads within 5 seconds for repositories with up to 100 skills
- **SC-003**: Skill installation from private repository completes within 10 seconds for files under 1MB
- **SC-004**: Update detection identifies 100% of available updates (verified by comparing local and remote commit SHAs)
- **SC-005**: Update installation completes within 10 seconds with zero data loss for unchanged local files
- **SC-006**: All PATs are encrypted in storage with zero plaintext exposures (validated by security audit)
- **SC-007**: 90% of error messages are actionable (contain specific problem description and solution)
- **SC-008**: Users successfully configure, browse, and install from private repositories on first attempt with 80% success rate

## Assumptions

- Users have GitHub accounts with access to private repositories
- Users can create Personal Access Tokens with `repo` scope (read access)
- Private repositories contain valid .skill files following Agent Skills specification
- GitHub API is available 99%+ of the time (occasional outages handled gracefully)
- Users have necessary permissions to access configured private repositories
- Skill files in private repositories are typically under 1MB
- Users have stable internet connection for repository sync operations
- Teams using private repositories maintain their skill files (no garbage collection needed)
- Users understand PAT security implications (not shared, regularly rotated)
- GitHub API rate limits (5000 requests/hour with PAT) are sufficient for team usage patterns
- Repository structure is relatively stable (frequent large reorganizations may confuse users)

## Dependencies

- Requires 002-local-skill-management for:
  - Local skill list display (to show installed skills with source metadata)
  - File save operations
  - Conflict resolution logic
- Requires 004-public-skill-discovery for:
  - Shared installation logic and UI components
  - Error handling patterns
- Integration points:
  - "Private Repos" tab in main navigation
  - Settings page for repository and PAT configuration
  - Local skill list update indicators
  - Error notification system
