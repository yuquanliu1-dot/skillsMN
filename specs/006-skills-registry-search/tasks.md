# Tasks: Skills Registry Search Integration

**Input**: Design documents from `/specs/006-skills-registry-search/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the feature specification. Unit tests will be created as part of implementation tasks to meet the ≥70% coverage requirement defined in plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions
- **Subtask IDs**: Some tasks use subtask notation (e.g., T023a, T023b, T023c). These represent sequential substeps of a logical task:
  - Subtasks share the same base ID (T023)
  - Each subtask has a letter suffix (a, b, c) indicating order
  - [P] marker on a subtask applies only to that subtask, not the parent group
  - Subtasks should be completed in order (a → b → c)
  - Example: T023a [P] (research), T023b (implement), T023c (verify)

## Path Conventions

This is an **Electron desktop application** with:
- **Backend (main process)**: `src/main/` (models, services, utils, ipc)
- **Frontend (renderer process)**: `src/renderer/` (components, services, hooks)
- **Shared code**: `src/shared/`
- **Tests**: `tests/` (unit, integration)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create directory structure for registry search feature per plan.md
- [ ] T002 [P] Update shared types in src/shared/types.ts with registry-related interfaces
- [ ] T003 [P] Configure environment variables for skills.sh API base URL

**UI/UX Design Phase** (Required before frontend implementation):
- [ ] T004 [P] UI/UX Research: Use ui-ux-pro-max skill to search for desktop app search UI patterns, skill/package manager interfaces, minimalism design, typography for developer tools, color palettes, and search UX best practices
- [ ] T005 UI/UX Design: Document design specifications for search interface following ui-ux-pro-max recommendations
- [ ] T006 Verify design meets quality standards (SVG icons, stable hover states, proper contrast 4.5:1, cursor pointer on interactive elements, responsive at 1024x768, accessibility)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and shared models that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared Data Models

- [ ] T007 [P] Create SearchSkillResult interface with validation in src/main/models/SearchSkillResult.ts
- [ ] T008 [P] Create SearchSkillsResponse interface with validation in src/main/models/SearchSkillsResponse.ts
- [ ] T009 [P] Create InstallFromRegistryRequest interface with validation in src/main/models/InstallFromRegistryRequest.ts
- [ ] T010 [P] Create SkillSource interface with factory function in src/main/models/SkillSource.ts

### Shared Utilities

- [ ] T011 [P] Create gitOperations utility for shallow cloning in src/main/utils/gitOperations.ts
- [ ] T012 [P] Create skillDiscovery utility for finding SKILL.md files in src/main/utils/skillDiscovery.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Search for Skills (Priority: P1) 🎯 MVP

**Goal**: Enable users to search for skills via skills.sh API and view search results with metadata

**Independent Test**: Enter search queries in the UI and verify that results are returned from skills.sh API with correct metadata (name, installs, source), debounced by 400ms

### Backend Implementation for User Story 1

- [ ] T013 [US1] Implement RegistryService with search method in src/main/services/RegistryService.ts
- [ ] T014 [US1] Add HTTP client configuration with 10-second timeout and error handling in RegistryService
- [ ] T015 [US1] Implement response validation and filtering for SearchSkillResult array in RegistryService
- [ ] T016 [US1] Add logging for API requests and responses in RegistryService
- [ ] T017 [US1] Create registry:search IPC handler in src/main/ipc/registryHandlers.ts
- [ ] T018 [US1] Add input validation for search query in registryHandlers.ts
- [ ] T019 [US1] Register registry IPC handlers in src/main/index.ts

### Frontend Implementation for User Story 1

- [ ] T020 [US1] Create registryClient service for IPC communication in src/renderer/services/registryClient.ts
- [ ] T021 [US1] Create useRegistrySearch hook with 400ms debounce in src/renderer/hooks/useRegistrySearch.ts
- [ ] T022 [US1] Implement search state management (query, results, loading, error) in useRegistrySearch hook

### UI Components for User Story 1

- [ ] T023a [P] [US1] Search UI/UX patterns for search input components using ui-ux-pro-max skill
- [ ] T023b [US1] Implement RegistrySearch component with search input in src/renderer/components/RegistrySearch.tsx following ui-ux-pro-max design
- [ ] T023c [US1] Verify RegistrySearch UI quality: SVG search icon (no emoji), loading spinner, error display, proper focus management

- [ ] T024a [P] [US1] Search UI/UX patterns for result list components using ui-ux-pro-max skill
- [ ] T024b [US1] Implement SearchResultsList component in src/renderer/components/SearchResultsList.tsx following ui-ux-pro-max design
- [ ] T024c [US1] Verify SearchResultsList UI quality: virtual scrolling for 20+ items, stable hover states, cursor pointer

- [ ] T025a [P] [US1] Search UI/UX patterns for result card components using ui-ux-pro-max skill
- [ ] T025b [US1] Implement SkillResultCard component showing name, installs, source in src/renderer/components/SkillResultCard.tsx following ui-ux-pro-max design
- [ ] T025c [US1] Verify SkillResultCard UI quality: proper contrast, smooth transitions 150-300ms, hover feedback

- [ ] T026 [US1] Add "No results found" empty state in SearchResultsList component
- [ ] T027 [US1] Integrate RegistrySearch, SearchResultsList, and SkillResultCard components
- [ ] T028 [US1] Update preload script to expose registrySearch IPC method in src/main/preload.ts
- [ ] T029 [US1] Add unit tests for RegistryService in tests/unit/RegistryService.test.ts

**Checkpoint**: User Story 1 complete - search functionality fully working and testable independently

---

## Phase 4: User Story 2 - Install a Discovered Skill (Priority: P1)

**Goal**: Enable users to install discovered skills by cloning GitHub repositories and copying to target tool directories

**Independent Test**: Search for a skill, click Install, select a target tool, and verify that the skill is cloned from GitHub and appears in the tool's skill directory with correct metadata

### Backend Implementation for User Story 2

- [ ] T030 [US2] Implement SkillInstaller service in src/main/services/SkillInstaller.ts
- [ ] T031 [US2] Add installFromRegistry method with temp directory creation in SkillInstaller
- [ ] T032 [US2] Integrate gitOperations.shallowClone into SkillInstaller installation flow
- [ ] T033 [US2] Integrate skillDiscovery.findSkillDirectory into SkillInstaller to locate SKILL.md
- [ ] T034 [US2] Implement skill directory copy with slugified naming in SkillInstaller
- [ ] T035 [US2] Implement .source.json metadata writing in SkillInstaller using SkillSource model
- [ ] T036 [US2] Add temporary directory cleanup with try-finally pattern in SkillInstaller
- [ ] T037 [US2] Implement progress callback mechanism for installation stages in SkillInstaller
- [ ] T038 [US2] Add logging for installation operations and errors in SkillInstaller
- [ ] T039 [US2] Create registry:install IPC handler in src/main/ipc/registryHandlers.ts
- [ ] T040 [US2] Create registry:check-installed IPC handler in src/main/ipc/registryHandlers.ts
- [ ] T041 [US2] Create registry:install:progress event channel in registryHandlers.ts
- [ ] T042 [US2] Add input validation for InstallFromRegistryRequest in registryHandlers.ts

### Frontend Implementation for User Story 2

- [ ] T043 [US2] Add install and checkInstalled methods to registryClient in src/renderer/services/registryClient.ts
- [ ] T044 [US2] Add onInstallProgress event listener to registryClient

### UI Components for User Story 2

- [ ] T045a [P] [US2] Search UI/UX patterns for modal/dialog components using ui-ux-pro-max skill
- [ ] T045b [US2] Implement InstallDialog component with tool selection in src/renderer/components/InstallDialog.tsx following ui-ux-pro-max design
- [ ] T045c [US2] Verify InstallDialog UI quality: proper focus trap, keyboard navigation, cancel/confirm actions

- [ ] T046 [US2] Add "Install" button to SkillResultCard component that opens InstallDialog
- [ ] T047 [US2] Implement installation progress display with loading state and progress messages
- [ ] T048 [US2] Add "Already installed" indicator to SkillResultCard using checkInstalled
- [ ] T049 [US2] Update preload script to expose registryInstall and registryCheckInstalled IPC methods in src/main/preload.ts
- [ ] T050 [US2] Add unit tests for SkillInstaller in tests/unit/SkillInstaller.test.ts
- [ ] T051 [US2] Add unit tests for skillDiscovery in tests/unit/skillDiscovery.test.ts
- [ ] T052 [US2] Add integration test for search → install → verify flow in tests/integration/registry-search-install.test.ts

**Checkpoint**: User Stories 1 AND 2 complete - full discover-install workflow working independently

---

## Phase 5: User Story 3 - View Skill Details Before Installation (Priority: P2)

**Goal**: Enable users to view detailed skill information on skills.sh before installing

**Independent Test**: Click on a skill name and verify that https://skills.sh/{source}/{skillId} opens in a new browser tab

### Implementation for User Story 3

- [ ] T053 [US3] Add skill details link to SkillResultCard component in src/renderer/components/SkillResultCard.tsx
- [ ] T054 [US3] Implement external link handler to open https://skills.sh/{source}/{skillId} in new tab
- [ ] T055 [US3] Add visual indicator for clickable skill name (cursor pointer, hover state)
- [ ] T056 [US3] Verify link opens correctly with proper URL encoding for source and skillId

**Checkpoint**: User Story 3 complete - skill details viewable before installation

---

## Phase 6: User Story 4 - Handle Installation Errors Gracefully (Priority: P2)

**Goal**: Provide clear, actionable error messages for all installation failure scenarios

**Independent Test**: Attempt to install skills with various failure scenarios (invalid repo, missing SKILL.md, network errors, git not found) and verify that appropriate user-friendly error messages are displayed

### Backend Implementation for User Story 4

- [ ] T057 [P] [US4] Add git not found error detection in src/main/utils/gitOperations.ts
- [ ] T058 [P] [US4] Add repository not found error detection in gitOperations.ts
- [ ] T059 [P] [US4] Add private repository error detection in gitOperations.ts
- [ ] T060 [P] [US4] Add network error detection in gitOperations.ts
- [ ] T061 [P] [US4] Add disk space error detection in gitOperations.ts
- [ ] T062 [US4] Implement user-friendly error message mapping in gitOperations.ts with ERROR_MESSAGES constant
- [ ] T063 [US4] Add invalid skill error detection (missing SKILL.md) in src/main/utils/skillDiscovery.ts
- [ ] T064 [US4] Add error logging with full context in SkillInstaller
- [ ] T065 [US4] Enhance registry:install IPC handler with error type propagation

### Frontend Implementation for User Story 4

- [ ] T066 [US4] Implement error display component with actionable messages in InstallDialog
- [ ] T067 [US4] Add retry button for transient errors (network, timeout)
- [ ] T068 [US4] Add user guidance for each error type (install Git, check network, etc.)
- [ ] T069 [US4] Implement error boundary for search failures in RegistrySearch component
- [ ] T070 [US4] Add user-friendly search error messages (API down, timeout, invalid response)

**Checkpoint**: User Story 4 complete - all error scenarios handled with user-friendly messages

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality checks

### Documentation

- [ ] T071 [P] Update README.md with registry search feature documentation
- [ ] T072 [P] Create user guide for searching and installing skills from registry
- [ ] T073 [P] Document registry API integration and error codes

### Testing & Quality

- [ ] T074 [P] Add unit tests for gitOperations in tests/unit/gitOperations.test.ts
- [ ] T075 [P] Achieve ≥70% unit test coverage for core business logic (RegistryService, SkillInstaller, skillDiscovery)
- [ ] T076 Run full integration test suite for search → install → verify flow
- [ ] T077 Manual testing: Search with various query types (short, long, special characters)
- [ ] T078 Manual testing: Install skills from single-skill repositories
- [ ] T079 Manual testing: Install skills from multi-skill repositories
- [ ] T080 Manual testing: Verify temporary file cleanup on success and failure
- [ ] T081 Manual testing: Test all error scenarios (network, git not found, private repo, invalid skill)

### Cross-Platform Testing

- [ ] T082 [P] Test on Windows 10/11
- [ ] T083 [P] Test on macOS 12+
- [ ] T084 [P] Test on Linux (Ubuntu 20.04+)

### UI/UX Quality Assurance

- [ ] T085 UI/UX audit: Verify all components follow ui-ux-pro-max quality standards
- [ ] T086 Verify no emoji icons used (SVG icons only from Heroicons, Lucide, Simple Icons)
- [ ] T087 Verify stable hover states (no layout shifts, color/opacity transitions only)
- [ ] T088 Verify consistent icon sizing (24x24 viewBox with w-6 h-6 classes)
- [ ] T089 Verify cursor pointer on all interactive elements
- [ ] T090 Verify smooth transitions (150-300ms, no >500ms transitions)
- [ ] T091 Verify light/dark mode contrast (4.5:1 minimum for text)
- [ ] T092 Verify responsive at 1024x768 minimum resolution
- [ ] T093 Accessibility review: keyboard navigation, alt text, ARIA labels
- [ ] T094 Performance testing: Search results in <3s, Installation in <30s (excluding download)
- [ ] T095 Performance testing: UI interactions complete within 100ms
- [ ] T096 Performance testing: Search result list handles 20+ items efficiently

### Security & Performance

- [ ] T097 Verify HTTPS-only communication for skills.sh API
- [ ] T098 Verify path validation for all file operations
- [ ] T099 Verify temporary files cleaned up 100% of the time
- [ ] T100 Performance profiling: log API response times and installation durations
- [ ] T101 Memory profiling: verify no memory leaks during repeated search/install operations

### Final Validation

- [ ] T102 Run quickstart.md validation to ensure all steps work
- [ ] T103 Verify all acceptance scenarios from spec.md user stories
- [ ] T104 Code cleanup and refactoring for maintainability
- [ ] T105 Final review against constitution requirements

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (US1): Can start after Phase 2 - No dependencies on other stories
  - User Story 2 (US2): Can start after Phase 2 - Independent but integrates with US1 components
  - User Story 3 (US3): Can start after Phase 2 - Enhances US1 components
  - User Story 4 (US4): Can start after Phase 2 - Enhances US2 error handling
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - Fully independent, delivers MVP
- **User Story 2 (P1)**: Can start after Phase 2 - Independent testability, but UI integrates with US1
- **User Story 3 (P2)**: Can start after Phase 2 - Enhances US1 SkillResultCard component
- **User Story 4 (P2)**: Can start after Phase 2 - Enhances US2 error handling

### Within Each User Story

- Models before services (foundational phase)
- Services before IPC handlers
- IPC handlers before frontend clients
- Frontend clients before UI components
- Core implementation before integration
- Unit tests can be written:
  - **TDD approach**: Write tests before implementation (recommended for core services)
  - **Parallel approach**: Write tests alongside implementation
  - **Post-implementation**: Write tests after feature is working
  - Choose approach based on team preference and task complexity
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003, T004 can run in parallel (different files)

**Phase 2 (Foundational)**:
- T007-T012 can all run in parallel (different model/utility files)

**Phase 3 (User Story 1)**:
- All foundational models (T007-T010) created in Phase 2, can proceed to services immediately
- T023a, T024a, T025a (UI research) can run in parallel (different component types)

**Phase 4 (User Story 2)**:
- T050, T051 can run in parallel (different test files)
- T045a (UI research) can run in parallel with backend work

**Phase 6 (User Story 4)**:
- T057-T061 can run in parallel (different error detection implementations)

**Phase 7 (Polish)**:
- T071-T074 can run in parallel (different documentation/test files)
- T082-T084 can run in parallel (different platforms)
- Many polish tasks can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all foundational models together:
Task: "Create SearchSkillResult interface in src/main/models/SearchSkillResult.ts"
Task: "Create SearchSkillsResponse interface in src/main/models/SearchSkillsResponse.ts"
Task: "Create InstallFromRegistryRequest interface in src/main/models/InstallFromRegistryRequest.ts"
Task: "Create SkillSource interface in src/main/models/SkillSource.ts"

# Launch UI research tasks together:
Task: "UI/UX patterns for search input components using ui-ux-pro-max skill"
Task: "UI/UX patterns for result list components using ui-ux-pro-max skill"
Task: "UI/UX patterns for result card components using ui-ux-pro-max skill"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T012) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T013-T029)
4. **STOP and VALIDATE**: Test search functionality independently
5. Deploy/demo if ready - Users can search and discover skills

### Core Value Delivery (User Stories 1 + 2)

1. Complete MVP (above)
2. Complete Phase 4: User Story 2 (T030-T052)
3. **STOP and VALIDATE**: Test full search → install workflow
4. Deploy/demo - Users can discover and install skills (full core value)

### Complete Feature (All User Stories)

1. Complete Core Value (above)
2. Complete Phase 5: User Story 3 (T053-T056)
3. Complete Phase 6: User Story 4 (T057-T070)
4. Complete Phase 7: Polish (T071-T105)
5. Final validation and release

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 + Phase 2 together (foundational)
2. Once Phase 2 is done:
   - Developer A: User Story 1 (T013-T029)
   - Developer B: User Story 2 (T030-T052) - can start backend in parallel
   - Developer C: User Story 3 (T053-T056) - can start in parallel
   - Developer D: User Story 4 (T057-T070) - can start in parallel
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label (US1, US2, US3, US4) maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- UI/UX design tasks (T004-T006) MUST complete before frontend implementation
- All UI components must follow ui-ux-pro-max design recommendations
- Target ≥70% unit test coverage for core business logic
- All temporary files must be cleaned up (success or failure)
- All errors must have user-friendly messages with actionable guidance

---

## Task Count Summary

- **Phase 1 (Setup)**: 6 tasks
- **Phase 2 (Foundational)**: 6 tasks
- **Phase 3 (User Story 1)**: 17 tasks (includes 3 UI design subtasks)
- **Phase 4 (User Story 2)**: 23 tasks (includes 1 UI design subtask)
- **Phase 5 (User Story 3)**: 4 tasks
- **Phase 6 (User Story 4)**: 14 tasks
- **Phase 7 (Polish)**: 35 tasks

**Total**: 105 tasks

**Parallel Opportunities**: 42 tasks marked with [P] can run in parallel

**MVP Scope**: Phases 1-3 (29 tasks) delivers search functionality

**Core Value Scope**: Phases 1-4 (52 tasks) delivers search + install functionality
