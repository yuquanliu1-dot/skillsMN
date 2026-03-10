# Tasks: Claude Code Skill Management Center

**Input**: Design documents from `/specs/001-skill-manager/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ipc-contracts.md

**Tests**: Tests are NOT explicitly requested in the feature specification, so test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic Electron + React structure

- [ ] T001 Initialize Electron + TypeScript project structure with package.json and tsconfig.json
- [ ] T002 [P] Configure ESLint and Prettier for TypeScript strict mode in .eslintrc.json and .prettierrc
- [ ] T003 [P] Configure Tailwind CSS with dark mode support in tailwind.config.js
- [ ] T004 [P] Configure Jest with ts-jest for unit testing in jest.config.js
- [ ] T005 Create Electron main process entry point in src/main/index.ts
- [ ] T006 [P] Create Electron renderer HTML entry point in src/renderer/index.html
- [ ] T007 [P] Create React root component in src/renderer/App.tsx
- [ ] T008 Create shared types directory structure in src/shared/types/
- [ ] T009 [P] Configure Electron BrowserWindow with security settings (contextIsolation, sandbox) in src/main/index.ts
- [ ] T010 [P] Create preload script with IPC bridge in src/preload.ts

**UI/UX Design Phase** (Required before frontend implementation):
- [ ] T011 [P] UI/UX Research: Use ui-ux-pro-max skill to search for desktop application design patterns (skill management interfaces, code editors)
- [ ] T012 [P] UI/UX Research: Search for dark theme color palettes and typography for developer tools using ui-ux-pro-max skill
- [ ] T013 [P] UI/UX Research: Search for React + Tailwind CSS component patterns and accessibility guidelines using ui-ux-pro-max skill
- [ ] T014 Create design specification document in specs/001-skill-manager/design-spec.md with color palette, typography, and component styles

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared Models (Used by Multiple Stories)

- [ ] T015 [P] Create Skill model with validation in src/main/models/Skill.ts
- [ ] T016 [P] Create SkillDirectory model in src/main/models/SkillDirectory.ts
- [ ] T017 [P] Create Configuration model with validation in src/main/models/Configuration.ts
- [ ] T018 [P] Create IPC shared type definitions in src/shared/types/ipc.ts

### Core Services (Used by Multiple Stories)

- [ ] T019 [P] Implement PathValidator service for security in src/main/services/PathValidator.ts
- [ ] T020 [P] Implement ConfigService for configuration management in src/main/services/ConfigService.ts
- [ ] T021 [P] Implement utility functions for crypto (credential hashing) in src/main/utils/crypto.ts
- [ ] T022 [P] Implement utility functions for path operations in src/main/utils/pathUtils.ts

### IPC Infrastructure

- [ ] T023 Create IPC handler registration system in src/main/ipc/index.ts
- [ ] T024 [P] Create type-safe IPC client for renderer in src/renderer/services/ipcClient.ts

### Frontend Infrastructure

- [ ] T025 [P] Create base layout component with dark theme in src/renderer/components/Layout.tsx
- [ ] T026 [P] Create error boundary component in src/renderer/components/ErrorBoundary.tsx
- [ ] T027 [P] Create toast notification system in src/renderer/components/Toast.tsx
- [ ] T028 [P] Create loading spinner component in src/renderer/components/LoadingSpinner.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Local Skill Management (Priority: P1) 🎯 MVP

**Goal**: Enable users to view, create, edit, and delete local skills from project and global directories in one unified interface

**Independent Test**: Create a test skill, view it in the list, edit its content, save it, and delete it - all operations should work independently without other features

### Backend Implementation for User Story 1

- [ ] T029 [P] [US1] Implement SkillService with scan, list, get, create, save, delete methods in src/main/services/SkillService.ts
- [ ] T030 [P] [US1] Implement FileWatcher service for real-time directory monitoring in src/main/services/FileWatcher.ts
- [ ] T031 [US1] Implement skill:list IPC handler in src/main/ipc/skillHandlers.ts
- [ ] T032 [US1] Implement skill:get IPC handler in src/main/ipc/skillHandlers.ts
- [ ] T033 [US1] Implement skill:create IPC handler in src/main/ipc/skillHandlers.ts
- [ ] T034 [US1] Implement skill:save IPC handler with debouncing in src/main/ipc/skillHandlers.ts
- [ ] T035 [US1] Implement skill:delete IPC handler with secure deletion in src/main/ipc/skillHandlers.ts
- [ ] T036 [US1] Implement config:select-project IPC handler with Claude validation in src/main/ipc/configHandlers.ts
- [ ] T037 [US1] Add fs:skill-changed event for file system notifications in src/main/services/FileWatcher.ts

### Frontend Implementation for User Story 1

- [ ] T038 [P] [US1] Search UI/UX patterns for skill list views and card layouts using ui-ux-pro-max skill
- [ ] T039 [P] [US1] Search UI/UX patterns for code editors with sidebars using ui-ux-pro-max skill
- [ ] T040 [US1] Implement SkillList component with virtual scrolling in src/renderer/components/SkillList.tsx
- [ ] T041 [US1] Implement SkillCard component with metadata display in src/renderer/components/SkillCard.tsx
- [ ] T042 [US1] Implement SkillEditor component with Monaco Editor integration in src/renderer/components/SkillEditor.tsx
- [ ] T043 [US1] Implement NewSkillDialog component with name and description inputs in src/renderer/components/NewSkillDialog.tsx
- [ ] T044 [US1] Implement DeleteConfirmDialog component in src/renderer/components/DeleteConfirmDialog.tsx
- [ ] T045 [US1] Implement ProjectSelector component for directory selection in src/renderer/components/ProjectSelector.tsx
- [ ] T046 [US1] Add IPC hooks for skill operations in src/renderer/hooks/useSkills.ts
- [ ] T047 [US1] Integrate SkillList, SkillEditor, and dialogs in main App layout in src/renderer/App.tsx
- [ ] T048 [US1] Implement keyboard shortcuts (Ctrl+N new, Ctrl+S save, Delete) in src/renderer/App.tsx
- [ ] T049 [US1] Verify UI quality: SVG icons from Heroicons/Lucide, stable hover states, cursor pointer, dark mode contrast 4.5:1

**Checkpoint**: At this point, User Story 1 should be fully functional - users can manage local skills independently

---

## Phase 4: User Story 2 - AI-Assisted Skill Generation (Priority: P2)

**Goal**: Enable users to generate or modify skill content through AI with streaming responses in real-time

**Independent Test**: Click "AI Assist" button, enter a prompt, watch streaming content appear every 200ms, apply the generated content to the editor

### Backend Implementation for User Story 2

- [ ] T050 [P] [US2] Create AIGenerationRequest model in src/main/models/AIGenerationRequest.ts
- [ ] T051 [US2] Implement AIService with Claude Agent SDK integration in src/main/services/AIService.ts
- [ ] T052 [US2] Implement streaming support in AIService with 200ms chunk delivery in src/main/services/AIService.ts
- [ ] T053 [US2] Implement ai:generate IPC handler with streaming events in src/main/ipc/aiHandlers.ts
- [ ] T054 [US2] Implement ai:cancel IPC handler in src/main/ipc/aiHandlers.ts
- [ ] T055 [US2] Implement config:test-ai IPC handler for connection validation in src/main/ipc/configHandlers.ts

### Frontend Implementation for User Story 2

- [ ] T056 [P] [US2] Search UI/UX patterns for AI assistant panels and streaming text display using ui-ux-pro-max skill
- [ ] T057 [US2] Implement AIPanel component with prompt input in src/renderer/components/AIPanel.tsx
- [ ] T058 [US2] Implement streaming text display in AIPanel with 200ms updates in src/renderer/components/AIPanel.tsx
- [ ] T059 [US2] Implement generation mode selector (new/modify/insert/replace) in src/renderer/components/AIPanel.tsx
- [ ] T060 [US2] Add stop generation button with cancellation logic in src/renderer/components/AIPanel.tsx
- [ ] T061 [US2] Add IPC hooks for AI generation in src/renderer/hooks/useAIGeneration.ts
- [ ] T062 [US2] Integrate AIPanel with SkillEditor in src/renderer/App.tsx
- [ ] T063 [US2] Implement "Apply" button to insert/replace content in editor in src/renderer/components/AIPanel.tsx
- [ ] T064 [US2] Add timeout handling UI with continue/cancel options in src/renderer/components/AIPanel.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - AI generation enhances local management

---

## Phase 5: User Story 3 - Public Skill Discovery (Priority: P3)

**Goal**: Enable users to search GitHub for public skills, preview them, and install to local directories

**Independent Test**: Search for "React" skills, preview a skill from results, install it to the project directory - should work without other features

### Backend Implementation for User Story 3

- [ ] T065 [P] [US3] Create SearchResult model with nested SkillFileMatch in src/main/models/SearchResult.ts
- [ ] T066 [US3] Implement GitHubService with search, preview, install methods in src/main/services/GitHubService.ts
- [ ] T067 [US3] Implement github:search IPC handler with 500ms debounce in src/main/ipc/gitHubHandlers.ts
- [ ] T068 [US3] Implement github:preview IPC handler with raw URL fetch in src/main/ipc/gitHubHandlers.ts
- [ ] T069 [US3] Implement github:install IPC handler with conflict detection in src/main/ipc/gitHubHandlers.ts
- [ ] T070 [US3] Add rate limit handling with exponential backoff in src/main/services/GitHubService.ts
- [ ] T071 [US3] Implement conflict resolution (overwrite/rename/skip) in src/main/services/GitHubService.ts

### Frontend Implementation for User Story 3

- [ ] T072 [P] [US3] Search UI/UX patterns for search interfaces and result lists using ui-ux-pro-max skill
- [ ] T073 [P] [US3] Search UI/UX patterns for preview modals and installation wizards using ui-ux-pro-max skill
- [ ] T074 [US3] Implement SearchPanel component with debounced input in src/renderer/components/SearchPanel.tsx
- [ ] T075 [US3] Implement SearchResultCard component with repository info in src/renderer/components/SearchResultCard.tsx
- [ ] T076 [US3] Implement SkillPreview component with modal display in src/renderer/components/SkillPreview.tsx
- [ ] T077 [US3] Implement InstallDialog component with directory selection in src/renderer/components/InstallDialog.tsx
- [ ] T078 [US3] Implement ConflictResolutionDialog component in src/renderer/components/ConflictResolutionDialog.tsx
- [ ] T079 [US3] Add IPC hooks for GitHub operations in src/renderer/hooks/useGitHubSearch.ts
- [ ] T080 [US3] Add rate limit status display in SearchPanel in src/renderer/components/SearchPanel.tsx
- [ ] T081 [US3] Integrate SearchPanel with main navigation in src/renderer/App.tsx

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - public discovery extends local management

---

## Phase 6: User Story 4 - Private Repository Sync (Priority: P4)

**Goal**: Enable teams to connect private GitHub repositories, browse skills, and keep local copies updated

**Independent Test**: Configure a private repo with PAT, browse its skills, install one, detect update, and apply update - should work independently

### Backend Implementation for User Story 4

- [ ] T082 [P] [US4] Create PrivateRepository model with SkillMetadata in src/main/models/PrivateRepository.ts
- [ ] T083 [US4] Extend GitHubService with private repository methods in src/main/services/GitHubService.ts
- [ ] T084 [US4] Implement github:configure-private IPC handler with PAT validation in src/main/ipc/gitHubHandlers.ts
- [ ] T085 [US4] Implement github:list-private IPC handler in src/main/ipc/gitHubHandlers.ts
- [ ] T086 [US4] Implement github:update-private IPC handler with commit hash comparison in src/main/ipc/gitHubHandlers.ts
- [ ] T087 [US4] Add PAT encryption and storage in ConfigService in src/main/services/ConfigService.ts
- [ ] T088 [US4] Implement update detection logic in GitHubService in src/main/services/GitHubService.ts

### Frontend Implementation for User Story 4

- [ ] T089 [P] [US4] Search UI/UX patterns for repository configuration forms using ui-ux-pro-max skill
- [ ] T090 [US4] Implement PrivateRepoList component in src/renderer/components/PrivateRepoList.tsx
- [ ] T091 [US4] Implement PrivateRepoCard component with sync status in src/renderer/components/PrivateRepoCard.tsx
- [ ] T092 [US4] Implement AddPrivateRepoDialog component with PAT input in src/renderer/components/AddPrivateRepoDialog.tsx
- [ ] T093 [US4] Implement UpdateAvailableBadge component in src/renderer/components/UpdateAvailableBadge.tsx
- [ ] T094 [US4] Add IPC hooks for private repository operations in src/renderer/hooks/usePrivateRepos.ts
- [ ] T095 [US4] Integrate PrivateRepoList with main navigation in src/renderer/App.tsx
- [ ] T096 [US4] Add update notification and one-click update flow in src/renderer/App.tsx

**Checkpoint**: At this point, all core user stories (1-4) should work independently

---

## Phase 7: User Story 5 - Settings and Configuration (Priority: P5)

**Goal**: Enable users to configure default behaviors, manage credentials, and customize AI settings

**Independent Test**: Change default install directory, configure AI API key, test connection, verify new behavior in skill operations - should work independently

### Backend Implementation for User Story 5

- [ ] T097 [US5] Implement config:get IPC handler in src/main/ipc/configHandlers.ts
- [ ] T098 [US5] Implement config:update IPC handler with validation in src/main/ipc/configHandlers.ts
- [ ] T099 [US5] Add AI API key encryption and storage in ConfigService in src/main/services/ConfigService.ts
- [ ] T100 [US5] Add GitHub PAT encryption for public search rate limit increase in src/main/services/ConfigService.ts

### Frontend Implementation for User Story 5

- [ ] T101 [P] [US5] Search UI/UX patterns for settings panels and forms using ui-ux-pro-max skill
- [ ] T102 [US5] Implement SettingsPanel component with tabbed interface in src/renderer/components/SettingsPanel.tsx
- [ ] T103 [US5] Implement AIConfigSection component with API key input in src/renderer/components/AIConfigSection.tsx
- [ ] T104 [US5] Implement GitHubConfigSection component with PAT management in src/renderer/components/GitHubConfigSection.tsx
- [ ] T105 [US5] Implement EditorConfigSection component for Monaco settings in src/renderer/components/EditorConfigSection.tsx
- [ ] T106 [US5] Add test connection button and validation feedback in src/renderer/components/AIConfigSection.tsx
- [ ] T107 [US5] Add IPC hooks for configuration in src/renderer/hooks/useConfig.ts
- [ ] T108 [US5] Integrate SettingsPanel with main navigation in src/renderer/App.tsx
- [ ] T109 [US5] Implement theme switcher (dark/light/system) in src/renderer/components/ThemeSwitcher.tsx

**Checkpoint**: At this point, all user stories (1-5) should work independently and be fully functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality checks

### Documentation & Cleanup

- [ ] T110 [P] Update README.md with setup instructions and usage guide
- [ ] T111 [P] Create user documentation in docs/user-guide.md
- [ ] T112 Code cleanup and remove unused dependencies
- [ ] T113 [P] Add JSDoc comments to all public service methods

### Performance Optimization

- [ ] T114 Implement skill list virtual scrolling with react-window in src/renderer/components/SkillList.tsx
- [ ] T115 [P] Add lazy loading for Monaco Editor in src/renderer/components/SkillEditor.tsx
- [ ] T116 [P] Implement metadata caching for skill scanning in src/main/services/SkillService.ts
- [ ] T117 Optimize file watching with debouncing in src/main/services/FileWatcher.ts
- [ ] T118 Profile and optimize memory usage to stay under 300MB

### Security Hardening

- [ ] T119 Security audit: Verify all credentials use safeStorage encryption
- [ ] T120 Security audit: Verify all file operations validate paths in src/main/services/PathValidator.ts
- [ ] T121 Security audit: Verify IPC whitelist in preload script in src/preload.ts

### UI/UX Polish

- [ ] T122 [P] UI/UX audit: Verify all components follow ui-ux-pro-max quality standards (no emoji icons, stable hover, proper contrast)
- [ ] T123 Cross-platform testing on Windows, macOS, and Linux
- [ ] T124 Accessibility review: keyboard navigation, screen reader support, ARIA labels
- [ ] T125 Performance testing: load 500+ skills, verify list load ≤2s, verify interactions <100ms

### Final Validation

- [ ] T126 Run quickstart.md validation - verify developer can set up and run the application
- [ ] T127 Verify all 5 user stories can be tested independently
- [ ] T128 Verify all constitution requirements are met (security, performance, observability)
- [ ] T129 Create demo video showing all 5 user stories working

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 editor but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Installs skills to directories managed by US1 but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Uses GitHub infrastructure from US3 but independently testable
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) - Configures behavior for US1-US4 but independently testable

### Within Each User Story

- Backend models before backend services
- Backend services before IPC handlers
- IPC handlers before frontend hooks
- Frontend infrastructure before components
- Components before integration in App.tsx

### Parallel Opportunities

**Within Setup Phase**:
- T002, T003, T004 (linting, Tailwind, Jest) can run in parallel
- T006, T007, T009, T010 (renderer setup) can run in parallel

**Within Foundational Phase**:
- T015-T018 (all models) can run in parallel
- T019-T022 (all core services) can run in parallel
- T025-T028 (all frontend infrastructure) can run in parallel

**Within User Story Phases**:
- All tasks marked [P] within a user story can run in parallel
- Example US1: T029, T030 (backend services) can run in parallel
- Example US1: T038, T039 (UI/UX research) can run in parallel

**Cross-Story Parallelism**:
- Once Phase 2 completes, different developers can work on US1, US2, US3, US4, US5 simultaneously
- Each story is independently testable

---

## Parallel Example: User Story 1 Implementation

```bash
# Launch backend services in parallel:
Task T029: "Implement SkillService in src/main/services/SkillService.ts"
Task T030: "Implement FileWatcher in src/main/services/FileWatcher.ts"

# Launch UI/UX research in parallel:
Task T038: "Search UI/UX patterns for skill lists"
Task T039: "Search UI/UX patterns for code editors"

# After services complete, implement IPC handlers sequentially:
Task T031 → T032 → T033 → T034 → T035 → T036 → T037

# Launch frontend components in parallel after research:
Task T040: "Implement SkillList component"
Task T041: "Implement SkillCard component"
Task T043: "Implement NewSkillDialog component"
Task T044: "Implement DeleteConfirmDialog component"
Task T045: "Implement ProjectSelector component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Local Skill Management)
4. **STOP and VALIDATE**: Test US1 independently - create, edit, save, delete skills
5. Deploy/demo if ready - **This is your MVP!**

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! 🎯)
3. Add User Story 2 → Test independently → Deploy/Demo (AI-enhanced skill creation)
4. Add User Story 3 → Test independently → Deploy/Demo (Public discovery)
5. Add User Story 4 → Test independently → Deploy/Demo (Team collaboration)
6. Add User Story 5 → Test independently → Deploy/Demo (Customization)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Phases 1-2)
2. Once Foundational is done:
   - Developer A: User Story 1 (Local Management) - PRIORITY
   - Developer B: User Story 2 (AI Generation) - can start in parallel
   - Developer C: User Story 3 (Public Discovery) - can start in parallel
3. Stories complete and integrate independently
4. Developer D can start US4 and US5 as others finish

---

## Task Summary

**Total Tasks**: 129 tasks

**Tasks per User Story**:
- Setup: 14 tasks (T001-T014)
- Foundational: 14 tasks (T015-T028)
- User Story 1 (Local Management): 21 tasks (T029-T049)
- User Story 2 (AI Generation): 15 tasks (T050-T064)
- User Story 3 (Public Discovery): 17 tasks (T065-T081)
- User Story 4 (Private Sync): 15 tasks (T082-T096)
- User Story 5 (Settings): 13 tasks (T097-T109)
- Polish: 20 tasks (T110-T129)

**Parallel Opportunities**: 48 tasks marked [P] can run in parallel with other tasks in their phase

**Suggested MVP Scope**: Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (User Story 1) = 49 tasks

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- UI/UX design tasks MUST complete before frontend implementation
- All frontend components MUST use SVG icons (Heroicons/Lucide), not emoji
- Verify dark mode contrast (4.5:1 minimum) for all text
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Performance targets: <3s startup, <2s skill list, <100ms interactions, <300MB memory
- Security requirements: All credentials encrypted, all paths validated, HTTPS-only external communication
