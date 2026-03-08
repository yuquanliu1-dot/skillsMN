<!--
Sync Impact Report:
- Version change: N/A → 1.0.0 (Initial constitution creation)
- Added sections: All (initial creation)
- Removed sections: None
- Templates status:
  ✅ constitution.md - Created from template
  ⚠ plan-template.md - May need Constitution Check alignment
  ⚠ spec-template.md - No changes needed (user stories format compatible)
  ⚠ tasks-template.md - No changes needed (task structure compatible)
- Follow-up TODOs: None
-->

# skillsMM Constitution

## Core Principles

### I. User-Centric Design

Every feature MUST solve a real pain point for Claude Code users identified in the requirements specification. Features MUST be prioritized based on user value, with clear user stories and acceptance criteria. All user interactions MUST provide immediate feedback (loading states, success/error notifications) and maintain consistency across the interface.

**Rationale**: skillsMM exists to streamline skill management for Claude Code users. Every design decision should be validated against the user problems defined in the requirements: scattered skills, lack of team sharing, difficulty discovering community skills, inefficient creation workflows, and the need for AI-assisted generation.

### II. Security First (NON-NEGOTIABLE)

All sensitive data (GitHub PATs, API keys) MUST be encrypted using Electron's safeStorage or OS credential manager. All file operations MUST validate paths are within authorized directories (project/global skill directories) to prevent path traversal attacks. All external communications MUST use HTTPS. Delete operations MUST move files to system recycle bin, not permanently delete. AI service requests MUST be proxied through the backend, never exposing API keys to the frontend.

**Rationale**: As a desktop application handling authentication tokens and accessing user files, security is paramount. Violations could expose user credentials or allow unauthorized file system access.

### III. Performance Excellence

All features MUST meet the performance targets defined in the requirements specification:
- Application startup: <3 seconds
- Local skill list loading: ≤2 seconds (for up to 500 skills)
- GitHub API requests: ≤5 seconds timeout
- File save operations: <100ms
- AI generation first token: ≤2 seconds
- AI generation complete: ≤5 seconds (normal complexity)
- Memory footprint: <300 MB
- CPU usage (idle): <5%

**Rationale**: Performance directly impacts user experience and productivity. These targets are based on desktop application standards and ensure the tool enhances rather than hinders workflow efficiency.

### IV. AI-Assisted Development

AI features MUST integrate with Claude Agent SDK and the skill-creator skill. AI generation MUST support streaming responses with real-time display (200ms chunks minimum). Generated content MUST conform to Agent Skills specification (valid YAML frontmatter + Markdown). Users MUST be able to stop generation mid-stream. AI requests MUST timeout gracefully after 30 seconds with user options to continue or cancel.

**Rationale**: AI-assisted skill creation is a core differentiator of skillsMM. Proper integration ensures users can efficiently generate high-quality, standards-compliant skills while maintaining control over the process.

### V. Cross-Platform Compatibility

All features MUST work identically on Windows 10/11, macOS 12+, and Linux (Ubuntu 20.04+). The UI MUST support minimum resolution 1024x768 with proper scaling. File path handling MUST be platform-aware (use path.join, not string concatenation). Platform-specific code MUST be isolated and conditionally loaded.

**Rationale**: skillsMM targets developers across all major desktop platforms. Platform-specific failures or inconsistencies would exclude portions of the user base.

### VI. Modularity and Testability

Frontend and backend MUST be clearly separated with well-defined IPC interfaces. All core business logic MUST be independently testable with unit test coverage ≥70%. IPC handlers MUST be thin wrappers around testable service functions. Services MUST be modular with single responsibilities and clear contracts.

**Rationale**: A modular, testable architecture ensures maintainability, enables parallel development, and provides confidence in code quality through automated testing.

### VII. Observability

All critical operations MUST be logged with appropriate detail (errors, warnings, info). Logs MUST include timestamps, operation context, and relevant identifiers. Performance metrics MUST be tracked for operations with SLAs. User-facing errors MUST provide actionable guidance, not technical jargon.

**Rationale**: Effective logging enables debugging of user issues, performance monitoring, and identification of improvement opportunities. Clear error messages improve user experience and reduce support burden.

## Performance Standards

All features MUST adhere to the performance requirements defined in section 4.1 of the requirements specification. Features that cannot meet these targets MUST be flagged during planning with proposed mitigation strategies.

Performance-critical paths:
- Skill scanning and metadata extraction
- GitHub API interactions
- File I/O operations
- AI streaming response handling
- UI rendering and updates

## Security Requirements

All implementations MUST comply with security requirements from section 4.2:
- Credential encryption using safeStorage
- Path validation for all file operations
- HTTPS-only external communication
- Secure deletion via system recycle bin
- API key protection (backend proxy only)

Security violations are NON-NEGOTIABLE and MUST be resolved before any feature can be considered complete.

## Development Workflow

### Code Quality
- TypeScript with strict mode and ESLint enforcement
- Python code using Black formatter (if Python backend components used)
- Clear separation of concerns: models, services, IPC handlers
- No business logic in IPC handlers - delegate to testable services

### Testing
- Unit tests required for all core business logic
- Target coverage: ≥70% for core logic
- Integration tests for critical user journeys
- Tests must be written and approved before implementation (when explicitly requested)

### Documentation
- All IPC interfaces must be documented with parameters and return types
- Service contracts must be clearly defined
- Configuration schema must be documented

## Governance

This constitution supersedes all other development practices and guidelines. All feature specifications, implementation plans, and tasks must be validated against these principles.

**Amendment Process**:
1. Proposed changes must be documented with rationale
2. Impact assessment on existing features/templates required
3. Version increment following semantic versioning:
   - MAJOR: Breaking changes to principles or removal of requirements
   - MINOR: New principles or materially expanded guidance
   - PATCH: Clarifications, wording improvements, non-semantic refinements
4. All dependent templates must be updated to reflect changes
5. Sync Impact Report must document all affected files

**Compliance Verification**:
- All implementation plans must include a "Constitution Check" section
- Code reviews must verify adherence to principles
- Performance and security requirements must be validated before feature completion

**Version**: 1.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-08
