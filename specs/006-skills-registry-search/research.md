# Research: Skills Registry Search Integration

**Feature**: 006-skills-registry-search
**Date**: 2026-03-12
**Purpose**: Resolve technical unknowns and document best practices for implementation

## Research Questions

### 1. Skills.sh API Integration

**Question**: What are the exact API endpoints, request/response formats, and error handling requirements for the skills.sh registry?

**Decision**: Use the documented API endpoint at `https://skills.sh/api/search` with the following specifications:

**Rationale**:
- API is publicly accessible without authentication
- Returns JSON with consistent structure
- Supports URL-encoded query parameters
- Limits results to 20 items per request

**Implementation Details**:
- **Endpoint**: `GET https://skills.sh/api/search?q={query}&limit=20`
- **Query encoding**: Use `encodeURIComponent()` for search terms
- **Response format**:
  ```typescript
  {
    skills: Array<{
      id: string;
      skillId: string;
      name: string;
      installs: number;
      source: string; // Format: "org/repo"
    }>
  }
  ```
- **Error handling**:
  - HTTP 4xx/5xx: Display user-friendly error message
  - Network timeout: 10-second timeout with retry option
  - Invalid JSON: Log error and show "Search failed" message
- **Rate limiting**: No documented limits, but debounce prevents excessive calls

**Alternatives Considered**:
- Direct GitHub search: Rejected because it doesn't provide skill-specific metadata (installs, skillId)
- Local caching of registry: Rejected to ensure always up-to-date results

---

### 2. Git Operations for Shallow Cloning

**Question**: What is the most efficient and reliable way to perform shallow git clones for skill installation?

**Decision**: Use Node.js `child_process.exec()` to run git commands with shallow clone options.

**Rationale**:
- Git is already a required dependency for the application
- Shallow clone (depth=1) minimizes download time and disk usage
- `exec()` provides simple async interface with error handling
- Temporary directory ensures isolation and easy cleanup

**Implementation Details**:
```typescript
// Command template
git clone --depth 1 https://github.com/{source} {tempDir}

// Error scenarios to handle:
- Git not found in PATH
- Repository doesn't exist (HTTP 404)
- Repository is private (authentication failure)
- Network timeout
- Disk space insufficient
```

**Alternatives Considered**:
- `isomorphic-git`: Rejected because it requires additional dependencies and doesn't provide significant benefits over system git
- GitHub API archive download: Rejected because it doesn't preserve repository structure needed for skill discovery

---

### 3. Skill Directory Discovery

**Question**: How to reliably locate skill directories within a cloned repository that may contain multiple skills or nested structures?

**Decision**: Implement recursive directory search with SKILL.md file detection, supporting multiple skill layouts.

**Rationale**:
- Repositories can contain multiple skills in subdirectories
- SKILL.md is the definitive marker for a valid skill directory
- Need to handle both root-level skills and nested skill collections

**Implementation Details**:
```typescript
// Discovery strategy:
1. Check if root directory contains SKILL.md → single skill repo
2. If not, scan immediate subdirectories for SKILL.md → multi-skill repo
3. Match by skillId if provided, otherwise use first found skill
4. Limit search depth to 2 levels to avoid performance issues

// Directory structure patterns:
Pattern A (single skill):
  repo/
    SKILL.md
    skill-file.ts

Pattern B (multi-skill):
  repo/
    skills/
      skill-a/
        SKILL.md
      skill-b/
        SKILL.md

Pattern C (named collection):
  repo/
    my-skill-name/
      SKILL.md
```

**Alternatives Considered**:
- Require skill location in metadata: Rejected because skills.sh API doesn't provide path information
- Search entire repository tree: Rejected due to performance concerns with large repositories

---

### 4. Search Debouncing Implementation

**Question**: What is the best approach to implement debounced search in React while maintaining responsiveness?

**Decision**: Use custom React hook with `useEffect` and `setTimeout` for 400ms debounce.

**Rationale**:
- Native React hooks avoid additional dependencies
- 400ms provides good balance between responsiveness and API load reduction
- Cleanup on unmount prevents memory leaks and stale requests

**Implementation Details**:
```typescript
// Custom hook structure:
const useDebouncedSearch = (query: string, delay: number = 400) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  return debouncedQuery;
};

// Usage in component:
const debouncedQuery = useDebouncedSearch(searchInput);
useEffect(() => {
  if (debouncedQuery) {
    searchSkills(debouncedQuery);
  }
}, [debouncedQuery]);
```

**Alternatives Considered**:
- Lodash debounce: Rejected to avoid unnecessary dependency
- useDebounce library: Rejected because custom implementation is straightforward

---

### 5. Temporary File Management

**Question**: How to ensure reliable cleanup of temporary git clone directories across all platforms and failure scenarios?

**Decision**: Use try-finally pattern with Node.js `fs.promises.rm()` and OS temp directory.

**Rationale**:
- `fs.promises.rm({ recursive: true, force: true })` is cross-platform reliable
- OS temp directory is standard location for transient files
- Unique directory names prevent collisions between concurrent installations
- finally block ensures cleanup even on errors

**Implementation Details**:
```typescript
// Temporary directory naming:
const tempDir = path.join(
  os.tmpdir(),
  `skillsMN-registry-${Date.now()}-${randomUUID()}`
);

// Cleanup pattern:
let tempDir: string | null = null;
try {
  tempDir = await createTempDir();
  await cloneRepository(source, tempDir);
  await installSkill(tempDir, targetDir);
} catch (error) {
  // Handle error
  throw error;
} finally {
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
```

**Alternatives Considered**:
- Keep clones for caching: Rejected to minimize disk usage
- Manual cleanup on app exit: Rejected as unreliable if app crashes

---

### 6. Error Message Design

**Question**: How to provide actionable error messages for non-technical users while maintaining debugging information?

**Decision**: Implement user-friendly error messages with error codes and suggested actions, logging technical details separately.

**Rationale**:
- Users need to understand what went wrong and how to fix it
- Technical details should be logged for debugging but not exposed to users
- Consistent error structure enables better error handling in UI

**Implementation Details**:
```typescript
// Error types and messages:
const ERROR_MESSAGES = {
  GIT_NOT_FOUND: {
    user: "Git is required but not installed. Please install Git and restart the application.",
    action: "Install Git from https://git-scm.com"
  },
  REPO_NOT_FOUND: {
    user: "This skill repository could not be found. It may have been moved or deleted.",
    action: "Try searching for an alternative skill"
  },
  PRIVATE_REPO: {
    user: "This skill is in a private repository and cannot be installed.",
    action: "Contact the skill author or search for public alternatives"
  },
  INVALID_SKILL: {
    user: "This skill is missing required files and cannot be installed.",
    action: "Contact the skill author about this issue"
  },
  NETWORK_ERROR: {
    user: "Unable to connect to the skill registry. Please check your internet connection.",
    action: "Check your network and try again"
  },
  DISK_SPACE: {
    user: "Not enough disk space to install this skill.",
    action: "Free up disk space and try again"
  }
};

// Logging format:
[ERROR] Registry-Install - 2026-03-12T10:30:45Z
  Skill: skill-name
  Source: org/repo
  Error: GitError: repository not found
  Stack: [full stack trace]
```

**Alternatives Considered**:
- Technical error messages: Rejected as confusing for non-technical users
- Generic "Installation failed" message: Rejected as not actionable

---

### 7. Skill Metadata Persistence

**Question**: What metadata should be stored for installed skills and how should it be structured?

**Decision**: Extend existing skill metadata with source tracking information stored in a `.source.json` file within the skill directory.

**Rationale**:
- Maintains compatibility with existing skill structure
- Provides traceability back to source repository
- Enables future features like updates or source verification
- Separate file keeps SKILL.md clean

**Implementation Details**:
```typescript
// Metadata structure (.source.json):
{
  "type": "registry",
  "registryUrl": "https://skills.sh",
  "source": "org/repo",
  "skillId": "skill-name",
  "installedAt": "2026-03-12T10:30:45Z",
  "commitHash": "abc123" // Optional: from git rev-parse HEAD
}

// File location:
skills-directory/
  my-skill/
    SKILL.md
    skill-file.ts
    .source.json
```

**Alternatives Considered**:
- Store in central database: Rejected because it creates synchronization issues
- Add to SKILL.md: Rejected to avoid modifying user-editable file

---

## Technology Stack Decisions

### HTTP Client
**Decision**: Use existing `node-fetch` dependency
**Rationale**: Already in package.json, sufficient for simple GET requests

### UUID Generation
**Decision**: Use existing `uuid` package for temporary directory names
**Rationale**: Already in dependencies, provides collision-safe unique IDs

### Path Operations
**Decision**: Use Node.js `path` module with existing `PathValidator` service
**Rationale**: Platform-agnostic, integrates with existing security validation

### File Operations
**Decision**: Use `fs.promises` API with recursive copy utility
**Rationale**: Native async/await support, cross-platform compatibility

---

## Performance Considerations

### Search Performance
- **Target**: <3 seconds for search + display
- **Optimization**: Debouncing prevents redundant API calls
- **Monitoring**: Log API response times for performance tracking

### Installation Performance
- **Target**: <30 seconds (excluding network time)
- **Optimization**: Shallow clone (depth=1) minimizes data transfer
- **Monitoring**: Track clone duration and file copy duration

### Memory Management
- **Concern**: Large repositories could consume memory during clone
- **Mitigation**: Use temp directory, cleanup immediately after copy
- **Monitoring**: Log directory sizes for capacity planning

---

## Security Considerations

### API Communication
- ✅ HTTPS-only for skills.sh API
- ✅ No credentials transmitted (public API)
- ✅ Timeout prevents hanging requests

### File System Operations
- ✅ Use PathValidator for all file paths
- ✅ Temporary files in OS temp directory
- ✅ Cleanup on success and failure

### Git Operations
- ✅ Only public repositories (no credential exposure)
- ✅ Shallow clone limits data exposure
- ✅ No git config changes

---

## Testing Strategy

### Unit Tests Required
1. RegistryService API calls (mocked HTTP responses)
2. SkillInstaller installation logic (mocked git operations)
3. Skill directory discovery (various repository structures)
4. Error handling for each failure scenario

### Integration Tests Required
1. Full search → install → verify flow
2. Concurrent installation handling
3. Error recovery and cleanup

### Manual Testing Checklist
- [ ] Search with various query types (short, long, special characters)
- [ ] Install skills from single-skill repositories
- [ ] Install skills from multi-skill repositories
- [ ] Test error scenarios (network down, git not found, private repo)
- [ ] Verify temporary file cleanup
- [ ] Test on Windows, macOS, and Linux
- [ ] Verify light/dark mode UI
- [ ] Test keyboard navigation and accessibility

---

## Open Questions

**None** - All technical questions have been resolved through research and design decisions documented above.

## Next Steps

With research complete, proceed to Phase 1:
1. Create `data-model.md` with entity definitions
2. Create contract files in `/contracts/` directory
3. Create `quickstart.md` for development setup
4. Update agent context with new technologies
