# Tasks: Public Skill Discovery

**Input**: Design documents from `/specs/004-public-skill-discovery/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ipc-contracts.md

**Tests**: Tests are OPTIONAL - not explicitly requested in specification, so they are NOT included in this task breakdown.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

This feature uses Electron architecture:
- **Backend (Main Process)**: `src/main/` - services, IPC handlers, models
- **Frontend (Renderer Process)**: `src/renderer/` - React components, UI logic
- **Shared Types**: `src/shared/` - TypeScript interfaces shared between processes

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, UI/UX design, and basic structure

- [X] T001 Create shared type definitions for public skill discovery in src/shared/types.ts
- [X] T002 [P] Configure IPC channel namespace for GitHub operations (github:*) in src/main/preload.ts
- [X] T003 [P] UI/UX Research: Use ui-ux-pro-max skill to search for desktop app search interface patterns, skill preview panels, and installation dialogs
- [X] T004 [P] UI/UX Design: Generate design specifications for SearchPanel, SkillPreview, and InstallDialog following ui-ux-pro-max recommendations
- [X] T005 Verify design meets quality standards (SVG icons from Heroicons/Lucide, stable hover states, proper contrast, cursor feedback)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create GitHubService base class in src/main/services/GitHubService.ts with PAT encryption using safeStorage
- [X] T007 [P] Implement error mapping utility for GitHub API errors in src/main/utils/gitHubErrors.ts
- [X] T008 [P] Create IPC handler registration framework for github:* channels in src/main/ipc/gitHubHandlers.ts
- [X] T009 [P] Setup response type wrappers (Result<T, IPCError>) in src/shared/types.ts
- [X] T010 Implement path validation utility for skill installation targets in src/main/utils/pathValidation.ts
- [X] T011 [P] Create download utilities module with concurrency control in src/main/utils/downloadUtils.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Search Public Skills (Priority: P1) 🎯 MVP

**Goal**: Enable users to search GitHub for public skill directories containing skill.md files

**Independent Test**: Enter search terms, verify results appear from GitHub, check pagination works correctly

### Implementation for User Story 1

**Backend (Models & Services)**:
- [X] T012 [P] [US1] Create SearchResult model interface in src/main/models/SearchResult.ts
- [X] T013 [US1] Implement GitHubService.searchSkills() method with Code Search API in src/main/services/GitHubService.ts
- [X] T014 [US1] Implement search result parsing (extract skill directory names from file paths) in src/main/services/GitHubService.ts
- [X] T015 [US1] Add search caching with 5-minute TTL in src/main/services/GitHubService.ts

**Backend (IPC)**:
- [X] T016 [US1] Implement github:search-skills IPC handler in src/main/ipc/gitHubHandlers.ts
- [X] T017 [US1] Add rate limit error handling with user-friendly messages in src/main/ipc/gitHubHandlers.ts
- [X] T017a [US1] Implement search cancellation logic in SearchPanel to abort in-progress search when query changes in src/renderer/components/SearchPanel.tsx

**Frontend (UI Components)**:
- [X] T018 [P] [US1] Search UI/UX: Implement SearchPanel component with debounced input (500ms) in src/renderer/components/SearchPanel.tsx
- [X] T019 [P] [US1] Create SearchResultCard component displaying skill info in src/renderer/components/SearchResultCard.tsx
- [X] T020 [US1] Implement infinite scroll pagination with Intersection Observer in src/renderer/components/SearchPanel.tsx
- [X] T021 [US1] Add loading states and empty state messaging in src/renderer/components/SearchPanel.tsx
- [X] T021a [US1] Design empty state component with centered gray-100 background icon and gray-600 text for no-results scenario in src/renderer/components/SearchPanel.tsx
- [X] T022 [US1] Implement error handling with retry buttons in src/renderer/components/SearchPanel.tsx

**Frontend (Integration)**:
- [X] T023 [US1] Create githubClient wrapper for IPC calls in src/renderer/services/githubClient.ts
- [X] T024 [US1] Wire SearchPanel to github:search-skills IPC channel in src/renderer/components/SearchPanel.tsx
- [X] T024a [US1] Add "Open in GitHub" button to SearchResultCard that opens repository URL in external browser in src/renderer/components/SearchResultCard.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - users can search GitHub and view paginated results independently

---

## Phase 4: User Story 2 - Preview Skill Content (Priority: P1)

**Goal**: Enable users to preview skill.md content and directory structure before installing

**Independent Test**: Click a skill in search results, verify preview displays full content from GitHub, check it's read-only

### Implementation for User Story 2

**Backend (Models & Services)**:
- [X] T025 [P] [US2] Create PreviewContent and DirectoryTreeNode models in src/main/models/PreviewContent.ts
- [X] T026 [US2] Implement GitHubService.previewSkill() method to fetch skill.md and directory tree in src/main/services/GitHubService.ts
- [X] T027 [US2] Implement directory tree building logic from Git Trees API in src/main/services/GitHubService.ts
- [X] T028 [US2] Add preview content caching with 5-minute TTL in src/main/services/GitHubService.ts

**Backend (IPC)**:
- [X] T029 [US2] Implement github:preview-skill IPC handler in src/main/ipc/gitHubHandlers.ts
- [X] T030 [US2] Add 404 error handling for deleted/moved skills in src/main/ipc/gitHubHandlers.ts

**Frontend (UI Components)**:
[X] T031 [P] [US2] UI/UX: Design split-panel preview layout (file tree left, content right) using ui-ux-pro-max skill
[X] T032 [P] [US2] Create SkillPreview modal component in src/renderer/components/SkillPreview.tsx
[X] T033 [US2] Implement collapsible directory tree with file/folder icons in src/renderer/components/SkillPreview.tsx
[X] T034 [US2] Render skill.md content with markdown rendering in src/renderer/components/SkillPreview.tsx
[X] T035 [US2] Add file content viewer for tree nodes (text files only) in src/renderer/components/SkillPreview.tsx
[X] T036 [US2] Implement modal close on Escape key and outside click in src/renderer/components/SkillPreview.tsx

**Frontend (Integration)**:
[X] T037 [US2] Wire SkillPreview to github:preview-skill IPC channel in src/renderer/components/SkillPreview.tsx
[X] T038 [US2] Add "Preview" button to SearchResultCard in src/renderer/components/SearchResultCard.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can search AND preview skills

---

## Phase 5: User Story 3 - Install Skill from Search Results (Priority: P1)

**Goal**: Enable users to install skills by downloading skill directories from GitHub to local file system

**Independent Test**: Click "Install" on a search result, select target directory, verify skill appears in local skill list

### Implementation for User Story 3

**Backend (Models & Services)**:
- [X] T039 [P] [US3] Create InstallRequest and InstallProgress models in src/main/models/InstallRequest.ts
- [X] T040 [US3] Implement GitHubService.installSkill() method with progress tracking in src/main/services/GitHubService.ts
- [X] T041 [US3] Implement skill directory download using Git Trees API in src/main/utils/downloadUtils.ts
- [X] T042 [US3] Add concurrent download control (max 5 files) in src/main/utils/downloadUtils.ts
- [X] T043 [US3] Implement skill validation (check for skill.md, non-empty content) in src/main/services/GitHubService.ts
- [X] T044 [US3] Add cleanup logic for partial downloads on failure in src/main/utils/downloadUtils.ts

**Backend (IPC)**:
[X] T045 [US3] Implement github:install-skill IPC handler with progress events in src/main/ipc/gitHubHandlers.ts
[X] T046 [US3] Implement github:cancel-install IPC handler in src/main/ipc/gitHubHandlers.ts
[X] T047 [US3] Add progress event emission (github:install-progress) in src/main/ipc/gitHubHandlers.ts
[X] T048 [US3] Add completion event emission (github:install-complete) in src/main/ipc/gitHubHandlers.ts

**Frontend (UI Components)**:
[X] T049 [P] [US3] UI/UX: Design installation dialog with directory selection using ui-ux-pro-max skill
[X] T050 [P] [US3] Create InstallDialog component in src/renderer/components/InstallDialog.tsx
[X] T051 [US3] Implement target directory selection (project/global) in src/renderer/components/InstallDialog.tsx
[X] T052 [US3] Add progress bar with percentage indicator in src/renderer/components/InstallDialog.tsx
[X] T053 [US3] Implement cancel button functionality in src/renderer/components/InstallDialog.tsx
[X] T054 [US3] Add success notification and skill list refresh on completion in src/renderer/components/InstallDialog.tsx

**Frontend (Integration)**:
[X] T055 [US3] Wire InstallDialog to github:install-skill IPC channel in src/renderer/components/InstallDialog.tsx
[X] T056 [US3] Listen for progress events (github:install-progress) in src/renderer/components/InstallDialog.tsx
[X] T057 [US3] Listen for completion events (github:install-complete) in src/renderer/App.tsx
[X] T058 [US3] Add "Install" button to SearchResultCard and SkillPreview in src/renderer/components/SearchResultCard.tsx

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - users can search, preview, AND install skills

---

## Phase 6: User Story 4 - Handle Installation Conflicts (Priority: P1)

**Goal**: Enable users to handle cases where a skill with the same name already exists

**Independent Test**: Install a skill when a file with the same name already exists, select conflict resolution option, verify expected outcome

### Implementation for User Story 4

**Backend (Models & Services)**:
- [X] T059 [P] [US4] Create ConflictInfo model in src/main/models/ConflictInfo.ts
- [X] T060 [US4] Implement conflict detection in GitHubService.installSkill() in src/main/services/GitHubService.ts
- [X] T061 [US4] Add timestamp-based renaming logic for conflict resolution in src/main/services/GitHubService.ts
- [ ] T062 [US4] Implement "Apply to all" conflict preference storage in src/main/services/GitHubService.ts (OPTIONAL - not critical for MVP)

**Backend (IPC)**:
- [X] T063 [US4] Emit conflict event (github:install-conflict) from install handler in src/main/ipc/gitHubHandlers.ts (Using synchronous approach via conflictResolution parameter)
- [X] T064 [US4] Handle conflict resolution response in install handler in src/main/ipc/gitHubHandlers.ts

**Frontend (UI Components)**:
[X] T065 [P] [US4] UI/UX: Design conflict resolution dialog with three options using ui-ux-pro-max skill
[X] T066 [P] [US4] Create ConflictResolutionDialog component in src/renderer/components/ConflictResolutionDialog.tsx
[X] T067 [US4] Implement three conflict options: Overwrite, Rename (timestamp), Skip in src/renderer/components/ConflictResolutionDialog.tsx
[ ] T068 [US4] Add "Apply to all" checkbox in src/renderer/components/ConflictResolutionDialog.tsx (OPTIONAL - not critical for MVP)
[X] T069 [US4] Display existing skill info and new skill source in dialog in src/renderer/components/ConflictResolutionDialog.tsx

**Frontend (Integration)**:
[X] T070 [US4] Listen for conflict events (github:install-conflict) in src/renderer/App.tsx (Using synchronous approach)
[X] T071 [US4] Wire ConflictResolutionDialog response back to IPC in src/renderer/components/ConflictResolutionDialog.tsx

**Checkpoint**: At this point, all P1 user stories are complete - users can search, preview, install, AND handle conflicts

---

## Phase 7: User Story 5 - Browse Curated Skill Sources (Priority: P2)

**Goal**: Enable users to browse curated lists of high-quality skill repositories

**Independent Test**: View curated sources list, select one, browse its skills without using search function

### Implementation for User Story 5

**Backend (Models & Services)**:
[X] T072 [P] [US5] Create CuratedSource model in src/main/models/CuratedSource.ts
[X] T073 [US5] Implement GitHubService.getCuratedSources() method with hardcoded list in src/main/services/GitHubService.ts
[X] T074 [US5] Implement GitHubService.getSkillsFromSource() method in src/main/services/GitHubService.ts

**Backend (IPC)**:
[X] T075 [US5] Implement github:get-curated-sources IPC handler in src/main/ipc/gitHubHandlers.ts
[X] T076 [US5] Implement github:get-skills-from-source IPC handler in src/main/ipc/gitHubHandlers.ts

**Frontend (UI Components)**:
[X] T077 [P] [US5] UI/UX: Design sidebar layout for curated sources using ui-ux-pro-max skill
[X] T078 [P] [US5] Create Sidebar component in src/renderer/components/Sidebar.tsx
[X] T079 [US5] Display curated sources with descriptions and tags in src/renderer/components/Sidebar.tsx
[X] T080 [US5] Implement source selection to load all skills from repo in src/renderer/components/Sidebar.tsx
[X] T081 [US5] Add "Install" button for source skills (reuse US3 flow) in src/renderer/components/Sidebar.tsx

**Frontend (Integration)**:
[X] T082 [US5] Wire Sidebar to github:get-curated-sources IPC channel in src/renderer/components/Sidebar.tsx
[X] T083 [US5] Wire source selection to github:get-skills-from-source IPC channel in src/renderer/components/Sidebar.tsx

**Checkpoint**: All user stories complete - full feature functionality available

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

**Error Handling & Edge Cases**:
[X] T084 [P] Implement comprehensive error handling for all GitHub API errors in src/main/utils/gitHubErrors.ts
[X] T085 [P] Add user-friendly error messages for rate limits, network failures, 404s in src/renderer/components/SearchPanel.tsx
[X] T086 Add large directory size warning (>1MB) before installation in src/renderer/components/InstallDialog.tsx
[X] T087 Implement timeout handling for slow GitHub responses (>5s) in src/main/services/GitHubService.ts

**Performance Optimization**:
[X] T088 [P] Implement search result caching (5-minute TTL) in src/main/services/GitHubService.ts
[X] T089 [P] Implement preview content caching (5-minute TTL) in src/main/services/GitHubService.ts
[X] T090 Add progress update throttling (100ms intervals) in src/main/ipc/gitHubHandlers.ts
[X] T091 Optimize infinite scroll with Intersection Observer in src/renderer/components/SearchPanel.tsx

**Integration with Existing Features**:
- [X] T092 Add "Public Search" tab to main navigation in src/renderer/App.tsx
- [X] T093 Wire skill list refresh after successful installation in src/renderer/App.tsx
- [X] T094 Preserve search query and results when switching tabs in src/renderer/App.tsx

**UI/UX Audit**:
- [X] T095 [P] UI/UX audit: Verify all components follow ui-ux-pro-max quality standards
- [X] T096 [P] Verify SVG icons (Heroicons/Lucide) used throughout, no emoji
- [X] T097 [P] Test stable hover states (no layout shifts, color/opacity transitions only)
- [X] T098 [P] Verify light/dark mode contrast (4.5:1 minimum for text)
- [X] T099 [P] Test responsive layout at 1024x768 minimum resolution
- [X] T100 Verify accessibility compliance (alt text, labels, keyboard navigation)

**Cross-Platform Testing**:
- [ ] T101 [P] Test on Windows 10/11 - verify path handling and file operations
- [ ] T102 [P] Test on macOS 12+ - verify path handling and file operations
- [ ] T103 [P] Test on Linux (Ubuntu 20.04+) - verify path handling and file operations

**Documentation**:
- [ ] T104 [P] Update user documentation with public search features in docs/user-guide.md
- [ ] T105 [P] Document IPC contracts in docs/api/ipc-contracts.md
- [ ] T106 Run quickstart.md validation - verify all implementation steps work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 stories → P2 stories)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Independent of US1/US2
- **User Story 4 (P1)**: Depends on US3 (conflicts occur during installation)
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Independent of US1-US4

### Within Each User Story

- Models before services
- Services before IPC handlers
- IPC handlers before frontend integration
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
```bash
# These can run in parallel (different files):
Task T007: "Implement error mapping utility in src/main/utils/gitHubErrors.ts"
Task T008: "Create IPC handler framework in src/main/ipc/gitHubHandlers.ts"
Task T009: "Setup response type wrappers in src/shared/types.ts"
Task T011: "Create download utilities in src/main/utils/downloadUtils.ts"
```

**Within User Story 1**:
```bash
# These can run in parallel (different files):
Task T012: "Create SearchResult model in src/main/models/SearchResult.ts"
Task T018: "Implement SearchPanel component in src/renderer/components/SearchPanel.tsx"
Task T019: "Create SearchResultCard component in src/renderer/components/SearchResultCard.tsx"
```

**Across User Stories (if team capacity allows)**:
```bash
# After Phase 2 completes, these can all start in parallel:
Developer A: User Story 1 (Search)
Developer B: User Story 2 (Preview)
Developer C: User Story 3 (Install)
# Then:
Developer A: User Story 4 (Conflicts)
Developer B: User Story 5 (Curated Sources)
```

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: "Create SearchResult model in src/main/models/SearchResult.ts"

# Launch all frontend components for User Story 1 together (after backend ready):
Task: "Implement SearchPanel component in src/renderer/components/SearchPanel.tsx"
Task: "Create SearchResultCard component in src/renderer/components/SearchResultCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Search)
4. **STOP and VALIDATE**: Test search functionality independently
5. Complete Phase 4: User Story 2 (Preview)
6. **STOP and VALIDATE**: Test preview functionality independently
7. Complete Phase 5: User Story 3 (Install)
8. **STOP and VALIDATE**: Test install functionality independently
9. Deploy/demo if ready - users can search, preview, AND install skills

### Full P1 Delivery (User Stories 1-4)

1. Complete MVP (US1-US3)
2. Complete Phase 6: User Story 4 (Conflicts)
3. **STOP and VALIDATE**: Test conflict resolution independently
4. Deploy/demo - full P1 functionality available

### Complete Feature (All User Stories)

1. Complete Full P1 Delivery (US1-US4)
2. Complete Phase 7: User Story 5 (Curated Sources)
3. **STOP and VALIDATE**: Test curated sources independently
4. Complete Phase 8: Polish
5. Final validation and deployment - full feature complete

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Search)
   - Developer B: User Story 2 (Preview)
   - Developer C: User Story 3 (Install)
3. After US3 complete:
   - Developer A: User Story 4 (Conflicts) - depends on US3
   - Developer B: User Story 5 (Curated Sources)
4. All stories complete and integrate independently
5. Team collaborates on Phase 8 (Polish)

---

## Task Summary

**Total Tasks**: 109

**Tasks by Phase**:
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 6 tasks
- Phase 3 (User Story 1 - Search): 16 tasks
- Phase 4 (User Story 2 - Preview): 14 tasks
- Phase 5 (User Story 3 - Install): 20 tasks
- Phase 6 (User Story 4 - Conflicts): 13 tasks
- Phase 7 (User Story 5 - Curated Sources): 12 tasks
- Phase 8 (Polish): 23 tasks

**Tasks by User Story**:
- Setup/Foundational: 11 tasks
- User Story 1 (Search - P1): 16 tasks
- User Story 2 (Preview - P1): 14 tasks
- User Story 3 (Install - P1): 20 tasks
- User Story 4 (Conflicts - P1): 13 tasks
- User Story 5 (Curated Sources - P2): 12 tasks
- Polish: 23 tasks

**Parallel Opportunities**:
- 48 tasks marked [P] can run in parallel with other tasks
- After Phase 2, up to 3 user stories can be worked on simultaneously
- Multiple team members can work on different user stories independently

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (Setup + Foundational + User Story 1) = 27 tasks

**Format Validation**: ✅ All tasks follow checklist format (checkbox, ID, [P] marker where applicable, [Story] labels for user story tasks, file paths)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Frontend tasks include ui-ux-pro-max skill integration for design guidance
- All UI components must use SVG icons (Heroicons/Lucide), no emoji
- All GitHub API calls must be proxied through backend (security requirement)
- All file operations must validate paths (security requirement)
