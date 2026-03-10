# Quickstart: Public Skill Discovery

**Feature**: 004-public-skill-discovery
**Time Estimate**: 2-3 weeks (assuming 1 developer)
**Prerequisites**: Features 001-003 completed (skill manager, local skill management, AI generation)

## Overview

This feature enables users to search GitHub for public skill directories, preview skill content, and install skills to their local environment. It integrates with the existing skill management infrastructure from features 001-003.

## Architecture Summary

```
Frontend (Renderer)                Backend (Main)                    External
┌──────────────────┐              ┌──────────────────┐              ┌─────────┐
│  SearchPanel     │              │  GitHubService   │              │ GitHub  │
│  ├─ Search Input │◄────────────►│  ├─ searchSkills │◄────────────►│   API   │
│  └─ Results List │    IPC       │  ├─ previewSkill │    HTTPS     └─────────┘
│                  │              │  └─ installSkill │
│  SkillPreview    │              │                  │
│  InstallDialog   │              │  IPC Handlers    │
│  ConflictDialog  │              │  ├─ search       │
│  Sidebar         │              │  ├─ preview      │
└──────────────────┘              │  └─ install      │
                                  └──────────────────┘
```

## Implementation Phases

### Phase 1: Backend Foundation (3-4 days)

**Goal**: Implement GitHubService and IPC handlers for search, preview, and install operations.

**Files to Create**:
1. `src/main/services/GitHubService.ts` - GitHub API integration
2. `src/main/ipc/gitHubHandlers.ts` - IPC channel handlers
3. `src/main/utils/downloadUtils.ts` - Directory download utilities
4. `src/shared/types.ts` - Shared TypeScript interfaces

**Key Methods**:
```typescript
// GitHubService.ts
class GitHubService {
  async searchSkills(query: string, page: number): Promise<SearchResult[]>
  async previewSkill(repo: string, skillPath: string): Promise<PreviewContent>
  async installSkill(request: InstallRequest, onProgress: ProgressCallback): Promise<void>
  async getCuratedSources(): Promise<CuratedSource[]>
  private async downloadSkillDirectory(...): Promise<void>
}
```

**Testing**:
- Unit tests for GitHubService methods (mock fetch)
- Unit tests for downloadUtils (mock file system)
- Integration test: Search → Preview → Install flow

**Success Criteria**:
- [ ] Search returns results from GitHub Code Search API
- [ ] Preview displays skill.md content and directory tree
- [ ] Install downloads skill directory to local file system
- [ ] All GitHub API errors handled with user-friendly messages
- [ ] PAT encryption working (safeStorage)

---

### Phase 2: Frontend UI Components (4-5 days)

**Goal**: Implement React components for search interface, results display, preview, and dialogs.

**Files to Create**:
1. `src/renderer/components/SearchPanel.tsx` - Main search interface
2. `src/renderer/components/SearchResultCard.tsx` - Individual result card
3. `src/renderer/components/SkillPreview.tsx` - Preview modal with file tree
4. `src/renderer/components/InstallDialog.tsx` - Installation dialog
5. `src/renderer/components/ConflictResolutionDialog.tsx` - Conflict handling
6. `src/renderer/components/Sidebar.tsx` - Curated sources sidebar

**UI Design Workflow**:
1. Run `ui-ux-pro-max` skill to get design recommendations for desktop app search interface
2. Search for: "desktop application search interface", "file preview panel", "installation progress"
3. Apply color palette: Blue-600 accent, gray scale structure, white backgrounds
4. Use SVG icons from Heroicons/Lucide (no emoji)
5. Implement 500ms debounce on search input

**Key Components**:
```typescript
// SearchPanel.tsx
const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const debouncedSearch = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedSearch) {
      searchSkills(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <div className="search-panel">
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <SearchResultList results={results} />
    </div>
  );
};
```

**Testing**:
- Component tests with React Testing Library
- Test debouncing behavior
- Test infinite scroll pagination
- Test dialog interactions

**Success Criteria**:
- [ ] Search input debounced by 500ms
- [ ] Results display as cards with skill info
- [ ] Preview modal shows skill.md and file tree
- [ ] Install dialog selects target directory
- [ ] Conflict dialog offers overwrite/rename/skip options
- [ ] All UI interactions complete <100ms
- [ ] UI responsive at 1024x768 resolution

---

### Phase 3: Integration with Existing Features (2-3 days)

**Goal**: Integrate public skill discovery with local skill management and navigation.

**Files to Modify**:
1. `src/renderer/App.tsx` - Add "Public Search" tab
2. `src/renderer/components/SkillList.tsx` - Refresh after install
3. `src/main/services/SkillManager.ts` - Handle new skills from install
4. `src/renderer/types/electron.d.ts` - Add IPC type definitions

**Integration Points**:
```typescript
// App.tsx - Add Public Search tab
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('local');

  return (
    <div className="app">
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'local' && <SkillList />}
      {activeTab === 'public' && <SearchPanel />}
      {activeTab === 'settings' && <Settings />}
    </div>
  );
};

// SkillList.tsx - Refresh after install
window.electron.ipc.on('github:install-complete', () => {
  refreshSkillList();
});
```

**Testing**:
- End-to-end test: Search → Preview → Install → Verify in local list
- Test tab switching preserves search state
- Test conflict between public skill and existing local skill

**Success Criteria**:
- [ ] "Public Search" tab appears in main navigation
- [ ] Installed skills appear in local skill list
- [ ] Tab switching preserves search query and results
- [ ] Skill list refreshes automatically after install

---

### Phase 4: Error Handling & Edge Cases (2-3 days)

**Goal**: Implement comprehensive error handling for all failure scenarios.

**Error Scenarios**:
1. GitHub API rate limit exceeded → Show message + link to Settings
2. Network failure during search → Show retry button
3. Skill directory not found (404) → Show "deleted or moved" message
4. Download timeout (>5s) → Show "taking longer" message + cancel option
5. Invalid skill (missing skill.md) → Show validation error
6. Permission denied on install → Show "check permissions" message
7. Large directory (>1MB) → Show size warning before install

**Implementation**:
```typescript
// GitHubService.ts - Error mapping
private mapGitHubError(error: any): IPCError {
  if (error.status === 403 && error.headers?.['x-ratelimit-remaining'] === '0') {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'GitHub API rate limit exceeded. Add a PAT in Settings for higher limits.',
      details: { resetTime: error.headers['x-ratelimit-reset'] }
    };
  }
  // ... other error mappings
}
```

**Testing**:
- Test each error scenario with mock GitHub API
- Verify error messages are actionable (contain solution)
- Test retry functionality

**Success Criteria**:
- [ ] All error scenarios handled with user-friendly messages
- [ ] 90% of error messages are actionable (SC-004)
- [ ] Retry button works for recoverable errors
- [ ] Network failures during install clean up partial downloads

---

### Phase 5: Performance Optimization (1-2 days)

**Goal**: Ensure all performance targets are met.

**Optimizations**:
1. Implement caching for search results (5-minute TTL)
2. Implement caching for preview content (5-minute TTL)
3. Throttle progress updates to 100ms intervals
4. Use Intersection Observer for infinite scroll (no polling)
5. Limit concurrent downloads to 5 files
6. Virtual scrolling for 500+ search results (if needed)

**Implementation**:
```typescript
// GitHubService.ts - Caching
private searchCache = new Map<string, { data: any; timestamp: number }>();

async searchSkills(query: string, page: number): Promise<SearchResult[]> {
  const cacheKey = `${query}:${page}`;
  const cached = this.searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
    return cached.data;
  }

  const results = await this.fetchFromGitHub(query, page);
  this.searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
  return results;
}
```

**Testing**:
- Performance test: Search <5s (95th percentile)
- Performance test: Preview <3s (files <500KB)
- Performance test: Install <10s (dirs <1MB)
- Memory test: App footprint <300MB with 500 search results

**Success Criteria**:
- [ ] Search returns results within 5 seconds (SC-001)
- [ ] Preview loads within 3 seconds for files <500KB (SC-002)
- [ ] Install completes within 10 seconds for dirs <1MB (SC-003)
- [ ] App memory footprint <300MB (constitution requirement)
- [ ] Debounce prevents >80% unnecessary API calls (SC-005)

---

## Testing Checklist

### Unit Tests
- [ ] GitHubService.searchSkills() - normal case
- [ ] GitHubService.searchSkills() - rate limit error
- [ ] GitHubService.previewSkill() - normal case
- [ ] GitHubService.previewSkill() - 404 error
- [ ] GitHubService.installSkill() - normal case
- [ ] GitHubService.installSkill() - conflict detection
- [ ] downloadUtils.downloadDirectory() - multi-file download
- [ ] downloadUtils.downloadDirectory() - cleanup on failure

### Integration Tests
- [ ] Search → Preview → Install flow (happy path)
- [ ] Search → Preview → Install flow (with conflict)
- [ ] Search → Cancel → Verify cleanup
- [ ] Install → Network failure → Verify cleanup
- [ ] Rate limit → Open Settings → Add PAT → Retry success

### UI Tests
- [ ] Search input debounced by 500ms
- [ ] Infinite scroll loads next page
- [ ] Preview modal displays skill.md and file tree
- [ ] Install dialog selects target directory
- [ ] Conflict dialog offers 3 options
- [ ] Progress bar updates during download
- [ ] Error messages display with retry button

### Performance Tests
- [ ] Search 500 skills → Measure load time
- [ ] Preview 500KB skill → Measure load time
- [ ] Install 1MB skill directory → Measure time
- [ ] Install 50 files → Measure memory usage

---

## Deployment Steps

1. **Code Review**: All changes reviewed and approved
2. **Testing**: All tests passing (unit, integration, performance)
3. **Documentation**: Update user documentation with public search features
4. **Merge**: Merge feature branch to main
5. **Release**: Include in next release notes

---

## Common Pitfalls

1. **Forgetting to cancel debounced searches** → Memory leaks
   - Solution: Use `useEffect` cleanup to cancel debounced calls

2. **Not handling GitHub API pagination** → Incomplete results
   - Solution: Use `page` and `per_page` parameters, implement infinite scroll

3. **Exposing PAT to frontend** → Security violation
   - Solution: All GitHub API calls must go through backend IPC

4. **Not validating target directory** → Security vulnerability
   - Solution: Validate paths are within authorized directories before install

5. **Not cleaning up partial downloads** → Disk space waste
   - Solution: Track downloaded files, clean up on failure/cancel

6. **Progress updates too frequent** → UI thrashing
   - Solution: Throttle progress updates to 100ms intervals

---

## Resources

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub Code Search API](https://docs.github.com/en/rest/search#search-code)
- [GitHub Git Data API](https://docs.github.com/en/rest/git)
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

---

## Next Steps

After completing this quickstart:
1. Run `/speckit.tasks` to generate detailed task breakdown
2. Review tasks.md for implementation order
3. Start with Phase 1 (Backend Foundation)
4. Iterate through phases sequentially
5. Mark tasks complete as you progress
