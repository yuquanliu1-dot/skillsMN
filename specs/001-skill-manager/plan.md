# Implementation Plan: Claude Code Skill Management Center

**Branch**: `001-skill-manager` | **Date**: 2026-03-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-skill-manager/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

skillsMN is a cross-platform Electron desktop application that provides a unified interface for Claude Code users to manage local skills, discover community skills from GitHub, and leverage AI-assisted skill generation. The application enables users to view, create, edit, and delete skills from project and global directories, search and install skills from public GitHub repositories, sync with private team repositories, and generate or modify skills using Claude AI through the skill-creator integration.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Node.js LTS (v20+)
**Primary Dependencies**: Electron (latest stable), React 18+, Tailwind CSS, Monaco Editor, Claude Agent SDK, GitHub REST API v3
**Storage**: Local file system (skill files and directories), JSON files (configuration and metadata), Electron safeStorage (encrypted credentials)
**Testing**: Jest with ts-jest, React Testing Library, Spectron (Electron testing)
**Target Platform**: Cross-platform desktop (Windows 10/11, macOS 12+, Linux Ubuntu 20.04+)
**Project Type**: Desktop application (Electron)
**Performance Goals**:
- Application startup: <3 seconds
- Skill list loading: ≤2 seconds (500+ skills)
- GitHub API requests: ≤5 seconds timeout
- File save operations: <100ms
- AI generation first token: ≤2 seconds
- AI generation complete: ≤5 seconds (normal complexity)
**Constraints**:
- Memory footprint: <300 MB
- CPU usage (idle): <5%
- Offline-capable for local operations
- HTTPS-only external communication
**Scale/Scope**:
- 500+ local skills
- Typical skill directory size: <1MB
- Support for nested subdirectories within skills
- Multiple private repositories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User-Centric Design ✅
- **Status**: PASS
- **Evidence**: All 5 user stories address real pain points identified in the requirements (scattered skills, lack of sharing, difficult discovery, inefficient creation, need for AI assistance). Each story has clear acceptance criteria and can be tested independently.
- **User feedback**: Immediate feedback mechanisms specified (loading states, progress bars, toast notifications).

### II. Security First (NON-NEGOTIABLE) ✅
- **Status**: PASS
- **Evidence**:
  - FR-010: Credentials encrypted using Electron safeStorage
  - FR-014: Path validation for all file operations
  - FR-006: Secure deletion via system recycle bin
  - Architecture: All external API calls proxied through backend, never exposing keys to frontend
- **Validation Required**: Security audit before feature completion

### III. Performance Excellence ✅
- **Status**: PASS
- **Evidence**: All performance targets from constitution are reflected in SC-001 through SC-008:
  - Startup <3s (SC-008)
  - Skill loading ≤2s for 500+ skills (SC-001)
  - File operations <100ms (SC-002)
  - AI first token ≤2s, chunks every 200ms (SC-004)
  - Memory <300MB, CPU <5% idle (SC-008)
- **Validation Required**: Performance testing with 500+ skills before completion

### IV. AI-Assisted Development ✅
- **Status**: PASS
- **Evidence**:
  - FR-007: Integration with Claude Agent SDK and skill-creator skill
  - FR-008: Streaming responses with 200ms chunks
  - FR-009: Multiple generation modes (new, modify, insert, replace)
  - SC-003: 95% valid YAML frontmatter generation
  - SC-004: 90% user satisfaction with generation speed
- **Implementation Note**: AI requests proxied through backend (security requirement)

### V. Cross-Platform Compatibility ✅
- **Status**: PASS
- **Evidence**:
  - Target platforms: Windows 10/11, macOS 12+, Linux Ubuntu 20.04+
  - UI minimum resolution: 1024x768
  - Path handling: Platform-aware (use path.join)
  - Platform-specific code: Conditionally loaded and isolated
- **Assumption validated**: All three major desktop platforms supported

### VI. Modularity and Testability ✅
- **Status**: PASS
- **Evidence**:
  - Architecture: Clear separation between main process (backend), renderer process (frontend), and IPC layer
  - Testing: Unit test coverage target ≥70% for core logic (constitution requirement)
  - Services: Single responsibility, testable independently
  - IPC handlers: Thin wrappers around service functions
- **Validation Required**: Test coverage verification before completion

### VII. Observability ✅
- **Status**: PASS
- **Evidence**:
  - FR-018: Visual feedback for all operations (loading spinners, progress bars, toast notifications)
  - FR-019: Actionable error messages (90% target in SC-009)
  - Logging: Timestamps, operation context, identifiers (constitution requirement)
  - Performance metrics: Tracked for operations with SLAs
- **Implementation Note**: User-facing errors must provide guidance, not technical jargon

**Constitution Check Result**: ✅ ALL GATES PASSED - Proceed to Phase 0

## UI/UX Design Requirements

*For features with frontend components, follow the ui-ux-pro-max skill workflow:*

**Design Process** (MUST complete before frontend implementation):
1. **Product Research**: Search for product type recommendations (e.g., dashboard, landing page, desktop app)
2. **Style Research**: Search for style guidelines matching project requirements (e.g., dark mode, minimalism, professional)
3. **Typography**: Search for font pairings appropriate for the product type
4. **Color Palette**: Search for color palettes by product type or industry
5. **UX Patterns**: Search for UX best practices (animation, accessibility, interaction patterns)
6. **Stack Guidelines**: Search for React + Tailwind CSS specific patterns and best practices

**Design Quality Standards** (MUST verify before implementation):
- [ ] No emoji icons (use SVG icons from Heroicons, Lucide, or Simple Icons)
- [ ] Stable hover states (no layout shifts, use color/opacity transitions)
- [ ] Correct brand logos (verified from official sources)
- [ ] Consistent icon sizing (24x24 viewBox with w-6 h-6 classes)
- [ ] Cursor pointer on all interactive elements
- [ ] Smooth transitions (150-300ms, avoid >500ms)
- [ ] Light/dark mode contrast (4.5:1 minimum for text)
- [ ] Responsive at 1024x768 minimum resolution
- [ ] Accessibility compliance (alt text, labels, keyboard navigation)

**Performance Requirements**:
- UI interactions MUST complete within 100ms
- List rendering MUST handle 500+ items efficiently (virtual scrolling if needed)
- No synchronous operations in hot paths
- Proper error boundaries and loading states

## Project Structure

### Documentation (this feature)

```text
specs/001-skill-manager/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main/                      # Electron main process (backend)
│   ├── index.ts              # Application entry point
│   ├── models/               # Data models and types
│   │   ├── Skill.ts
│   │   ├── Configuration.ts
│   │   ├── PrivateRepository.ts
│   │   └── SearchResult.ts
│   ├── services/             # Business logic services
│   │   ├── SkillService.ts
│   │   ├── PathValidator.ts
│   │   ├── GitHubService.ts
│   │   ├── AIService.ts
│   │   ├── ConfigService.ts
│   │   └── FileWatcher.ts
│   ├── ipc/                  # IPC handlers
│   │   ├── skillHandlers.ts
│   │   ├── gitHubHandlers.ts
│   │   ├── aiHandlers.ts
│   │   └── configHandlers.ts
│   └── utils/                # Utility functions
│       ├── crypto.ts
│       └── pathUtils.ts
├── renderer/                 # Electron renderer process (frontend)
│   ├── components/           # React components
│   │   ├── SkillList.tsx
│   │   ├── SkillEditor.tsx
│   │   ├── SkillPreview.tsx
│   │   ├── SearchPanel.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── AIPanel.tsx
│   ├── services/             # Frontend services
│   │   └── ipcClient.ts
│   ├── styles/               # Tailwind CSS styles
│   │   └── index.css
│   ├── index.html           # HTML entry point
│   └── App.tsx              # React root component
└── shared/                   # Shared code between main and renderer
    └── types/
        └── ipc.ts

tests/
├── unit/                     # Unit tests
│   ├── services/
│   └── models/
├── integration/              # Integration tests
│   ├── skillManagement.test.ts
│   ├── gitHubIntegration.test.ts
│   └── aiGeneration.test.ts
└── e2e/                      # End-to-end tests (Electron)
    └── app.test.ts
```

**Structure Decision**: Selected Electron desktop application structure with clear separation between main process (backend services, file system, API calls) and renderer process (UI components, React). This follows the Electron architectural pattern from the constitution, ensuring security (backend-only credential access), modularity (service layer separation), and testability (independent service testing).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All constitution gates passed.
