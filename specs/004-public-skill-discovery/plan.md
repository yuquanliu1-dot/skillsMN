# Implementation Plan: Public Skill Discovery

**Branch**: `004-public-skill-discovery` | **Date**: 2026-03-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-public-skill-discovery/spec.md`

## Summary

Enable users to search GitHub for public skill directories (directories containing `skill.md` files), preview skill content and directory structure, and install skills to local directories. Uses GitHub Code Search API to find skill directories, Git Data API to enumerate and download skill directory contents, and implements conflict resolution for installation.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Node.js LTS (v20+)
**Primary Dependencies**: Electron, React 18+, Tailwind CSS, GitHub REST API v3, Monaco Editor
**Storage**: Local file system (skill directories with `skill.md` files), Electron safeStorage (GitHub PAT)
**Testing**: Jest (unit tests), Playwright/Spectron (integration tests for Electron)
**Target Platform**: Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+) - Desktop application
**Project Type**: Desktop application (Electron)
**Performance Goals**: Search <5s (95th percentile), Preview <3s (files <500KB), Install <10s (dirs <1MB), UI interactions <100ms
**Constraints**: GitHub API rate limits (60/hr unauthenticated, 5000/hr with PAT), HTTPS-only, Network-dependent operations, Memory <300MB
**Scale/Scope**: Support 500+ skill directories, Pagination (20 per page), Handle repos with 50+ skill directories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User-Centric Design ✅
- **Solves real pain point**: Discovering community skills (FR-001)
- **User stories**: 5 user stories with acceptance criteria (P1: Search, Preview, Install, Conflicts; P2: Curated Sources)
- **Immediate feedback**: Loading states, progress indicators, error messages (FR-007, FR-010)

### II. Security First (NON-NEGOTIABLE) ✅
- **Credential encryption**: GitHub PAT stored via safeStorage (FR-010)
- **Path validation**: Validate target directories for installation (FR-006)
- **HTTPS-only**: All GitHub API and download requests use HTTPS (FR-015)
- **No permanent deletion**: Conflicts use overwrite/skip, not permanent delete (FR-008)
- **API key protection**: GitHub PAT used in backend only, never exposed to frontend

### III. Performance Excellence ✅
- **Search**: <5 seconds for 95% of queries (SC-001)
- **Preview**: <3 seconds for files <500KB (SC-002)
- **Install**: <10 seconds for dirs <1MB (SC-003)
- **Debounce**: 500ms debounce prevents >80% unnecessary API calls (SC-005, FR-002)
- **Memory**: <300MB footprint (constitution requirement)

### IV. AI-Assisted Development ❌ N/A
- No AI generation features in this spec
- Integration with 003-ai-skill-generation not required

### V. Cross-Platform Compatibility ✅
- **Platforms**: Windows 10/11, macOS 12+, Linux Ubuntu 20.04+ (constitution requirement)
- **Resolution**: Minimum 1024x768 with proper scaling (UI-001 to UI-007)
- **Path handling**: Use path.join for all file operations (FR-006)

### VI. Modularity and Testability ✅
- **Frontend/Backend separation**: Clear IPC interfaces for GitHub operations
- **Unit test coverage**: ≥70% for core logic (GitHubService, search logic, download logic)
- **Thin IPC handlers**: Delegates to GitHubService methods

### VII. Observability ✅
- **Logging**: All GitHub API calls, errors, download operations logged
- **Error messages**: Actionable guidance for rate limits, network failures, 404s (FR-010)
- **Performance tracking**: Search, preview, install operations tracked

**Gate Status**: ✅ PASS - All constitution checks pass. No violations to justify.

## UI/UX Design Requirements

*For features with frontend components, follow the ui-ux-pro-max skill workflow:*

**Design Process** (MUST complete before frontend implementation):
1. **Product Research**: Desktop application with search/discovery functionality (similar to VS Code Extensions, npm search)
2. **Style Research**: Clean, professional interface with clear visual hierarchy (minimalism, professional)
3. **Typography**: Search for font pairings appropriate for desktop applications with code preview
4. **Color Palette**: Blue-600 accent for actions, gray scale for structure, white backgrounds for content areas
5. **UX Patterns**: Debounced search, pagination, preview panes, conflict dialogs, progress indicators
6. **Stack Guidelines**: React + Tailwind CSS component patterns for Electron desktop apps

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
specs/004-public-skill-discovery/
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
│   ├── models/
│   │   ├── SearchResult.ts    # Search result model
│   │   ├── CuratedSource.ts   # Curated source model
│   │   └── InstallRequest.ts  # Installation request model
│   ├── services/
│   │   └── GitHubService.ts   # GitHub API integration (search, download)
│   ├── ipc/
│   │   └── gitHubHandlers.ts  # IPC handlers for GitHub operations
│   └── utils/
│       └── downloadUtils.ts   # Directory download utilities
├── renderer/                  # Electron renderer process (frontend)
│   ├── components/
│   │   ├── SearchPanel.tsx    # Main search interface
│   │   ├── SearchResultCard.tsx # Individual search result card
│   │   ├── SkillPreview.tsx   # Preview modal with file tree and content
│   │   ├── InstallDialog.tsx  # Installation dialog
│   │   ├── ConflictResolutionDialog.tsx # Conflict handling dialog
│   │   └── Sidebar.tsx        # Curated sources sidebar
│   ├── services/
│   │   └── githubClient.ts    # GitHub API client (frontend)
│   └── styles/
│       └── search.css         # Search-specific styles
└── shared/
    └── types.ts               # Shared TypeScript types

tests/
├── unit/
│   ├── GitHubService.test.ts  # Unit tests for GitHub service
│   └── downloadUtils.test.ts  # Unit tests for download utilities
└── integration/
    └── search-install.test.ts # End-to-end search and install tests
```

**Structure Decision**: Using Option 1 (Single project) with Electron main/renderer split. This follows the existing project structure established in features 001-003. Frontend components in `src/renderer/components/`, backend services in `src/main/services/`, and IPC handlers in `src/main/ipc/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution checks pass.
