# Feature Specification: Local Skill Management

**Feature Branch**: `002-local-skill-management`
**Created**: 2026-03-07
**Status**: Draft
**Input**: Split from 001-skill-manager for better implementation granularity
**Depends On**: None (foundation feature)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Application Initialization (Priority: P1)

As a new user, I want to quickly set up the application by selecting my Claude project directory so that I can start managing my skills immediately.

**Why this priority**: First-time setup is the entry point. Without proper initialization, users cannot access any other features.

**Independent Test**: Can be tested by launching the app for the first time, selecting a directory, and verifying skills are scanned and displayed.

**Acceptance Scenarios**:

1. **Given** the application is launched for the first time, **When** the setup dialog appears, **Then** the user can browse and select an existing Claude project directory (with `.claude` folder)
2. **Given** a non-Claude directory is selected (no `.claude` folder), **When** the user confirms, **Then** the system prompts to select a valid Claude project directory or create one
3. **Given** a valid directory is selected, **When** setup completes, **Then** configuration is saved and skills from both project and global directories are scanned within 2 seconds

---

### User Story 2 - View Local Skills (Priority: P1)

As a user, I want to see all my local skills from both project and global directories in one unified list so that I can quickly find and manage them.

**Why this priority**: Viewing skills is the most basic operation. All other management features (edit, delete) depend on seeing the skill list first.

**Independent Test**: Can be tested by adding skills to project and global directories, then verifying they appear in the unified list with correct metadata.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** the skill list loads, **Then** all skills from project directory and global directory (`~/.claude/skills/`) are displayed with names, descriptions, source labels, and last modified times
2. **Given** the skill list is displayed, **When** the user filters by source (project/global), **Then** only skills from the selected source are shown
3. **Given** the skill list is displayed, **When** the user sorts by name or modified time, **Then** the list reorders accordingly within 100ms
4. **Given** a skill file is added/modified/deleted externally, **When** the file system change occurs, **Then** the skill list updates automatically within 500ms

---

### User Story 3 - Create New Skill (Priority: P1)

As a skill creator, I want to quickly create a new skill file with proper structure so that I can start writing skills without manually setting up files.

**Why this priority**: Creation is a core CRUD operation. Users need to add new skills to their library.

**Independent Test**: Can be tested by creating a new skill, verifying the file is created with correct template, and checking it appears in the list.

**Acceptance Scenarios**:

1. **Given** the skill list is displayed, **When** the user clicks "New Skill" and enters a name, **Then** a new skill file is created with kebab-case filename (e.g., `my-awesome-skill.skill`) in the selected directory
2. **Given** the new skill file is created, **When** it opens, **Then** it contains YAML frontmatter with name and description placeholders
3. **Given** the skill is created, **When** the user saves it, **Then** the file appears in the skill list within 100ms with updated metadata

---

### User Story 4 - Edit Skill Content (Priority: P1)

As a skill maintainer, I want to edit skill content in a convenient editor so that I can refine and improve my skills.

**Why this priority**: Editing is a core CRUD operation. Users need to modify existing skills.

**Independent Test**: Can be tested by opening a skill, making changes, saving, and verifying the file is updated correctly.

**Acceptance Scenarios**:

1. **Given** a skill exists in the list, **When** the user clicks "Edit" or double-clicks the skill, **Then** an editor opens with YAML and Markdown syntax highlighting
2. **Given** the editor is open, **When** the user modifies content and clicks "Save", **Then** the file is saved within 100ms and a success notification appears
3. **Given** the file was modified externally while the editor is open, **When** the user tries to save, **Then** a prompt appears asking to reload or overwrite
4. **Given** the editor is open, **When** the user uses keyboard shortcuts (Ctrl+S to save, Ctrl+W to close), **Then** the corresponding actions execute immediately

---

### User Story 5 - Delete Skill (Priority: P1)

As a skill manager, I want to safely delete skills I no longer need so that I can keep my skill library organized.

**Why this priority**: Deletion is a core CRUD operation. Users need to remove unwanted skills.

**Independent Test**: Can be tested by deleting a skill, confirming the action, and verifying it moves to recycle bin and disappears from the list.

**Acceptance Scenarios**:

1. **Given** a skill exists, **When** the user clicks "Delete" and confirms, **Then** the file moves to the system recycle bin (not permanent deletion)
2. **Given** the skill is deleted, **When** the operation completes, **Then** the skill disappears from the list and a success notification appears
3. **Given** the user wants to recover a deleted skill, **When** they restore it from the recycle bin, **Then** it reappears in the skill list within 500ms

---

### User Story 6 - Configure Settings (Priority: P2)

As a user, I want to configure default behaviors and preferences so that the application adapts to my workflow.

**Why this priority**: Settings enhance usability but are not blocking for core CRUD operations. Users can work with sensible defaults first.

**Independent Test**: Can be tested by changing settings (default install directory, editor mode), saving, and verifying new behavior in operations.

**Acceptance Scenarios**:

1. **Given** the user is in Settings, **When** they change "Default Install Directory" to "Global", **Then** all subsequent skill installations default to the global directory
2. **Given** the user is in Settings, **When** they change "Editor Default Mode" to "Preview", **Then** double-clicking a skill opens preview mode instead of edit mode
3. **Given** settings are modified, **When** the user clicks "Save", **Then** configuration persists and applies immediately

---

### Edge Cases

- What happens when the project directory is deleted or moved while the app is running?
  - System detects missing directory, prompts user to select a new project directory
- How does the system handle skill files with invalid YAML frontmatter?
  - System displays skill with warning icon, allows editing but shows validation errors
- What happens when file permissions prevent reading/writing skill files?
  - System displays clear error message: "Permission denied: Cannot access [file path]. Check file permissions."
- How does the system handle extremely long skill lists (1000+ items)?
  - System uses virtual scrolling to maintain performance, search/filter remains responsive

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST scan and display all skills from user-specified project directory and Claude Code global directory (`~/.claude/skills/`)
- **FR-002**: System MUST detect Claude project directories by verifying `.claude` folder existence
- **FR-003**: Users MUST be able to create new skills with auto-generated filenames (kebab-case) and frontmatter templates
- **FR-004**: System MUST provide an embedded editor with YAML and Markdown syntax highlighting
- **FR-005**: Users MUST be able to save skill files with <100ms latency
- **FR-006**: System MUST move deleted skills to system recycle bin (not permanent deletion)
- **FR-007**: System MUST validate all file operations are within authorized directories (project/global skill directories) to prevent path traversal
- **FR-008**: System MUST monitor local skill directories for real-time changes and refresh the skill list within 500ms
- **FR-009**: System MUST provide immediate visual feedback (loading spinners, success/error notifications) for all operations
- **FR-010**: System MUST display actionable error messages that guide users to solutions (no generic "An error occurred" messages)
- **FR-011**: System MUST support keyboard shortcuts for common operations (Ctrl+N new skill, Ctrl+S save, Delete key for deletion)
- **FR-012**: System MUST persist user configuration (project directory path, default behaviors) to local storage
- **FR-013**: Users MUST be able to filter skills by source (project/global) and search by name
- **FR-014**: Users MUST be able to sort skills by name or last modified time
- **FR-015**: System MUST handle concurrent file modifications by detecting external changes and prompting user to reload or overwrite

### Key Entities

- **Skill**: A markdown file with YAML frontmatter containing name and description. Attributes: file path, name, description, source (project/global), last modified time, file size.
- **Skill Directory**: A folder containing skill files. Two types: project directory (user-specified) and global directory (Claude Code default).
- **Configuration**: User preferences. Attributes: project directory path, default install directory, editor default mode, auto-refresh toggle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Application startup and initial skill scan completes in <3 seconds for 500 skills
- **SC-002**: Skill list displays 500+ skills with real-time updates within 500ms of file system changes
- **SC-003**: Skill creation, editing, and deletion operations complete with visual feedback within 100ms
- **SC-004**: 90% of error messages are actionable (contain specific problem description and suggested solution)
- **SC-005**: All file operations validate path boundaries, preventing path traversal attacks (verified by security testing)
- **SC-006**: Users can complete core tasks (create, edit, delete) without documentation on first attempt, achieving 85% task success rate
- **SC-007**: Application maintains <200MB memory usage with 500 skills loaded
- **SC-008**: All user configuration persists across sessions with zero data loss

## Assumptions

- Users have Claude Code installed and understand skill concepts
- Users are developers comfortable with desktop applications
- Skill files follow Agent Skills specification (markdown with YAML frontmatter)
- Skill files are typically under 1MB in size
- Application runs on Windows 10/11, macOS 12+, or Linux (Ubuntu 20.04+)
- Users accept dark theme as default interface
- File system permissions allow reading/writing in project and global directories
- One project directory is sufficient (multi-project support in future versions)
