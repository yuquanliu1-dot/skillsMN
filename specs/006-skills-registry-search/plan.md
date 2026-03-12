# Implementation Plan: Skills Registry Search Integration

**Branch**: `006-skills-registry-search` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-skills-registry-search/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature refactors public skill search to use the skills.sh registry API for skill discovery instead of direct GitHub search. Users will search skills via the skills.sh API endpoint, view results with metadata (name, install count, source repository), and install skills by cloning the corresponding GitHub repository. This separates skill discovery (registry) from distribution (GitHub repositories), providing a more efficient and centralized search experience while maintaining git-based installation.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Electron, React 18.2+, Node.js 20 LTS, node-fetch for HTTP requests, Tailwind CSS for UI styling
**Storage**: Local file system (skills directories), temporary directories for git clones
**Testing**: Jest with ts-jest, @testing-library/jest-dom for React component testing
**Target Platform**: Desktop application (Windows 10/11, macOS 12+, Linux Ubuntu 20.04+)
**Project Type**: Desktop application (Electron app with separate main and renderer processes)
**Performance Goals**: Search results in <3s, Installation completion in <30s (excluding download), 1 API call per 400ms max (debounced)
**Constraints**: Git must be available in system PATH, skills.sh API must be publicly accessible, GitHub repositories must be public
**Scale/Scope**: Up to 20 search results per query, support for repositories containing multiple skills, handle concurrent installation requests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

**I. User-Centric Design**: ✅ PASS
- Feature directly addresses user pain point: discovering skills from a centralized registry
- Clear user stories with acceptance criteria defined
- Immediate feedback via debounced search and loading states

**II. Security First (NON-NEGOTIABLE)**: ✅ PASS
- No credential storage required (skills.sh API is public, GitHub repos are public)
- File operations validate paths within authorized directories (existing path validation utilities)
- HTTPS-only communication (skills.sh API and GitHub)
- Temporary files cleaned up after installation (success or failure)
- No API keys exposed to frontend

**III. Performance Excellence**: ✅ PASS
- Search results target: <3s (within spec)
- Debouncing ensures ≤1 API call per 400ms (prevents excessive load)
- Shallow git clone (depth=1) minimizes download time
- Performance metrics defined in success criteria

**IV. AI-Assisted Development**: N/A
- This feature does not involve AI generation or Claude Agent SDK integration

**V. Cross-Platform Compatibility**: ✅ PASS
- Feature uses platform-agnostic technologies (TypeScript, Node.js, git)
- Path handling uses existing platform-aware utilities
- No platform-specific code required

**VI. Modularity and Testability**: ✅ PASS
- Clear separation: Registry service (search), Git operations (installation), UI components
- Business logic can be unit tested independently
- IPC handlers will delegate to testable service functions

**VII. Observability**: ✅ PASS
- Logging required for: API calls, git operations, file system operations, errors
- User-facing errors will provide actionable guidance
- Performance tracking for search and installation operations

**Performance Standards**: ✅ PASS
- Targets align with constitution requirements (startup <3s, file operations <100ms)
- No synchronous operations in hot paths

**Security Requirements**: ✅ PASS
- Path validation will use existing PathValidator service
- HTTPS-only communication
- Temporary file cleanup required

**Development Workflow**: ✅ PASS
- TypeScript with strict mode
- Clear separation of models, services, IPC handlers
- Unit tests required for core business logic (≥70% coverage target)

**UI/UX Design**: ✅ PASS (will use ui-ux-pro-max skill)
- Frontend search interface requires design guidance
- Must follow skill recommendations for desktop application UI patterns
- Will research: search UX patterns, result display layouts, loading states, error handling UI

### Constitution Check Result: ✅ PASS - No violations detected

All constitutional requirements are satisfied. Feature can proceed to Phase 0 research.

## UI/UX Design Requirements

*For features with frontend components, follow the ui-ux-pro-max skill workflow:*

**Design Process** (MUST complete before frontend implementation):
1. **Product Research**: Search for desktop application search UI patterns, skill/package manager interfaces
2. **Style Research**: Search for minimalism and professional desktop app design guidelines
3. **Typography**: Search for font pairings appropriate for desktop developer tools
4. **Color Palette**: Search for color palettes for developer tools / productivity applications
5. **UX Patterns**: Search for search UX best practices (instant search, debouncing feedback, loading states, empty states)
6. **Stack Guidelines**: Search for React + Tailwind CSS specific patterns for search interfaces

**Design Quality Standards** (MUST verify before implementation):
- [ ] No emoji icons (use SVG icons from Heroicons, Lucide, or Simple Icons)
- [ ] Stable hover states (no layout shifts, use color/opacity transitions)
- [ ] Correct brand logos (verified from official sources - skills.sh branding if available)
- [ ] Consistent icon sizing (24x24 viewBox with w-6 h-6 classes)
- [ ] Cursor pointer on all interactive elements
- [ ] Smooth transitions (150-300ms, avoid >500ms)
- [ ] Light/dark mode contrast (4.5:1 minimum for text)
- [ ] Responsive at 1024x768 minimum resolution
- [ ] Accessibility compliance (alt text, labels, keyboard navigation)

**Performance Requirements**:
- UI interactions MUST complete within 100ms
- Search result list MUST handle 20+ items efficiently
- No synchronous operations in hot paths
- Proper error boundaries and loading states

## Project Structure

### Documentation (this feature)

```text
specs/006-skills-registry-search/
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
├── main/
│   ├── models/
│   │   ├── SearchSkillResult.ts          # Data model for registry search results
│   │   ├── InstallFromRegistryRequest.ts # Request model for installation
│   │   └── SkillSource.ts                # Metadata for installed skill source
│   ├── services/
│   │   ├── RegistryService.ts            # Service for skills.sh API calls
│   │   └── SkillInstaller.ts             # Service for git clone and installation
│   ├── ipc/
│   │   └── registryHandlers.ts           # IPC handlers for frontend-backend communication
│   └── utils/
│       ├── gitOperations.ts              # Git clone and repository utilities
│       └── skillDiscovery.ts             # Find skill directories in cloned repos
├── renderer/
│   ├── components/
│   │   ├── RegistrySearch.tsx            # Main search interface component
│   │   ├── SearchResultsList.tsx         # Display search results
│   │   ├── SkillResultCard.tsx           # Individual search result card
│   │   └── InstallDialog.tsx             # Tool selection dialog
│   ├── services/
│   │   └── registryClient.ts             # Frontend IPC client for registry operations
│   └── hooks/
│       └── useRegistrySearch.ts          # React hook for search with debounce
└── shared/
    └── types.ts                          # Shared type definitions

tests/
├── unit/
│   ├── RegistryService.test.ts           # Unit tests for registry API calls
│   ├── SkillInstaller.test.ts            # Unit tests for installation logic
│   └── skillDiscovery.test.ts            # Unit tests for skill directory discovery
└── integration/
    └── registry-search-install.test.ts   # End-to-end test of search → install flow
```

**Structure Decision**: This feature follows the existing Electron app architecture with clear separation between main process (backend services, IPC handlers) and renderer process (React components, UI logic). The structure aligns with the existing codebase organization and maintains modularity.

## Complexity Tracking

> **No violations detected - Constitution Check passed without issues**

No complexity tracking required as all constitutional gates were passed without violations.

---

## Planning Artifacts Generated

### Phase 0: Research (✅ Complete)

**File**: [research.md](./research.md)

**Key Decisions**:
1. **API Integration**: Use node-fetch for HTTP requests to skills.sh API
2. **Git Operations**: Use child_process.exec() for shallow git clones
3. **Skill Discovery**: Recursive directory search with SKILL.md detection
4. **Debouncing**: Custom React hook with 400ms delay
5. **Temporary Files**: OS temp directory with UUID-based naming
6. **Error Messages**: User-friendly messages with error codes
7. **Metadata Storage**: .source.json file in skill directory

**All NEEDS CLARIFICATION items resolved** - No clarifications required

### Phase 1: Design & Contracts (✅ Complete)

**Data Model**: [data-model.md](./data-model.md)
- SearchSkillResult: Registry search result entity
- InstallFromRegistryRequest: Installation request entity
- SkillSource: Source tracking metadata
- SearchSkillsResponse: API response wrapper
- Validation functions for all entities
- Data flow diagrams for search and installation

**Contracts**:
1. [contracts/ipc-contract.md](./contracts/ipc-contract.md)
   - `registry:search` - Search for skills
   - `registry:install` - Install a skill
   - `registry:check-installed` - Check installation status
   - Progress events for installation feedback

2. [contracts/api-contract.md](./contracts/api-contract.md)
   - skills.sh API endpoint specification
   - Request/response formats
   - Error handling strategies
   - Rate limiting implementation

3. [contracts/git-operations-contract.md](./contracts/git-operations-contract.md)
   - Shallow clone operations
   - Skill directory discovery patterns
   - Error handling and recovery
   - Security considerations

**Quickstart Guide**: [quickstart.md](./quickstart.md)
- Prerequisites and setup
- Implementation order (backend → IPC → frontend)
- Step-by-step code examples
- Testing strategy
- Debugging tips
- Common issues and solutions

### Agent Context Update (✅ Complete)

**Updated**: CLAUDE.md
**Added Technologies**:
- TypeScript 5.x (strict mode)
- Electron framework
- React 18.2+
- Tailwind CSS
- node-fetch for HTTP requests
- Jest testing framework
- Git operations

### Constitution Re-Check (Post-Design) (✅ Complete)

All constitutional requirements validated after design phase:
- ✅ User-Centric Design: Clear user stories and acceptance criteria
- ✅ Security First: HTTPS-only, path validation, no credential exposure
- ✅ Performance Excellence: <3s search, <30s install, debounced input
- ✅ AI-Assisted Development: N/A (not applicable to this feature)
- ✅ Cross-Platform Compatibility: Platform-agnostic TypeScript/Node.js
- ✅ Modularity and Testability: Clear separation of concerns
- ✅ Observability: Comprehensive logging and error tracking
- ✅ Performance Standards: Meets all performance targets
- ✅ Security Requirements: All security gates passed
- ✅ Development Workflow: TypeScript strict mode, ≥70% test coverage
- ✅ UI/UX Design: Will use ui-ux-pro-max skill for frontend implementation

**Result**: ✅ PASS - Ready to proceed to Phase 2 (Task Generation)

---

## Next Steps

The planning phase is **complete**. All artifacts have been generated and validated.

### Immediate Next Steps

1. **Run `/speckit.tasks`** to generate implementation tasks
   - This will create `specs/006-skills-registry-search/tasks.md`
   - Tasks will be ordered by dependency
   - Each task will have clear acceptance criteria

2. **Review Generated Artifacts**:
   - Review [research.md](./research.md) for technical decisions
   - Review [data-model.md](./data-model.md) for entity definitions
   - Review contracts for interface specifications
   - Review [quickstart.md](./quickstart.md) for implementation guide

3. **Begin Implementation** (after task generation):
   - Follow task order in tasks.md
   - Implement backend services first
   - Add IPC layer
   - Implement frontend components
   - Write tests as you go

### Implementation Timeline (Estimated)

- **Backend Models & Services**: 1-2 days
- **IPC Layer**: 1 day
- **Frontend (with UI/UX design)**: 1-2 days
- **Testing & Integration**: 1 day
- **Total**: 4-6 days

### Key Deliverables

- [ ] Data models with validation (SearchSkillResult, InstallFromRegistryRequest, SkillSource)
- [ ] RegistryService for skills.sh API integration
- [ ] GitOperations for shallow cloning
- [ ] SkillDiscovery for directory detection
- [ ] SkillInstaller for complete installation flow
- [ ] IPC handlers for frontend-backend communication
- [ ] Frontend React components (with ui-ux-pro-max design)
- [ ] Comprehensive test suite (≥70% coverage)
- [ ] Documentation updates

---

## Success Metrics

The feature will be considered complete when:

1. ✅ All tasks in tasks.md completed and tested
2. ✅ Search returns results from skills.sh in <3 seconds
3. ✅ Installation completes in <30 seconds (excluding network time)
4. ✅ All error scenarios handled with user-friendly messages
5. ✅ Temporary files cleaned up 100% of the time
6. ✅ Unit test coverage ≥70% for core logic
7. ✅ Integration tests pass for full search → install flow
8. ✅ Manual testing completed on Windows, macOS, and Linux
9. ✅ UI follows ui-ux-pro-max design guidelines
10. ✅ Documentation updated and reviewed

---

## Planning Completion Summary

**Status**: ✅ **COMPLETE**

**Artifacts Generated**:
- ✅ plan.md (this file)
- ✅ research.md (Phase 0)
- ✅ data-model.md (Phase 1)
- ✅ contracts/ipc-contract.md (Phase 1)
- ✅ contracts/api-contract.md (Phase 1)
- ✅ contracts/git-operations-contract.md (Phase 1)
- ✅ quickstart.md (Phase 1)
- ✅ CLAUDE.md updated (agent context)

**Constitution Gates**: ✅ All passed

**Ready For**: `/speckit.tasks` command to generate implementation tasks

**Planning Date**: 2026-03-12
**Estimated Implementation Start**: After task generation
**Estimated Completion**: 4-6 days from implementation start
