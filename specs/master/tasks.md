# Tasks: Local Skill Management

**Input**: Design documents from `/specs/002-local-skill-management/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/ipc-contracts.md

**Tests**: Unit tests included for core business logic (≥70% coverage target). Tests written FIRST, then implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Electron app**: `src/main/` (backend), `src/renderer/` (frontend), `src/shared/` (shared types)
- Paths shown below follow the structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

**Duration**: 1-2 days

- [x] T001 Initialize Electron project with package.json, configure TypeScript strict mode
- [x] T002 [P] Install dependencies: electron, react, react-dom, @monaco-editor/react, tailwindcss, chokidar, gray-matter, trash, uuid
- [x] T003 [P] Install devDependencies: typescript, @types/node, @types/react, jest, @types/jest, ts-jest, electron-builder
- [x] T004 [P] Configure Tailwind CSS in tailwind.config.js with dark mode and custom theme colors
- [x] T005 [P] Configure ESLint and Prettier in .eslintrc.json and .prettierrc
- [x] T006 [P] Configure Jest in jest.config.js with TypeScript support
- [x] T007 Create directory structure: src/main/, src/renderer/, src/shared/, tests/unit/, tests/integration/, tests/e2e/
- [x] T008 [P] Create Electron main entry point in src/main/index.ts with basic window creation
- [x] T009 [P] Create React entry point in src/renderer/index.tsx with root component
- [x] T010 [P] Create Tailwind CSS entry in src/renderer/styles/index.css with @tailwind directives
- [x] T011 Create build scripts in package.json: dev, build, start, test, lint

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Duration**: 3-4 days

### Shared Types & Constants

- [x] T012 [P] Create shared types in src/shared/types.ts: Skill, SkillDirectory, Configuration, IPC request/response types
- [x] T013 [P] Create shared constants in src/shared/constants.ts: error codes, default paths, file extensions

### Data Models

- [x] T014 [P] Create Skill model in src/main/models/Skill.ts with validation logic
- [x] T015 [P] Create SkillDirectory model in src/main/models/SkillDirectory.ts with directory type enum
- [x] T016 [P] Create Configuration model in src/main/models/Configuration.ts with default values

### Security Service (CRITICAL)

- [x] T017 Implement PathValidator service in src/main/services/PathValidator.ts with canonical path comparison
- [x] T018 Create unit tests for PathValidator in tests/unit/services/PathValidator.test.ts (test path traversal prevention)

### Utility Services

- [x] T019 [P] Create Logger utility in src/main/utils/Logger.ts with structured logging and file output
- [x] T020 [P] Create ErrorHandler utility in src/main/utils/ErrorHandler.ts with AppError class and error formatting

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Application Initialization (Priority: P1) 🎯 MVP

**Goal**: Enable first-time users to set up the application by selecting their Claude project directory

**Independent Test**: Launch app for first time, select directory, verify skills are scanned and displayed

**Duration**: 2-3 days

### Tests for User Story 1

- [ ] T021 [P] [US1] Unit test for ConfigService.load() in tests/unit/services/ConfigService.test.ts
- [ ] T022 [P] [US1] Unit test for ConfigService.validateProjectDirectory() in tests/unit/services/ConfigService.test.ts
- [ ] T023 [P] [US1] Integration test for config IPC handlers in tests/integration/config-operations.test.ts

### Implementation for User Story 1

#### Configuration Service

- [ ] T024 [US1] Implement ConfigService in src/main/services/ConfigService.ts with load(), save(), get(), set() methods
- [ ] T025 [US1] Implement project directory validation in ConfigService.validateProjectDirectory() (check for .claude folder)
- [ ] T026 [US1] Add error handling to ConfigService with actionable error messages

#### IPC Handlers

- [ ] T027 [US1] Create config IPC handlers in src/main/ipc/configHandlers.ts: config:get, config:set, config:validate-project-dir
- [ ] T028 [US1] Register config IPC handlers in src/main/index.ts on app ready

#### UI Components

- [ ] T029 [US1] Create SetupDialog component in src/renderer/components/SetupDialog.tsx with directory picker
- [ ] T030 [US1] Create ipcClient wrapper in src/renderer/services/ipcClient.ts with typed IPC methods
- [ ] T031 [US1] Implement directory validation UI in SetupDialog (show error if invalid)
- [ ] T032 [US1] Add setup completion logic to save configuration and trigger skill scanning

#### Integration

- [ ] T033 [US1] Show SetupDialog on first launch (check if config exists) in src/renderer/index.tsx
- [ ] T034 [US1] Add logging for setup flow (track duration, success/failure)

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - View Local Skills (Priority: P1)

**Goal**: Display all local skills from project and global directories in a unified, filterable list

**Independent Test**: Add skills to directories, verify they appear in list with correct metadata, test filtering and sorting

**Duration**: 3-4 days

### Tests for User Story 2

- [ ] T035 [P] [US2] Unit test for SkillService.scanDirectory() in tests/unit/services/SkillService.test.ts
- [ ] T036 [P] [US2] Unit test for SkillService.list() in tests/unit/services/SkillService.test.ts
- [ ] T037 [P] [US2] Unit test for Skill.parseFile() with gray-matter in tests/unit/models/Skill.test.ts
- [ ] T038 [P] [US2] Integration test for skill:list IPC in tests/integration/skill-operations.test.ts

### Implementation for User Story 2

#### Skill Parsing

- [ ] T039 [P] [US2] Implement Skill.parseFile() static method in src/main/models/Skill.ts using gray-matter
- [ ] T040 [P] [US2] Add YAML validation to Skill.parseFile() with error collection

#### Skill Service

- [ ] T041 [US2] Implement SkillService in src/main/services/SkillService.ts with scanDirectory() method
- [ ] T042 [US2] Implement SkillService.list() with filtering (source, searchTerm) and sorting (name, modifiedAt)
- [ ] T043 [US2] Add caching to SkillService for skill metadata (invalidate on file changes)
- [ ] T044 [US2] Add performance logging to SkillService (track scan duration, list duration)

#### File Watching Service

- [ ] T045 [US2] Implement FileWatchService in src/main/services/FileWatchService.ts using chokidar
- [ ] T046 [US2] Add debouncing (100ms) to FileWatchService for rapid file changes
- [ ] T047 [US2] Implement event emission in FileWatchService for add/modify/delete events

#### IPC Handlers

- [ ] T048 [US2] Create skill IPC handlers in src/main/ipc/skillHandlers.ts: skill:list
- [ ] T049 [US2] Create directory IPC handlers in src/main/ipc/fileWatchHandlers.ts: directory:scan, directory:start-watch, directory:stop-watch
- [ ] T050 [US2] Register skill and directory handlers in src/main/index.ts

#### UI Components

- [ ] T051 [US2] Create SkillList component in src/renderer/components/SkillList.tsx with virtual scrolling (react-window)
- [ ] T052 [US2] Create SkillCard subcomponent in src/renderer/components/SkillCard.tsx for individual skill display
- [ ] T053 [US2] Implement filtering UI in SkillList (source filter, search input)
- [ ] T054 [US2] Implement sorting UI in SkillList (sort by name/modified time)
- [ ] T055 [US2] Add loading states and empty state to SkillList
- [ ] T056 [US2] Connect SkillList to ipcClient for skill:list call
- [ ] T057 [US2] Implement real-time updates in SkillList via directory:change event

#### Integration

- [ ] T058 [US2] Start file watcher on app ready in src/main/index.ts (watch project and global directories)
- [ ] T059 [US2] Display skill list after setup completion
- [ ] T060 [US2] Add error handling for missing directories (show warning, allow reconfiguration)

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Create New Skill (Priority: P1)

**Goal**: Enable users to create new skill files with proper structure and frontmatter

**Independent Test**: Create new skill, verify file created with template, check it appears in list

**Duration**: 1-2 days

### Tests for User Story 3

- [ ] T061 [P] [US3] Unit test for SkillService.create() in tests/unit/services/SkillService.test.ts
- [ ] T062 [P] [US3] Unit test for filename generation (kebab-case) in tests/unit/utils/filename.test.ts
- [ ] T063 [P] [US3] Integration test for skill:create IPC in tests/integration/skill-operations.test.ts

### Implementation for User Story 3

#### Utility Functions

- [ ] T064 [P] [US3] Create filename utility in src/main/utils/filename.ts: convertToKebabCase()

#### Skill Service

- [ ] T065 [US3] Implement SkillService.create() with name validation and template generation
- [ ] T066 [US3] Add YAML frontmatter template generation in SkillService.create()
- [ ] T067 [US3] Add conflict detection (file already exists) in SkillService.create()

#### IPC Handlers

- [ ] T068 [US3] Add skill:create handler in src/main/ipc/skillHandlers.ts
- [ ] T069 [US3] Register skill:create handler in src/main/index.ts

#### UI Components

- [ ] T070 [US3] Create CreateSkillDialog component in src/renderer/components/CreateSkillDialog.tsx with name input and directory selector
- [ ] T071 [US3] Add form validation to CreateSkillDialog (name required, valid characters)
- [ ] T072 [US3] Connect CreateSkillDialog to ipcClient for skill:create call
- [ ] T073 [US3] Add "New Skill" button to SkillList toolbar
- [ ] T074 [US3] Auto-open created skill in editor (call editor open after creation)

#### Integration

- [ ] T075 [US3] Add keyboard shortcut Ctrl+N for new skill in src/renderer/index.tsx
- [ ] T076 [US3] Show success/error toast notification after skill creation

**Checkpoint**: User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Edit Skill Content (Priority: P1)

**Goal**: Provide embedded editor with syntax highlighting for editing skill files

**Independent Test**: Open skill, make changes, save, verify file updated and external change detection works

**Duration**: 2-3 days

### Tests for User Story 4

- [ ] T077 [P] [US4] Unit test for SkillService.update() in tests/unit/services/SkillService.test.ts
- [ ] T078 [P] [US4] Unit test for SkillService.read() in tests/unit/services/SkillService.test.ts
- [ ] T079 [P] [US4] Integration test for skill:read and skill:update IPC in tests/integration/skill-operations.test.ts

### Implementation for User Story 4

#### Skill Service

- [ ] T080 [P] [US4] Implement SkillService.read() to load file content
- [ ] T081 [US4] Implement SkillService.update() with path validation and atomic write
- [ ] T082 [US4] Add external change detection in SkillService.update() (compare modified time)
- [ ] T083 [US4] Add content validation (non-empty, valid YAML) in SkillService.update()

#### IPC Handlers

- [ ] T084 [P] [US4] Add skill:read handler in src/main/ipc/skillHandlers.ts
- [ ] T085 [US4] Add skill:update handler in src/main/ipc/skillHandlers.ts
- [ ] T086 [US4] Register skill:read and skill:update handlers in src/main/index.ts

#### UI Components

- [ ] T087 [US4] Create SkillEditor component in src/renderer/components/SkillEditor.tsx with Monaco Editor
- [ ] T088 [US4] Configure Monaco Editor with YAML + Markdown syntax highlighting and dark theme
- [ ] T089 [US4] Add save button and Ctrl+S shortcut to SkillEditor
- [ ] T090 [US4] Implement external change detection UI in SkillEditor (show reload/overwrite dialog)
- [ ] T091 [US4] Connect SkillEditor to ipcClient for skill:read and skill:update calls
- [ ] T092 [US4] Add loading state and error handling to SkillEditor

#### Integration

- [ ] T093 [US4] Open SkillEditor on double-click in SkillList
- [ ] T094 [US4] Add Ctrl+W shortcut to close editor
- [ ] T095 [US4] Show success toast after save

**Checkpoint**: User Stories 1, 2, 3, AND 4 should all work independently

---

## Phase 7: User Story 5 - Delete Skill (Priority: P1)

**Goal**: Safely delete skills by moving them to system recycle bin

**Independent Test**: Delete skill, confirm action, verify file in recycle bin and removed from list, test recovery

**Duration**: 1 day

### Tests for User Story 5

- [ ] T096 [P] [US5] Unit test for SkillService.delete() in tests/unit/services/SkillService.test.ts
- [ ] T097 [P] [US5] Integration test for skill:delete IPC in tests/integration/skill-operations.test.ts

### Implementation for User Story 5

#### Skill Service

- [ ] T098 [US5] Implement SkillService.delete() using trash package (move to recycle bin)
- [ ] T099 [US5] Add path validation in SkillService.delete() before deletion

#### IPC Handlers

- [ ] T100 [US5] Add skill:delete handler in src/main/ipc/skillHandlers.ts
- [ ] T101 [US5] Register skill:delete handler in src/main/index.ts

#### UI Components

- [ ] T102 [US5] Add delete button to SkillCard with confirmation dialog
- [ ] T103 [US5] Connect delete action to ipcClient for skill:delete call
- [ ] T104 [US5] Show success toast after deletion

#### Integration

- [ ] T105 [US5] Add Delete key shortcut when skill is selected in SkillList
- [ ] T106 [US5] Handle file recovery (file watcher will auto-detect restored files)

**Checkpoint**: All P1 user stories (1-5) should be fully functional and testable

---

## Phase 8: User Story 6 - Configure Settings (Priority: P2)

**Goal**: Allow users to configure default behaviors and preferences

**Independent Test**: Change settings, save, verify new behavior applies to operations

**Duration**: 1-2 days

### Tests for User Story 6

- [ ] T107 [P] [US6] Unit test for ConfigService.set() with validation in tests/unit/services/ConfigService.test.ts
- [ ] T108 [P] [US6] Integration test for config persistence in tests/integration/config-operations.test.ts

### Implementation for User Story 6

#### Config Service (Enhancements)

- [ ] T109 [US6] Add validation to ConfigService.set() for setting values
- [ ] T110 [US6] Add setting change notifications in ConfigService (emit event on change)

#### UI Components

- [ ] T111 [US6] Create SettingsPanel component in src/renderer/components/SettingsPanel.tsx
- [ ] T112 [US6] Add settings fields: defaultInstallTarget, editorDefaultMode, autoRefresh toggles
- [ ] T113 [US6] Connect SettingsPanel to ipcClient for config:get and config:set calls
- [ ] T114 [US6] Add save button and reset to defaults button to SettingsPanel
- [ ] T115 [US6] Add Settings navigation item to main UI (sidebar or menu)

#### Integration

- [ ] T116 [US6] Apply defaultInstallTarget setting to CreateSkillDialog
- [ ] T117 [US6] Apply editorDefaultMode setting to SkillList double-click behavior
- [ ] T118 [US6] Apply autoRefresh setting to FileWatchService start/stop

**Checkpoint**: All user stories (1-6) should be fully functional and testable

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

**Duration**: 2-3 days

- [ ] T119 [P] Add comprehensive error handling across all components with actionable messages
- [ ] T120 [P] Add performance logging to all critical operations (startup, scan, saves)
- [ ] T121 [P] Implement virtual scrolling optimization for SkillList (ensure 500+ skills render smoothly)
- [ ] T122 [P] Add loading spinners to all async operations (skill list load, save, delete)
- [ ] T123 [P] Improve accessibility: keyboard navigation, ARIA labels, focus management
- [ ] T124 [P] Add dark theme refinement (ensure all components use Tailwind dark mode correctly)
- [ ] T125 [P] Create E2E test suite in tests/e2e/user-journeys.test.ts covering all user stories
- [ ] T126 [P] Run performance profiling: verify <3s startup, <100ms saves, <500ms list updates
- [ ] T127 [P] Run cross-platform testing: Windows, macOS, Linux
- [ ] T128 [P] Update README.md with usage instructions and development guide
- [ ] T129 Code cleanup and refactoring (remove console.logs, fix linting issues)
- [ ] T130 Security audit: verify all file operations use PathValidator, no hardcoded paths

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User Story 1 (US1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (US2): Can start after Foundational - Independent of US1
  - User Story 3 (US3): Can start after Foundational - Independent of US1/US2
  - User Story 4 (US4): Can start after Foundational - Independent of US1/US2/US3
  - User Story 5 (US5): Can start after Foundational - Independent of US1/US2/US3/US4
  - User Story 6 (US6): Can start after Foundational - Independent of all P1 stories
- **Polish (Phase 9)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - Foundation for app but other stories can develop in parallel
- **User Story 2 (P1)**: Independent - Can develop without US1 (uses own config service)
- **User Story 3 (P1)**: Independent - Can develop without US1/US2
- **User Story 4 (P1)**: Independent - Can develop without US1/US2/US3
- **User Story 5 (P1)**: Independent - Can develop without US1/US2/US3/US4
- **User Story 6 (P2)**: Independent - Settings enhance existing features but not blocking

### Within Each User Story

- Tests written FIRST (can be parallel within story)
- Models before services
- Services before IPC handlers
- IPC handlers before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- **Once Foundational phase completes, ALL user stories (US1-US6) can start in parallel**
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for ConfigService.load() in tests/unit/services/ConfigService.test.ts"
Task: "Unit test for ConfigService.validateProjectDirectory() in tests/unit/services/ConfigService.test.ts"
Task: "Integration test for config IPC handlers in tests/integration/config-operations.test.ts"

# Launch parallel implementation tasks:
Task: "Create SetupDialog component in src/renderer/components/SetupDialog.tsx"
Task: "Create ipcClient wrapper in src/renderer/services/ipcClient.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Application Initialization)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**MVP Scope**: Users can set up the app and configure project directory

### Core CRUD Delivery (User Stories 1-5)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (View skills)
4. Add User Story 3 → Test independently → Deploy/Demo (Create skills)
5. Add User Story 4 → Test independently → Deploy/Demo (Edit skills)
6. Add User Story 5 → Test independently → Deploy/Demo (Delete skills)

**Core Scope**: Full CRUD operations for local skill management

### Complete Feature (All User Stories)

1. Complete Core CRUD Delivery (US1-US5)
2. Add User Story 6 → Test independently → Deploy/Demo (Settings)
3. Complete Polish phase → Final testing → Release

**Full Scope**: Complete local skill management with configuration

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Setup)
   - Developer B: User Story 2 (View)
   - Developer C: User Story 3 (Create)
   - Developer D: User Story 4 (Edit)
   - Developer E: User Story 5 (Delete)
   - Developer F: User Story 6 (Settings)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests pass before implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Summary

**Total Tasks**: 130
- **Phase 1 (Setup)**: 11 tasks
- **Phase 2 (Foundational)**: 9 tasks (BLOCKING)
- **Phase 3 (US1 - Initialization)**: 14 tasks
- **Phase 4 (US2 - View Skills)**: 26 tasks
- **Phase 5 (US3 - Create Skill)**: 16 tasks
- **Phase 6 (US4 - Edit Skill)**: 19 tasks
- **Phase 7 (US5 - Delete Skill)**: 11 tasks
- **Phase 8 (US6 - Settings)**: 12 tasks
- **Phase 9 (Polish)**: 12 tasks

**Parallel Opportunities**: 52 tasks marked [P] can run in parallel within their phase

**Independent Test Criteria**:
- ✅ US1: Can launch app, select directory, see configuration saved
- ✅ US2: Can view skill list, filter, sort, see real-time updates
- ✅ US3: Can create new skill, see template, verify in list
- ✅ US4: Can open editor, make changes, save, detect external changes
- ✅ US5: Can delete skill, confirm, find in recycle bin, recover
- ✅ US6: Can change settings, save, verify new behavior

**Suggested MVP Scope**: User Story 1 only (Application Initialization)

**Estimated Timeline**: 6 weeks (as per plan.md)
