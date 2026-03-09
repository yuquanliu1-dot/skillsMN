# Feature Specification: AI-Assisted Skill Generation

**Feature Branch**: `003-ai-skill-generation`
**Created**: 2026-03-07
**Status**: Draft
**Input**: Split from 001-skill-manager for better implementation granularity
**Depends On**: 002-local-skill-management (requires skill editor and file management)

## Clarifications

### Session 2026-03-09

- Q: What is the physical structure of a skill on disk? → A: A skill is a directory containing a `skill.md` file (and potentially other assets like images, examples, or config files)
- Q: When creating a new skill with AI, how is the skill directory name determined? → A: Directory name is auto-generated from the skill name in YAML frontmatter (sanitized for filesystem)
- Q: What sanitization rules should be applied when converting skill names to directory names? → A: Use filesystem-safe characters only (lowercase alphanumeric, hyphens, underscores), replace spaces with hyphens, truncate to 255 characters
- Q: How should the system handle directory name conflicts when creating a new skill (directory already exists)? → A: Auto-append a numeric suffix (e.g., `react-code-review-2`, `react-code-review-3`)
- Q: What types of optional assets should be allowed in a skill directory besides skill.md? → A: Images and example files only (e.g., screenshots, code examples, reference files)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate New Skill with AI (Priority: P1)

As a skill creator, I want to describe my skill requirements in natural language and have AI generate a complete skill.md file so that I can create skills faster than manual writing.

**Why this priority**: Generating new skills from scratch is the most common AI use case and provides immediate productivity value.

**Independent Test**: Can be tested by invoking AI generation with a prompt, watching streaming content appear, and applying the generated content to a new skill.md file.

**Acceptance Scenarios**:

1. **Given** the user is creating a new skill, **When** they click "AI Assist" and enter "Create a React code review skill with best practices for hooks and state management", **Then** AI generates a complete skill with valid YAML frontmatter (name, description) and markdown body
2. **Given** AI is generating content, **When** the content streams in, **Then** chunks appear every 200ms minimum in a preview panel
3. **Given** AI generated content is shown, **When** the user clicks "Apply", **Then** content is inserted into the skill editor
4. **Given** the generated content is in the editor, **When** the user saves, **Then** a skill directory is created (name auto-generated from YAML frontmatter skill name) with skill.md containing valid structure

---

### User Story 2 - Modify Existing Skill with AI (Priority: P1)

As a skill maintainer, I want AI to enhance or modify my existing skills so that I can improve them without extensive manual editing.

**Why this priority**: Modifying existing skills is equally important as creating new ones and provides ongoing productivity value.

**Independent Test**: Can be tested by opening an existing skill, requesting AI to add/modify content, and verifying changes are applied correctly.

**Acceptance Scenarios**:

1. **Given** the skill editor is open with existing content, **When** the user requests "Add a troubleshooting section with common issues", **Then** AI generates new content while preserving the original structure
2. **Given** the skill has content, **When** the user selects text and requests "Improve this description", **Then** AI modifies only the selected text
3. **Given** AI is modifying content, **When** the user reviews the preview, **Then** both original and modified sections are highlighted for comparison
4. **Given** the modified content is applied, **When** the user saves, **Then** the skill.md file is updated with changes

---

### User Story 3 - Insert Content at Cursor (Priority: P2)

As a skill author, I want AI to generate and insert content at a specific location in my skill.md file so that I can build skills incrementally.

**Why this priority**: Insert at cursor is useful for targeted additions but less critical than full skill generation/modification.

**Independent Test**: Can be tested by placing cursor at a specific location, requesting AI to generate content, and verifying it's inserted at the correct position.

**Acceptance Scenarios**:

1. **Given** the editor is open with cursor at a specific position, **When** the user requests "Add an example code block here", **Then** AI generates content and inserts it at the cursor position
2. **Given** content is generated, **When** the user clicks "Apply", **Then** the new content appears at the cursor without overwriting existing text
3. **Given** content is inserted, **When** the user saves, **Then** the skill.md file reflects the insertion

---

### User Story 4 - Replace Selected Content (Priority: P2)

As a skill editor, I want to select a section and have AI rewrite it so that I can quickly improve specific parts of my skills.

**Why this priority**: Replace selection is useful for targeted improvements but less critical than full skill operations.

**Independent Test**: Can be tested by selecting text, requesting AI to rewrite it, and verifying only the selected text is replaced.

**Acceptance Scenarios**:

1. **Given** the user selects a paragraph in the editor, **When** they request "Rewrite this more concisely", **Then** AI generates a replacement
2. **Given** the replacement is shown in preview, **When** the user clicks "Apply", **Then** only the selected text is replaced, surrounding content remains unchanged
3. **Given** the replacement is applied, **When** the user saves, **Then** the skill.md file reflects the change

---

### User Story 5 - Control AI Generation (Priority: P1)

As a user, I want to start, stop, and retry AI generation so that I have full control over the AI assistance process.

**Why this priority**: User control is essential for AI features. Users must be able to interrupt long-running generations and retry unsatisfactory results.

**Independent Test**: Can be tested by starting generation, stopping it mid-stream, and retrying with the same or modified prompt.

**Acceptance Scenarios**:

1. **Given** AI is generating content, **When** the user clicks "Stop", **Then** generation halts within 500ms and partial content is preserved in the preview
2. **Given** generation is stopped, **When** the user clicks "Retry", **Then** AI regenerates content with the same prompt
3. **Given** the preview shows generated content, **When** the user modifies the prompt and clicks "Regenerate", **Then** AI generates new content with the updated prompt
4. **Given** generation takes longer than 30 seconds, **When** the timeout occurs, **Then** the system prompts to continue waiting or cancel

---

### User Story 6 - Configure AI Settings (Priority: P2)

As a user, I want to configure AI provider, API key, and model selection so that I can use my preferred AI service and control costs.

**Why this priority**: Configuration is necessary for AI features but can use sensible defaults initially. Users may want to customize later.

**Independent Test**: Can be tested by configuring AI settings, testing the connection, and verifying AI generation uses the configured service.

**Acceptance Scenarios**:

1. **Given** the user is in Settings > AI Configuration, **When** they enter API key and select a model, **Then** credentials are encrypted and saved
2. **Given** AI settings are configured, **When** the user clicks "Test Connection", **Then** the system validates credentials and displays success or specific error message
3. **Given** multiple models are available, **When** the user selects a different model, **Then** all subsequent generations use the selected model
4. **Given** streaming is configurable, **When** the user toggles "Stream Responses", **Then** AI generation switches between streaming and batch mode

---

### Edge Cases

- What happens when AI generates invalid YAML frontmatter?
  - System validates generated content, displays validation errors, and allows user to edit before applying
- How does the system handle API rate limits or quota exceeded?
  - System displays clear error: "AI API rate limit exceeded. Please wait or check your usage quota."
- What happens when network connection is lost during streaming?
  - System detects interruption, preserves partial content, and offers retry option
- How does the system handle very long generation prompts?
  - System enforces reasonable prompt length limit (e.g., 2000 characters) and displays counter
- What happens if the user's API key is invalid?
  - System displays error during connection test: "Invalid API key. Please check your credentials."
- How does the system handle AI generation timeout?
  - After 30 seconds, system prompts user to continue waiting or cancel, with option to retrieve partial results
- What happens when a skill directory with the same name already exists?
  - System auto-appends a numeric suffix to the directory name (e.g., `react-code-review-2`, `react-code-review-3`) to avoid collision

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST call AI service (Claude Agent SDK with `skill-creator` skill) to generate skill content based on user prompts
- **FR-002**: AI generation MUST support streaming responses with content chunks arriving every 200ms minimum
- **FR-003**: System MUST support four AI generation modes: new skill, modify existing, insert at cursor, replace selection
- **FR-004**: When creating a new skill, system MUST auto-generate the skill directory name from the skill name in YAML frontmatter using sanitization rules: lowercase alphanumeric, hyphens, underscores only; replace spaces with hyphens; truncate to 255 characters
- **FR-005**: System MUST handle directory name conflicts by auto-appending a numeric suffix (e.g., `-2`, `-3`) to ensure uniqueness
- **FR-006**: System MUST encrypt and store AI API keys using secure storage (Electron safeStorage or OS credential manager)
- **FR-007**: System MUST provide real-time preview of AI-generated content before applying to editor
- **FR-008**: Users MUST be able to stop AI generation mid-stream and preserve partial content
- **FR-009**: System MUST validate AI-generated YAML frontmatter and display errors before allowing apply
- **FR-010**: System MUST support retry and regenerate operations with same or modified prompts
- **FR-011**: System MUST enforce reasonable prompt length limits and display character counter
- **FR-012**: System MUST handle AI service errors (rate limits, network failures, invalid credentials) with actionable error messages
- **FR-013**: System MUST allow configuration of AI provider, API key, model selection, and streaming toggle
- **FR-014**: System MUST provide connection test functionality to validate AI credentials
- **FR-015**: System MUST display generation timeout prompt after 30 seconds with continue/cancel options
- **FR-016**: System MUST highlight differences between original and AI-modified content for review
- **FR-017**: System MUST integrate AI assist button in skill editor toolbar with keyboard shortcut (Ctrl+G)

### Key Entities

- **Skill**: A directory containing skill.md file and optional assets. Attributes: directory name (auto-generated from YAML frontmatter skill name with sanitization: lowercase alphanumeric/hyphens/underscores only, spaces→hyphens, max 255 chars), skill.md content (YAML frontmatter + markdown body), optional assets (images and example files such as screenshots, code examples, reference files).
- **AI Generation Request**: User prompt for skill creation or modification. Attributes: prompt text, operation mode (new/modify/insert/replace), current skill context (if modifying), cursor position (if inserting), selected text (if replacing).
- **AI Generation Response**: Streamed content from AI service. Attributes: content chunks, completion status, validation errors.
- **AI Configuration**: User's AI service settings. Attributes: provider (Anthropic or compatible), API key (encrypted), model selection, streaming enabled flag, skill-creator version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI-generated skills contain valid YAML frontmatter and markdown structure in 95% of generations (validated by automated tests)
- **SC-002**: AI streaming responses deliver first content chunk within 2 seconds and subsequent chunks every 200ms
- **SC-003**: 90% of users report satisfaction with AI generation speed and quality in user surveys
- **SC-004**: Users can create a complete skill with AI assistance 50% faster than manual writing (measured by time-to-completion in usability testing)
- **SC-005**: All AI API keys are encrypted in storage with zero plaintext exposures (validated by security audit)
- **SC-006**: AI generation stop operation completes within 500ms with partial content preserved
- **SC-007**: 85% of AI-generated content is accepted by users without manual editing (measured by apply-vs-edit rate)
- **SC-008**: Connection test accurately validates credentials with 100% success rate for valid keys and clear error messages for invalid keys

## Assumptions

- Users have Anthropic API access or compatible AI service
- Users understand skill structure and can provide clear prompts
- AI service availability is 99%+ (occasional outages handled gracefully)
- Claude 3 Sonnet model provides acceptable quality for most skill generation tasks
- Users accept streaming as default mode (batch mode available for slower connections)
- Reasonable prompt length is under 2000 characters
- AI generation timeout of 30 seconds is sufficient for most requests
- Users have stable internet connection for AI API calls
- skill-creator skill is available and maintained by Anthropic
- Users are comfortable reviewing AI-generated content before applying

## Dependencies

- Requires 002-local-skill-management for:
  - Skill editor component
  - File save/load operations
  - Skill list display
- Integration points:
  - AI assist button in editor toolbar
  - Settings page for AI configuration
  - Error notification system
