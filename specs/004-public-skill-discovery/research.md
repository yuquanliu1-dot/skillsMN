# Research: Public Skill Discovery

**Date**: 2026-03-10
**Feature**: 004-public-skill-discovery

## Research Tasks

### 1. GitHub Code Search API for Finding Skill Directories

**Decision**: Use GitHub Code Search API with `filename:skill.md` query to find repositories containing skill directories.

**Rationale**:
- GitHub Code Search API supports searching for files by filename
- Query `filename:skill.md` returns all files named `skill.md` in public repositories
- Parent directory names can be extracted from file paths to identify skill directories
- Supports pagination (100 items per page max) and rate limiting

**Alternatives Considered**:
1. **Repository Search API**: Only searches repository metadata, not file contents. Cannot find skill.md files.
2. **GraphQL API**: More complex setup, requires GitHub App authentication. REST API sufficient for search needs.
3. **Web scraping**: Violates GitHub ToS, brittle, no rate limit handling. REST API is official and stable.

**Implementation Notes**:
- API endpoint: `GET https://api.github.com/search/code?q=filename:skill.md&page=1&per_page=20`
- Requires authentication for higher rate limits (60/hr unauthenticated vs 5000/hr with PAT)
- Response includes: repository info, file path, download URL
- Must extract skill directory name from file path (parent directory of skill.md)

**Code Example**:
```typescript
async searchSkills(query: string, page: number = 1): Promise<SearchResult[]> {
  const searchQuery = `filename:skill.md ${query}`;
  const response = await fetch(
    `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}&page=${page}&per_page=20`,
    {
      headers: {
        'Authorization': `token ${this.pat}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  return data.items.map(item => this.parseSearchResult(item));
}
```

---

### 2. Downloading Skill Directories with Git Data API

**Decision**: Use GitHub Git Data API (Trees + Contents endpoints) to enumerate all files in skill directory, then download each file individually via raw URLs.

**Rationale**:
- GitHub API doesn't support downloading entire directories directly
- Git Trees API can enumerate all files in a directory recursively
- Raw URLs (`https://raw.githubusercontent.com/...`) provide direct file downloads
- Preserves directory structure by maintaining relative paths during download

**Alternatives Considered**:
1. **Git clone**: Requires git installed, downloads entire repository (slow for large repos). Overkill for single directory.
2. **Repository archive download**: Downloads entire repository as zip. Still overkill, requires extraction.
3. **GitHub Contents API for each file**: Multiple API calls per file (inefficient). Trees API is more efficient for enumeration.

**Implementation Notes**:
- Use Trees API to get recursive file list: `GET /repos/:owner/:repo/git/trees/:tree_sha?recursive=1`
- Filter tree entries by skill directory path
- Construct raw URLs: `https://raw.githubusercontent.com/:owner/:repo/:branch/:path`
- Download files in parallel with concurrency limit (5 concurrent downloads)
- Preserve directory structure using relative paths

**Code Example**:
```typescript
async downloadSkillDirectory(
  owner: string,
  repo: string,
  skillPath: string,
  targetDir: string
): Promise<void> {
  // 1. Get repository tree
  const tree = await this.getRepoTree(owner, repo);

  // 2. Filter files in skill directory
  const skillFiles = tree.filter(entry =>
    entry.path.startsWith(skillPath + '/') &&
    entry.type === 'blob'
  );

  // 3. Download files in parallel (limit 5 concurrent)
  await this.downloadFilesWithConcurrency(skillFiles, owner, repo, targetDir, 5);
}

private async downloadFilesWithConcurrency(
  files: TreeEntry[],
  owner: string,
  repo: string,
  targetDir: string,
  concurrency: number
): Promise<void> {
  const queue = new PQueue({ concurrency });
  const tasks = files.map(file =>
    queue.add(() => this.downloadFile(file, owner, repo, targetDir))
  );
  await Promise.all(tasks);
}
```

---

### 3. Debouncing Search Input

**Decision**: Implement 500ms debounce on search input using lodash.debounce or custom debounce function.

**Rationale**:
- Prevents excessive API calls while user is typing
- 500ms is standard debounce delay - fast enough to feel responsive, slow enough to avoid waste
- Constitution requires preventing >80% of unnecessary API calls (SC-005)

**Alternatives Considered**:
1. **Throttling**: Limits calls to fixed interval but still makes calls during typing. Debounce waits for pause.
2. **No debounce**: Wastes API quota, poor UX with flickering results.
3. **300ms debounce**: Too aggressive, may trigger before user finishes typing.
4. **1000ms debounce**: Too slow, feels unresponsive.

**Implementation Notes**:
- Use React useEffect with debounce function
- Cancel pending debounced calls on unmount to prevent memory leaks
- Cancel previous search when new search starts

**Code Example**:
```typescript
import { debounce } from 'lodash';

const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const debouncedSearch = useMemo(
    () => debounce((searchQuery: string) => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      }
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search skills..."
    />
  );
};
```

---

### 4. Conflict Resolution Patterns

**Decision**: Three-option conflict dialog (Overwrite, Rename with timestamp, Skip) with "Apply to all" checkbox for bulk operations.

**Rationale**:
- Common pattern in file managers (Windows Explorer, macOS Finder)
- Users expect these three standard options
- "Apply to all" improves UX for bulk installs
- Timestamp suffix is clear and unique

**Alternatives Considered**:
1. **Two options (Overwrite/Skip)**: Users lose rename option, may lead to duplicate skills with manual renames.
2. **Auto-rename without asking**: Confusing, users may not understand where skill went.
3. **Force overwrite**: Dangerous, users lose existing work without warning.
4. **UUID suffix**: Less readable than timestamp.

**Implementation Notes**:
- Check for existing directory before starting download
- If exists, show modal with three options
- Timestamp format: `YYYYMMDD-HHMMSS` (e.g., `react-hooks-20260310-143022`)
- "Apply to all" stores user preference for remaining conflicts

**Code Example**:
```typescript
interface ConflictResolution {
  action: 'overwrite' | 'rename' | 'skip';
  applyToAll: boolean;
}

async function resolveConflict(
  skillName: string,
  targetPath: string
): Promise<ConflictResolution> {
  return new Promise((resolve) => {
    showConflictDialog({
      skillName,
      existingPath: targetPath,
      onResolve: (resolution) => resolve(resolution)
    });
  });
}

async function installSkill(request: InstallRequest): Promise<void> {
  const targetPath = path.join(request.targetDir, request.skillName);

  if (fs.existsSync(targetPath)) {
    const resolution = await resolveConflict(request.skillName, targetPath);

    if (resolution.action === 'skip') {
      return;
    } else if (resolution.action === 'rename') {
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
      request.skillName = `${request.skillName}-${timestamp}`;
    }
  }

  await downloadSkillDirectory(request);
}
```

---

### 5. Pagination Implementation

**Decision**: Infinite scroll pagination for search results (load more on scroll) with 20 items per page.

**Rationale**:
- GitHub API supports pagination with `page` and `per_page` parameters
- 20 items per page balances initial load time with result visibility
- Infinite scroll provides smoother UX than "Load More" button
- Constitution requires supporting 500+ skills (pagination essential)

**Alternatives Considered**:
1. **Load More button**: Requires extra click, less fluid UX.
2. **Traditional pagination (1, 2, 3...)**: Requires more UI, less common in modern search interfaces.
3. **50 items per page**: Slower initial load, may overwhelm users.
4. **10 items per page**: Too few items, excessive scrolling.

**Implementation Notes**:
- Use Intersection Observer API to detect when user scrolls near bottom
- Maintain current page state
- Append new results to existing list
- Show loading indicator while fetching next page
- Disable pagination when no more results (GitHub returns empty array)

**Code Example**:
```typescript
const SearchResults: React.FC = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore]);

  const loadMore = async () => {
    const nextPage = page + 1;
    const newResults = await searchSkills(query, nextPage);

    if (newResults.length === 0) {
      setHasMore(false);
    } else {
      setResults([...results, ...newResults]);
      setPage(nextPage);
    }
  };

  return (
    <div>
      {results.map(result => <SearchResultCard key={result.id} result={result} />)}
      {hasMore && <div ref={loaderRef}>Loading more...</div>}
    </div>
  );
};
```

---

### 6. Error Handling for GitHub API

**Decision**: Implement comprehensive error handling with user-friendly messages for rate limits, network failures, 404s, and timeouts.

**Rationale**:
- Constitution requires actionable error messages (SC-004: 90% actionable)
- GitHub API has multiple failure modes that require different user actions
- Clear error messages improve UX and reduce support burden

**Error Types and Messages**:
1. **Rate limit exceeded**: "GitHub API rate limit exceeded. Wait 10 minutes or add a Personal Access Token in Settings for higher limits."
2. **Network failure**: "Network error. Please check your connection and try again."
3. **404 Not Found**: "Skill directory not found. It may have been moved or deleted from the repository."
4. **Timeout (>5s)**: "Taking longer than expected..." with cancel option
5. **Invalid skill directory**: "Invalid skill: missing skill.md file or empty content."

**Implementation Notes**:
- Use try-catch in all API calls
- Map HTTP status codes to user-friendly messages
- Include retry button for recoverable errors
- Log all errors with context for debugging

**Code Example**:
```typescript
async function handleGitHubError(error: any): Promise<void> {
  if (error.status === 403 && error.headers?.['x-ratelimit-remaining'] === '0') {
    showError({
      message: "GitHub API rate limit exceeded. Wait 10 minutes or add a Personal Access Token in Settings for higher limits.",
      action: { label: "Open Settings", onClick: openSettings }
    });
  } else if (error.status === 404) {
    showError({
      message: "Skill directory not found. It may have been moved or deleted from the repository.",
      action: { label: "Retry", onClick: retryOperation }
    });
  } else if (error.message?.includes('NetworkError')) {
    showError({
      message: "Network error. Please check your connection and try again.",
      action: { label: "Retry", onClick: retryOperation }
    });
  } else {
    showError({
      message: "An unexpected error occurred. Please try again.",
      action: { label: "Retry", onClick: retryOperation }
    });
  }
}
```

---

### 7. Progress Tracking for Multi-File Downloads

**Decision**: Track download progress by counting completed files and display progress bar with percentage.

**Rationale**:
- Skill directories may contain multiple files (assets, templates, subdirectories)
- Users need feedback during download to know operation is progressing
- File count is more reliable than byte count for progress (GitHub raw URLs don't always provide Content-Length)

**Alternatives Considered**:
1. **Byte-based progress**: Requires Content-Length headers, not always available from GitHub raw URLs.
2. **Spinner only**: No sense of progress or time remaining.
3. **No progress indicator**: Users may think app is frozen.

**Implementation Notes**:
- Calculate total file count before starting download
- Emit progress events after each file completes
- Display as progress bar: `[████████░░░░░░░░] 50% (5/10 files)`
- Update in real-time without blocking UI

**Code Example**:
```typescript
async function downloadWithProgress(
  files: TreeEntry[],
  onProgress: (completed: number, total: number) => void
): Promise<void> {
  let completed = 0;
  const total = files.length;

  for (const file of files) {
    await downloadFile(file);
    completed++;
    onProgress(completed, total);
  }
}

// Usage
await downloadWithProgress(skillFiles, (completed, total) => {
  const percentage = Math.round((completed / total) * 100);
  updateProgressBar(percentage);
  updateProgressText(`${completed}/${total} files`);
});
```

---

## Summary of Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| Search API | GitHub Code Search with `filename:skill.md` | Finds all skill directories efficiently |
| Directory Download | Git Trees API + individual file downloads | Preserves structure, no git required |
| Debounce | 500ms lodash.debounce | Prevents >80% unnecessary API calls |
| Conflict Resolution | 3 options (Overwrite/Rename/Skip) + Apply to all | Matches user expectations, flexible |
| Pagination | Infinite scroll, 20 per page | Smooth UX, handles 500+ skills |
| Error Handling | User-friendly messages + retry actions | 90% actionable errors (SC-004) |
| Progress Tracking | File count-based progress bar | Clear feedback during downloads |

All research decisions align with constitution requirements and support the performance targets defined in the specification.
