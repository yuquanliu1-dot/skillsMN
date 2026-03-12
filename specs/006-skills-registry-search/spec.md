# Feature Specification: Skills Registry Search Integration

**Feature Branch**: `006-skills-registry-search`
**Created**: 2026-03-12
**Status**: Draft
**Input**: User description: "Refactor public skill search to use skills.sh registry service instead of direct GitHub search. The system will use skills.sh API for skill discovery and GitHub for skill distribution via git clone."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search for Skills (Priority: P1)

As a user, I want to search for publicly available skills using keywords so that I can discover relevant skills from a centralized registry without needing to know specific GitHub repositories.

**Why this priority**: This is the core functionality that enables skill discovery. Without search, users cannot find skills to install. This provides immediate value by centralizing skill discovery.

**Independent Test**: Can be fully tested by entering search queries in the UI and verifying that results are returned from skills.sh API with correct metadata (name, installs, source). Delivers value by enabling skill discovery even before installation is implemented.

**Acceptance Scenarios**:

1. **Given** the user is on the skill search page, **When** they enter a search query and wait 400ms (debounce), **Then** the system displays up to 20 matching skills with names, installation counts, and repository sources
2. **Given** the user has entered a search query, **When** no skills match the query, **Then** the system displays a "No results found" message
3. **Given** the user is viewing search results, **When** they click on a skill name, **Then** the system opens the skill details page at https://skills.sh/{source}/{skillId} in a new browser tab
4. **Given** the user is typing a search query, **When** they type rapidly, **Then** the search is debounced by 400ms to avoid excessive API calls (testing note: verify search executes after user stops typing for 400ms, not during typing)

---

### User Story 2 - Install a Discovered Skill (Priority: P1)

As a user, I want to install a skill I found through search so that I can use it in my local tools (Claude Desktop, Claude Code, or other supported tools).

**Why this priority**: This completes the core user journey from discovery to usage. Without installation, search alone doesn't provide full value. This must work for the feature to be useful.

**Independent Test**: Can be fully tested by searching for a skill, clicking Install, selecting a target tool, and verifying that the skill is cloned from GitHub and appears in the tool's skill directory with correct metadata. Delivers complete value by enabling the full discover-install-use workflow.

**Acceptance Scenarios**:

1. **Given** the user is viewing search results, **When** they click the "Install" button on a skill, **Then** a dialog appears prompting them to select which tool to install the skill to
2. **Given** the user has selected a target tool, **When** they confirm the installation, **Then** the system clones the GitHub repository (shallow clone with depth=1) and copies the skill to the selected tool's skills directory
3. **Given** the installation is in progress, **When** the clone or copy fails, **Then** the system displays an appropriate error message and cleans up any temporary files
4. **Given** the skill has been successfully installed, **When** the user opens the target tool, **Then** the skill appears in their installed skills list with correct metadata
5. **Given** a repository contains multiple skills, **When** the user installs a specific skill, **Then** only that skill's directory is copied, not the entire repository

---

### User Story 3 - View Skill Details Before Installation (Priority: P2)

As a user, I want to view detailed information about a skill before installing it so that I can make an informed decision about whether it meets my needs.

**Why this priority**: Enhances the user experience by providing more context, but the core value (discover and install) works without it. Users can still install based on name and install count.

**Independent Test**: Can be fully tested by clicking on a skill name to view its details page on skills.sh. Delivers value by helping users evaluate skills before committing to installation.

**Acceptance Scenarios**:

1. **Given** the user is viewing search results, **When** they click on a skill name, **Then** the system opens https://skills.sh/{source}/{skillId} in a new browser tab showing full skill documentation
2. **Given** the user is viewing skill details on skills.sh, **When** they want to install, **Then** they can return to the application and click the Install button

---

### User Story 4 - Handle Installation Errors Gracefully (Priority: P2)

As a user, I want to receive clear error messages when installation fails so that I can understand what went wrong and potentially fix the issue.

**Why this priority**: Important for user experience and troubleshooting, but the system can function without perfect error handling. Basic installation success is more critical.

**Independent Test**: Can be fully tested by attempting to install skills with various failure scenarios (invalid repo, missing SKILL.md, network errors) and verifying that appropriate error messages are displayed.

**Acceptance Scenarios**:

1. **Given** the user attempts to install a skill, **When** the GitHub repository doesn't exist or is private, **Then** the system displays an error message indicating the repository is inaccessible
2. **Given** the user attempts to install a skill, **When** the repository doesn't contain a valid SKILL.md file, **Then** the system displays an error message indicating the skill is invalid
3. **Given** the user attempts to install a skill, **When** git is not available on the system, **Then** the system displays an error message indicating git is required
4. **Given** an installation fails, **When** temporary files were created, **Then** the system cleans up all temporary files before displaying the error

---

### Edge Cases

- What happens when the skills.sh API is down or returns an error?
- How does the system handle a search query with special characters or very long strings?
- What happens when the user tries to install a skill that's already installed?
- How does the system handle a repository that contains multiple skills with similar names?
- What happens when the user's target tool skills directory is read-only or out of disk space?
- How does the system handle network interruptions during git clone?
- What happens when the skill directory structure doesn't match expected format (SKILL.md in wrong location)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST call the skills.sh API at https://skills.sh/api/search?q={query}&limit=20 when a user submits a search query
- **FR-002**: System MUST debounce search input by 400ms to avoid excessive API calls
- **FR-003**: System MUST display search results showing skill name, installation count, and source repository
- **FR-004**: System MUST allow users to click on a skill name to view details at https://skills.sh/{source}/{skillId}
- **FR-005**: System MUST provide an "Install" button for each search result
- **FR-006**: System MUST prompt the user to select a target tool when installing a skill
- **FR-007**: System MUST clone the GitHub repository specified in the skill's source field using shallow clone (depth=1)
- **FR-008**: System MUST locate the skill directory by finding the SKILL.md file within the cloned repository (optionally matching by skillId for multi-skill repositories)
- **FR-009**: System MUST copy the skill directory to the target tool's skills path using a slugified version of the skill name
- **FR-010**: System MUST store source metadata (GitHub URL and relative path) in the installed skill's metadata
- **FR-011**: System MUST clean up temporary clone directories after installation completes (success or failure)
- **FR-012**: System MUST display appropriate error messages when installation fails
- **FR-013**: System MUST validate that a SKILL.md file exists before completing installation
- **FR-014**: System MUST parse skill metadata from SKILL.md to determine the skill's display name
- **FR-015**: System MUST handle URL encoding for search queries with special characters
- **FR-016**: System MUST limit search results to 20 items as returned by the API

### Key Entities

- **SearchSkillResult**: Represents a skill discovered through the registry. Contains unique identifier (id), skill identifier (skillId), display name (name), installation count (installs), and GitHub repository path (source, format: "org/repo")

- **InstallFromRegistryRequest**: Represents a user's request to install a discovered skill. Contains GitHub repository path (source), skill identifier (skillId), and target tool identifier (targetToolId)

- **SkillInfo**: Represents an installed skill with metadata. Contains skill name, path, metadata parsed from SKILL.md, and source information (GitHub URL and relative path within repository)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a skill search API call in under 3 seconds, with total end-to-end time (including UI rendering) under 3.5 seconds for typical queries
- **SC-002**: Search results accurately reflect skills available in the skills.sh registry with correct metadata (name, install count, source)
- **SC-003**: Users can successfully install a discovered skill to their chosen tool in under 30 seconds (excluding download time)
- **SC-004**: 95% of installation attempts for valid skills complete successfully without user intervention
- **SC-005**: Error messages clearly indicate the cause of failure and are understandable by non-technical users
- **SC-006**: System cleans up 100% of temporary files created during installation, even when installation fails
- **SC-007**: Search functionality remains responsive when users type rapidly, with no more than 1 API call per 400ms
- **SC-008**: Installed skills appear correctly in the target tool's skill list with accurate metadata

## Assumptions

- The skills.sh API is publicly accessible and does not require authentication
- Git is installed and available in the system PATH
- Users have write permissions to their selected tool's skills directory
- The skills.sh registry service maintains accurate metadata about skills and their GitHub repositories
- GitHub repositories referenced by skills.sh are publicly accessible (not private)
- Skills follow the standard structure with a SKILL.md file in the skill directory
- The target tools' skills directories are configured and accessible
- Network connectivity is available for both skills.sh API calls and GitHub cloning operations
- The skills.sh API returns consistent JSON structure as documented
- Users have sufficient disk space for cloning repositories and installing skills
