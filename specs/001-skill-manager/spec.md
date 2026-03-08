# Feature Specification: Claude Code Skill Management Center

**Feature Branch**: `001-skill-manager`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "根据 skillsMM 需求规格说明书 V1.2.md 生成spec"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Local Skill Management (Priority: P1)

As a Claude Code user, I want to view, create, edit, and delete all my local skills in one unified interface so that I can efficiently manage my skill library without navigating through file systems.

**Why this priority**: Local skill management is the core value proposition. Users need basic CRUD operations before any advanced features (search, AI generation) become useful. This is the foundation upon which all other features build.

**Independent Test**: Can be fully tested by creating a test skill, viewing it in the list, editing its content, and deleting it. Delivers immediate value by centralizing skill management.

**Acceptance Scenarios**:

1. **Given** the application is launched for the first time, **When** the user selects a project directory, **Then** the system scans and displays all skills from both project and global directories within 2 seconds
2. **Given** the skill list is displayed, **When** the user clicks "New Skill", **Then** a new skill file with proper frontmatter template is created and opened in the editor
3. **Given** a skill exists in the list, **When** the user edits and saves it, **Then** the file is updated within 100ms and the list refreshes with new metadata
4. **Given** a skill exists, **When** the user deletes it, **Then** the file moves to system recycle bin and disappears from the list after confirmation

---

### User Story 2 - AI-Assisted Skill Generation (Priority: P2)

As a skill creator, I want to describe my skill needs in natural language and have AI generate or modify skill content through streaming responses so that I can create high-quality skills faster than manual writing.

**Why this priority**: AI generation significantly accelerates skill creation but requires the basic management infrastructure (P1) to be functional first. Users need to see, edit, and save AI-generated content.

**Independent Test**: Can be tested by invoking AI generation with a prompt, watching streaming content appear in real-time, and applying the generated content to a new or existing skill file.

**Acceptance Scenarios**:

1. **Given** the skill editor is open, **When** the user clicks "AI Assist" and enters "Create a React code review skill with best practices", **Then** AI generates a complete skill with valid frontmatter and markdown body, streaming content every 200ms
2. **Given** AI is generating content, **When** the user clicks "Stop", **Then** generation halts within 500ms and partial content is preserved
3. **Given** AI generated content is shown, **When** the user clicks "Apply", **Then** content is inserted into the editor at cursor position or replaces selection based on chosen mode
4. **Given** the user is editing an existing skill, **When** they request AI to "Add examples section", **Then** AI modifies current content while preserving original structure

---

### User Story 3 - Public Skill Discovery (Priority: P3)

As a skill explorer, I want to search GitHub for publicly available skills and preview their content before installing so that I can discover and use community-created skills without manually browsing repositories.

**Why this priority**: Discovery expands the skill ecosystem but requires stable local management and optional AI enhancement first. Users need a place to install discovered skills.

**Independent Test**: Can be tested by searching for "React" skills, previewing a skill from search results, and installing it to the local project directory.

**Acceptance Scenarios**:

1. **Given** the user is on the "Public Search" tab, **When** they type "React hooks" and wait 500ms, **Then** GitHub search results display repositories containing .skill files with names, descriptions, and update times
2. **Given** search results are shown, **When** the user clicks a skill file, **Then** a preview window displays the full skill content fetched from GitHub raw URL without downloading the entire repository
3. **Given** a skill is previewed, **When** the user clicks "Install" and selects target directory, **Then** the skill file downloads and appears in the local skill list with appropriate conflict handling (overwrite/rename/skip)

---

### User Story 4 - Private Repository Sync (Priority: P4)

As a team developer, I want to connect to my team's private GitHub repositories, browse team skills, and keep my local copies updated so that our team can share and maintain a consistent skill library.

**Why this priority**: Team collaboration is valuable but depends on individual skill management (P1), optional AI enhancement (P2), and familiarity with skill discovery (P3). This extends the ecosystem to organizational use cases.

**Independent Test**: Can be tested by configuring a private repository with a valid PAT, browsing its skills, installing one, and then updating it when the remote version changes.

**Acceptance Scenarios**:

1. **Given** the user is in Settings, **When** they add a private repository URL and valid PAT, **Then** the system verifies access and saves the configuration with encrypted credentials
2. **Given** a private repository is configured, **When** the user selects it from the "Private Repos" tab, **Then** all .skill files in the repository are listed with paths and last commit times within 5 seconds
3. **Given** a private repository skill is shown, **When** the user clicks "Install", **Then** it downloads to the selected local directory and marks the source as that private repository
4. **Given** a skill installed from a private repo, **When** the remote version is updated and the user clicks "Update", **Then** the local file is replaced with the latest version after confirmation and optional backup

---

### User Story 5 - Settings and Configuration (Priority: P5)

As a user, I want to configure default behaviors, manage credentials, and customize AI settings so that the application adapts to my workflow and preferences.

**Why this priority**: Configuration enhances usability but is not blocking for core functionality. Users can accomplish primary tasks (P1-P4) with sensible defaults before customizing.

**Independent Test**: Can be tested by changing the default install directory, configuring AI API settings, testing the connection, and verifying new behavior in skill installation and AI generation.

**Acceptance Scenarios**:

1. **Given** the user is in Settings, **When** they configure AI provider, API key, and model, **Then** credentials are encrypted and the "Test Connection" button validates settings successfully
2. **Given** settings are configured, **When** the user changes "Default Install Directory" to "Global", **Then** all subsequent skill installations default to the global directory
3. **Given** multiple private repositories are configured, **When** the user removes one, **Then** its credentials are deleted but locally installed skills remain

---

### Edge Cases

- What happens when the user selects a non-Claude project directory (no `.claude` folder)?
  - System prompts user to confirm or select a valid Claude project directory
- How does the system handle GitHub API rate limits?
  - Displays clear error message: "GitHub API rate limit exceeded. Wait 10 minutes or add a Personal Access Token in Settings."
- What happens when AI generation takes longer than 30 seconds?
  - System prompts user to continue waiting or cancel, with option to retrieve partial results
- How does the system handle concurrent file modifications (external editor vs. application)?
  - Detects file change on save, prompts user to reload or overwrite
- What happens when a skill file has invalid YAML frontmatter?
  - System displays skill with warning icon, allows editing but flags validation errors
- How does the system handle network failures during skill installation?
  - Displays progress indicator, allows retry, cleans up partial downloads on failure

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST scan and display all skills from user-specified project directory and Claude Code global directory (`~/.claude/skills/`)
- **FR-002**: System MUST detect Claude project directories by verifying `.claude` folder existence
- **FR-003**: Users MUST be able to create new skills with auto-generated filenames (kebab-case) and frontmatter templates
- **FR-004**: System MUST provide an embedded editor (Monaco Editor) with YAML and Markdown syntax highlighting
- **FR-005**: Users MUST be able to save skill files with <100ms latency
- **FR-006**: System MUST move deleted skills to system recycle bin (not permanent deletion)
- **FR-007**: System MUST call Claude Agent SDK with `skill-creator` skill for AI-assisted generation
- **FR-008**: AI generation MUST support streaming responses with chunks arriving every 200ms minimum
- **FR-009**: System MUST support multiple AI generation modes: new skill, modify existing, insert at cursor, replace selection
- **FR-010**: System MUST encrypt and store GitHub PATs and AI API keys using Electron safeStorage
- **FR-011**: System MUST search GitHub for repositories containing `.skill` files with 500ms debounce
- **FR-012**: System MUST display skill previews from GitHub raw URLs without full repository downloads
- **FR-013**: System MUST handle installation conflicts with options: overwrite, rename with timestamp, or skip
- **FR-014**: System MUST validate all file operations are within authorized directories (project/global skill directories) to prevent path traversal
- **FR-015**: System MUST monitor local skill directories for real-time changes and refresh the skill list
- **FR-016**: System MUST support configuration of multiple private GitHub repositories with individual PATs
- **FR-017**: System MUST detect and indicate updates for skills installed from private repositories by comparing commit hashes
- **FR-018**: System MUST provide immediate visual feedback (loading spinners, progress bars, toast notifications) for all operations
- **FR-019**: System MUST display actionable error messages that guide users to solutions (no generic "An error occurred" messages)
- **FR-020**: System MUST support keyboard shortcuts for common operations (refresh, new skill, save, AI generate)

### Key Entities

- **Skill**: A markdown file with YAML frontmatter containing name and description, representing a Claude Code capability or knowledge domain. Key attributes: file path, name, description, source (project/global/private/public), last modified time, file size.
- **Skill Directory**: A folder containing skill files. Two types: project directory (user-specified, typically `skills/` in project root) and global directory (Claude Code default, `~/.claude/skills/`).
- **Private Repository**: A GitHub repository configured by the user for team skill sharing. Attributes: URL, associated PAT, last sync time, list of available skills.
- **Search Result**: A GitHub repository or file match from public search. Attributes: repository name, description, skill file list with download URLs.
- **AI Generation Request**: A user prompt for AI-assisted skill creation or modification. Attributes: prompt text, operation mode, current skill context (if modifying), target position (if inserting).
- **Configuration**: User preferences and credentials. Attributes: project directory path, GitHub tokens, private repository list, AI provider settings, default behaviors.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view and manage 500+ local skills with list load time ≤2 seconds and real-time updates within 500ms of file system changes
- **SC-002**: Skill creation, editing, and deletion operations complete with visual feedback within 100ms for file operations
- **SC-003**: AI-generated skills contain valid YAML frontmatter and markdown structure in 95% of generations (validated by automated tests)
- **SC-004**: AI streaming responses deliver first content chunk within 2 seconds and subsequent chunks every 200ms, with 90% of users reporting satisfaction with generation speed
- **SC-005**: GitHub search returns results within 5 seconds with 500ms debounce, handling rate limit errors with clear guidance
- **SC-006**: Skill installation from public or private repositories completes within 10 seconds for files under 1MB, with progress indication and conflict resolution
- **SC-007**: Private repository skill updates are detected within 5 seconds of manual refresh, with one-click update completion
- **SC-008**: Application startup completes in <3 seconds, with memory usage <300MB and idle CPU usage <5%
- **SC-009**: 90% of error messages are actionable (contain specific problem description and suggested solution)
- **SC-010**: All credential storage uses encryption, validated by security audit with zero plaintext credential exposures
- **SC-011**: All file operations validate path boundaries, preventing path traversal attacks (verified by penetration testing)
- **SC-012**: Users can complete core tasks (create, edit, install, AI-generate) without referring to documentation on first attempt, achieving 80% task success rate in usability testing

## Assumptions

- Users have Claude Code installed and are familiar with skill concepts
- Users have GitHub accounts for accessing public and private repositories
- Users have Anthropic API access for AI generation features
- Default skill directory structure follows Agent Skills specification (SKILL.md files)
- Network connectivity is available for GitHub and AI service access
- Users are developers comfortable with desktop applications and basic Git concepts
- Skill files are typically under 1MB in size (larger files may have degraded performance)
- The application runs on Windows 10/11, macOS 12+, or Linux (Ubuntu 20.04+)
- Users accept dark theme as the default interface (light theme not in initial scope)
- AI generation quality is acceptable with Claude 3 Sonnet model (Opus available for higher quality if needed)
- GitHub API rate limits (60 requests/hour unauthenticated, 5000/hour with PAT) are sufficient for typical usage patterns
