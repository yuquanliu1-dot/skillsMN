# Implementation Plan: Private Repository Sync

**Branch**: `005-private-repo-sync` | **Date**: 2026-03-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-private-repo-sync/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Enable users to configure private GitHub repositories with Personal Access Tokens, browse team-internal skills, install skill directories with all contents, and stay synchronized with remote updates. The feature integrates with the existing skill management system, reusing installation logic from public skill discovery while adding secure credential management and directory-level update tracking.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Node.js LTS (v20+) + Electron
**Primary Dependencies**: React 18+, Tailwind CSS, GitHub REST API v3, Electron safeStorage
**Storage**: Local file system for skill directories, JSON for configuration, Electron safeStorage for encrypted PATs
**Testing**: Jest for unit tests, integration tests for critical workflows
**Target Platform**: Cross-platform desktop (Windows 10/11, macOS 12+, Linux Ubuntu 20.04+)
**Project Type**: Desktop application (Electron)
**Performance Goals**:
  - Repository configuration and connection test: <5 seconds
  - Skill list loading: ≤5 seconds for up to 100 skills
  - Skill installation: <10 seconds for directories under 1MB
  - Update detection: 100% accuracy via directory commit SHA comparison
  - Memory footprint: <300 MB total application
**Constraints**:
  - Cross-platform compatibility (Windows/macOS/Linux)
  - Secure credential storage (no plaintext PATs)
  - HTTPS-only external communication
  - GitHub API rate limits (5000 requests/hour with PAT)
  - Maximum 5 directory levels deep for scanning
**Scale/Scope**:
  - Multiple private repositories per user
  - Up to 500 skills per repository (pagination required for large repos)
  - Skill directories typically under 1MB total size

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User-Centric Design ✅
- **Status**: PASS
- **Justification**: Feature directly addresses real pain point identified in requirements: "lack of team sharing" and "difficulty discovering community skills". All user stories have clear acceptance criteria and immediate feedback mechanisms (loading states, success/error notifications).

### II. Security First (NON-NEGOTIABLE) ✅
- **Status**: PASS
- **Justification**:
  - PAT encryption using Electron safeStorage (FR-002)
  - All file operations validate paths (existing security requirement)
  - HTTPS-only GitHub API communication
  - Delete operations use system recycle bin (existing pattern)
  - API requests proxied through backend, never exposing credentials to frontend

### III. Performance Excellence ✅
- **Status**: PASS
- **Justification**: All performance targets explicitly defined in Success Criteria (SC-001 through SC-008):
  - Configuration: <5s
  - List loading: ≤5s for 100 skills
  - Installation: <10s for <1MB
  - Memory: <300 MB total (existing constraint)
  - 5-minute caching for private repo skill lists (FR-014)

### IV. AI-Assisted Development ⚠️
- **Status**: NOT APPLICABLE
- **Justification**: This feature does not involve AI-assisted skill generation. It focuses on private repository integration, skill browsing, installation, and update tracking.

### V. Cross-Platform Compatibility ✅
- **Status**: PASS
- **Justification**:
  - Feature designed for Windows 10/11, macOS 12+, Linux Ubuntu 20.04+
  - Path handling uses platform-aware methods (path.join)
  - UI supports minimum 1024x768 resolution
  - File operations use existing cross-platform patterns

### VI. Modularity and Testability ✅
- **Status**: PASS
- **Justification**:
  - Clear separation: GitHubService for API, IPC handlers for communication, React components for UI
  - Service layer encapsulates business logic (thin IPC controller pattern)
  - Unit test coverage target ≥70% for core logic
  - Integration tests for critical user journeys (configure, browse, install, update)

### VII. Observability ✅
- **Status**: PASS
- **Justification**:
  - All critical operations logged (configuration changes, API calls, installation progress)
  - User-facing errors provide actionable guidance (e.g., "PAT expired. Please update in Settings.")
  - Performance metrics tracked for SLA compliance
  - Error messages include context and retry options

**Gate Result**: PASS - All constitutional requirements satisfied. Proceed to Phase 0.

## UI/UX Design Requirements

*For features with frontend components, follow the ui-ux-pro-max skill workflow:*

**Design Process** (MUST complete before frontend implementation):
1. **Product Research**: Desktop application dashboard with repository management, skill browsing, and installation workflows
2. **Style Research**: Professional, clean interface with clear visual hierarchy (matches existing app style: white/gray backgrounds, blue accents)
3. **Typography**: Consistent with existing application (system fonts, clear hierarchy)
4. **Color Palette**:
   - Repository cards: white backgrounds, gray-100 borders, gray-600 text
   - Selector dropdown: gray-50 background, gray-200 borders, blue-600 selected state
   - Update badges: amber-50 background, amber-700 text, pulse animation
   - Success indicators: emerald-500
   - Error indicators: red-500
5. **UX Patterns**:
   - Loading indicators during API calls
   - Clear error messages with retry options
   - Confirmation dialogs for destructive operations
   - Filter/search for skill lists
   - Responsive at 1024x768 minimum
6. **Stack Guidelines**: React functional components with hooks, Tailwind CSS utility classes, proper state management, accessible form controls

**Design Quality Standards** (MUST verify before implementation):
- [ ] No emoji icons (use SVG icons from Heroicons, Lucide, or Simple Icons)
- [ ] Stable hover states (no layout shifts, use color/opacity transitions)
- [ ] Correct brand logos (GitHub logo from official sources)
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
specs/005-private-repo-sync/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (to be created)
├── data-model.md        # Phase 1 output (to be created)
├── quickstart.md        # Phase 1 output (to be created)
├── contracts/           # Phase 1 output (to be created)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main/                    # Electron main process (backend)
│   ├── models/
│   │   ├── Skill.ts         # Existing skill model (extend with source metadata)
│   │   └── PrivateRepo.ts   # NEW: Private repository configuration model
│   ├── services/
│   │   ├── GitHubService.ts # Existing GitHub service (extend with private repo methods)
│   │   └── SkillService.ts  # Existing skill service (extend with installation tracking)
│   ├── ipc/
│   │   └── gitHubHandlers.ts # Existing IPC handlers (extend with private repo handlers)
│   └── utils/
│       └── encryption.ts    # NEW: Utility for PAT encryption/decryption
│
├── renderer/                # Electron renderer process (frontend)
│   ├── components/
│   │   ├── Settings.tsx     # Existing settings (extend with private repo config UI)
│   │   ├── PrivateRepoList.tsx    # NEW: Browse private repo skills
│   │   ├── PrivateRepoCard.tsx    # NEW: Individual repository card
│   │   ├── PrivateSkillCard.tsx   # NEW: Individual skill from private repo
│   │   └── InstallDialog.tsx      # Existing (reuse/adapt for private repo installation)
│   └── services/
│       └── api.ts           # Existing API service (extend with private repo methods)
│
└── shared/
    └── types.ts             # Shared TypeScript types (extend with private repo types)

tests/
├── unit/
│   ├── services/
│   │   ├── GitHubService.test.ts  # Unit tests for private repo methods
│   │   └── encryption.test.ts     # Unit tests for PAT encryption
│   └── models/
│       └── PrivateRepo.test.ts    # Unit tests for repository model
└── integration/
    ├── private-repo-config.test.ts    # E2E: Configure private repo
    ├── private-repo-browse.test.ts    # E2E: Browse and search skills
    ├── private-repo-install.test.ts   # E2E: Install skill directory
    └── private-repo-update.test.ts    # E2E: Detect and install updates
```

**Structure Decision**: Extend existing Electron application structure with new models, services, and components for private repository management. Reuse existing patterns from 002-local-skill-management and 004-public-skill-discovery to maintain consistency and share installation logic.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All constitutional requirements are satisfied.

---

## Post-Phase 1 Constitution Re-Check

*Re-evaluate constitutional compliance after completing Phase 1 design artifacts.*

### I. User-Centric Design ✅
- **Status**: PASS
- **Evidence**:
  - All 6 user stories have clear acceptance criteria and test scenarios
  - Quickstart guide provides step-by-step implementation focused on user workflows
  - Data model designed to track user-relevant metadata (source repo, install date, update status)
  - Error messages are actionable (e.g., "PAT expired. Please update in Settings.")

### II. Security First (NON-NEGOTIABLE) ✅
- **Status**: PASS
- **Evidence**:
  - Data model specifies PAT encryption requirement
  - IPC contract documents PAT handling (never exposed to renderer)
  - Quickstart includes encryption utility implementation with safeStorage
  - All file operations use path validation (existing pattern)
  - HTTPS-only GitHub API communication enforced

### III. Performance Excellence ✅
- **Status**: PASS
- **Evidence**:
  - Data model includes 5-minute caching strategy for skill lists
  - IPC contract specifies response time targets (e.g., <5s for skill list)
  - Research document identifies virtual scrolling for large lists
  - Update detection uses efficient SHA comparison (no full downloads)
  - Performance requirements match specification targets

### IV. AI-Assisted Development ⚠️
- **Status**: NOT APPLICABLE
- **Evidence**: Feature does not involve AI-assisted skill generation. Focus is on private repository integration, browsing, installation, and update tracking.

### V. Cross-Platform Compatibility ✅
- **Status**: PASS
- **Evidence**:
  - Research document specifies use of Node.js `path` module for cross-platform compatibility
  - Data model uses Date objects (platform-agnostic serialization)
  - Quickstart includes platform-specific error handling for safeStorage
  - Target platforms explicitly defined (Windows 10/11, macOS 12+, Linux Ubuntu 20.04+)

### VI. Modularity and Testability ✅
- **Status**: PASS
- **Evidence**:
  - Clear separation: PrivateRepo model, GitHubService extensions, IPC handlers, React components
  - Data model documentation includes testing considerations section
  - IPC contract defines unit test and integration test requirements
  - Quickstart provides test examples for each component
  - Service layer encapsulates business logic (thin IPC controller pattern)

### VII. Observability ✅
- **Status**: PASS
- **Evidence**:
  - IPC contract documents all error codes with user-friendly messages
  - Research document identifies logging requirements (configuration changes, API calls)
  - Data model tracks lastSyncTime for observability
  - Error handling includes retry options and clear guidance

**Final Gate Result**: PASS - All constitutional requirements satisfied after Phase 1 design.

---

## Generated Artifacts

### Phase 0: Research
- ✅ **research.md**: Technical research on Electron safeStorage, GitHub API patterns, update detection strategies, and React/Tailwind best practices

### Phase 1: Design & Contracts
- ✅ **data-model.md**: Entity definitions for PrivateRepo, PrivateSkill, and InstalledSkillMetadata with validation rules and data flow
- ✅ **contracts/ipc-interface.md**: Complete IPC channel definitions with parameters, returns, error codes, and security requirements
- ✅ **quickstart.md**: Developer implementation guide with code examples, testing strategies, and troubleshooting

### Next Steps
- Run `/speckit.tasks` to generate detailed implementation tasks
- Begin implementation following the quickstart guide
- Write tests as specified in each artifact

---

## Implementation Readiness Checklist

- [x] All NEEDS CLARIFICATION items resolved in research.md
- [x] Data models defined with validation rules
- [x] IPC interface contracts documented
- [x] Developer quickstart guide created
- [x] Constitution check passed (pre-Phase 0)
- [x] Constitution re-check passed (post-Phase 1)
- [x] Agent context updated with new technologies
- [ ] Tasks generated via `/speckit.tasks` command
- [ ] Implementation started

**Status**: Ready for task generation
