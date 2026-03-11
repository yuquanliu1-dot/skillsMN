# Research: Private Repository Sync

**Date**: 2026-03-10
**Feature**: 005-private-repo-sync

## Research Questions

### 1. Electron safeStorage Best Practices for Credential Management

**Decision**: Use Electron's `safeStorage` API for PAT encryption with platform-specific fallbacks

**Rationale**:
- Electron's `safeStorage` uses platform-specific credential storage:
  - Windows: DPAPI (Data Protection API)
  - macOS: Keychain Access
  - Linux: Secret Service API (libsecret)
- Provides automatic encryption/decryption without managing encryption keys
- Built-in to Electron, no additional dependencies required
- Industry-standard approach for desktop credential storage

**Implementation Pattern**:
```typescript
// Encryption (when saving PAT)
const encryptedPAT = safeStorage.encryptString(pat);

// Decryption (when using PAT for API calls)
const decryptedPAT = safeStorage.decryptString(encryptedPAT);
```

**Alternatives Considered**:
- **node-keytar**: Requires native dependencies, complex build process, but more flexible
- **Custom encryption with crypto**: Requires key management, higher risk of implementation errors
- **Plaintext storage**: SECURITY VIOLATION - violates Constitution II

**Recommendations**:
- Store encrypted PATs in JSON configuration file
- Decrypt only when needed for API calls (never store in memory long-term)
- Clear decrypted PATs from memory immediately after use
- Provide clear error messages if platform credential store is unavailable

---

### 2. GitHub API Patterns for Private Repository Access

**Decision**: Use GitHub REST API v3 with PAT authentication for repository access and tree traversal

**Rationale**:
- REST API v3 is stable and well-documented
- PAT authentication is straightforward and aligns with user workflow
- Tree API allows recursive directory scanning with depth control
- Rate limit (5000 requests/hour with PAT) is sufficient for typical usage

**Key API Endpoints**:
```typescript
// Repository metadata and validation
GET /repos/{owner}/{repo}
Headers: Authorization: token {PAT}

// Recursive tree traversal (get all files/directories)
GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1

// Get directory contents with commit info
GET /repos/{owner}/{repo}/contents/{path}?ref={branch}

// Get commit details for directory (update detection)
GET /repos/{owner}/{repo}/commits?path={directory_path}
```

**Implementation Pattern**:
1. Test connection: Fetch repository metadata, validate PAT permissions
2. Scan repository: Use recursive tree API to find all skill.md files (respect 5-level depth limit)
3. Get skill metadata: For each directory with skill.md, fetch commit history
4. Track updates: Compare local directory commit SHA with remote commit SHA

**Alternatives Considered**:
- **GitHub GraphQL API**: More efficient for complex queries, but steeper learning curve and overkill for this use case
- **GitHub Apps**: Requires app registration, more complex OAuth flow, better for multi-user scenarios but not needed for PAT-based access
- **Git clone + local scan**: Requires full repository download, slower and more storage-intensive

**Rate Limiting Strategy**:
- Cache repository skill lists for 5 minutes (FR-014)
- Use conditional requests with ETags when possible
- Implement exponential backoff on rate limit errors
- Display rate limit status to users

---

### 3. Directory-Level Commit SHA Tracking for Update Detection

**Decision**: Track the latest commit SHA that modified each skill directory path

**Rationale**:
- GitHub API provides commit history per path
- Directory-level tracking is simpler than file-level and matches spec requirement
- Comparing SHAs is fast and reliable (no need to download content)
- Aligns with spec clarification: "Directory-level commit SHA"

**Implementation Pattern**:
```typescript
interface InstalledSkillMetadata {
  sourceRepoId: string;
  installDate: Date;
  installedDirectoryCommitSHA: string; // SHA of commit that last modified this directory
}

// Update detection
const remoteCommits = await githubService.getDirectoryCommitHistory(owner, repo, skillPath);
const latestRemoteSHA = remoteCommits[0].sha;

if (latestRemoteSHA !== localMetadata.installedDirectoryCommitSHA) {
  // Update available
}
```

**API Usage**:
```typescript
// Get commits for a directory path
GET /repos/{owner}/{repo}/commits?path={directory_path}
// Returns array of commits, most recent first
```

**Alternatives Considered**:
- **File-level SHA tracking**: More granular but significantly more complex, requires tracking multiple SHAs per skill
- **Tag/version-based tracking**: Requires repository maintainers to use tags, not under our control
- **Last modified timestamp**: Unreliable across timezones, doesn't capture all changes
- **Content hash**: Requires downloading entire directory to compute hash, defeats purpose of update detection

**Edge Cases**:
- Directory deleted from remote: API returns empty commit list or 404
- Repository renamed: Use repository ID instead of URL for tracking (more stable)
- Force pushes: SHA comparison still works (commit history reflects current state)

---

### 4. React + Tailwind Patterns for Desktop Dashboard Applications

**Decision**: Use functional components with hooks, Tailwind utility classes, and existing application patterns

**Rationale**:
- Aligns with existing codebase architecture
- Functional components are simpler and easier to test
- Tailwind utility classes provide rapid styling without custom CSS
- Hooks provide clean state management

**Component Architecture**:
```typescript
// PrivateRepoList.tsx - Container component
export function PrivateRepoList() {
  const [repos, setRepos] = useState<PrivateRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [skills, setSkills] = useState<PrivateSkill[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch repos on mount
  useEffect(() => { loadRepos(); }, []);

  // Fetch skills when repo selected
  useEffect(() => {
    if (selectedRepo) loadSkills(selectedRepo);
  }, [selectedRepo]);

  return (
    <div className="space-y-4">
      <RepoSelector repos={repos} onSelect={setSelectedRepo} />
      {loading && <LoadingSpinner />}
      <SkillGrid skills={skills} onInstall={handleInstall} />
    </div>
  );
}
```

**Styling Patterns** (from UI/UX Requirements):
- Repository cards: `bg-white border border-gray-100 text-gray-600`
- Selector dropdown: `bg-gray-50 border border-gray-200 focus:border-blue-600`
- Update badges: `bg-amber-50 text-amber-700 animate-pulse`
- Success indicators: `text-emerald-500`
- Error indicators: `text-red-500`

**Performance Optimizations**:
- Virtual scrolling for large skill lists (react-window or similar)
- Debounced search/filter inputs
- Lazy loading of skill details
- Optimistic UI updates where appropriate

**Alternatives Considered**:
- **CSS-in-JS (styled-components)**: Adds runtime overhead, conflicts with Tailwind approach
- **Class components**: Legacy pattern, harder to test, not recommended for new code
- **Redux for state**: Overkill for this feature, existing useState/useContext sufficient

---

### 5. File Download and Directory Structure Preservation

**Decision**: Use GitHub Contents API to download files recursively, preserving directory structure

**Rationale**:
- Contents API provides file content and metadata
- Recursive download allows preserving subdirectory structure
- No need for git clone (lighter weight)
- Supports both files and directories

**Implementation Pattern**:
```typescript
async function downloadSkillDirectory(
  owner: string,
  repo: string,
  path: string,
  targetDir: string,
  pat: string
): Promise<void> {
  // Get directory contents
  const contents = await githubService.getDirectoryContents(owner, repo, path, pat);

  for (const item of contents) {
    if (item.type === 'file') {
      // Download file content
      const content = await githubService.getFileContent(item.url, pat);
      await fs.writeFile(path.join(targetDir, item.name), content);
    } else if (item.type === 'dir') {
      // Recursively download subdirectory
      await fs.mkdir(path.join(targetDir, item.name));
      await downloadSkillDirectory(owner, repo, item.path, path.join(targetDir, item.name), pat);
    }
  }
}
```

**Error Handling**:
- Partial download cleanup: Remove target directory if download fails mid-way
- Disk space validation: Check available space before starting download
- Progress reporting: Emit progress events for large directories

**Alternatives Considered**:
- **Git clone --sparse-checkout**: Requires git binary, more complex, slower for single directory
- **GitHub Archive API**: Downloads entire repository, wasteful for single skill
- **Tarball download**: Requires decompression, more complex error handling

---

### 6. Cross-Platform Path Handling

**Decision**: Use Node.js `path` module exclusively, avoid string concatenation

**Rationale**:
- Node.js `path` module handles platform differences automatically
- Prevents common bugs with Windows backslashes vs Unix forward slashes
- Consistent with existing codebase patterns

**Implementation Pattern**:
```typescript
import * as path from 'path';

// GOOD: Platform-aware path construction
const skillPath = path.join(skillDirectory, 'skill.md');

// BAD: String concatenation (platform-specific)
const skillPath = skillDirectory + '/' + 'skill.md'; // Fails on Windows
```

**Key Functions**:
- `path.join()`: Join path segments
- `path.resolve()`: Resolve to absolute path
- `path.dirname()`: Get parent directory
- `path.basename()`: Get filename/directory name
- `path.extname()`: Get file extension

---

## Technology Stack Confirmation

Based on research findings, the technology stack is confirmed:

**Backend (Main Process)**:
- TypeScript 5.x (strict mode)
- Node.js LTS (v20+)
- Electron (latest stable)
- GitHub REST API v3 (via octokit or native fetch)

**Frontend (Renderer Process)**:
- React 18+ (functional components + hooks)
- Tailwind CSS (utility-first styling)
- Monaco Editor (existing, for skill preview)

**Security**:
- Electron safeStorage (credential encryption)

**Testing**:
- Jest (unit tests)
- Playwright or Spectron (integration tests, if needed)

**Performance**:
- 5-minute cache for repository skill lists
- Virtual scrolling for large lists
- Optimistic UI updates

---

## Dependencies on Other Features

**002-local-skill-management** (required):
- File save operations (install skill directory)
- Conflict resolution logic (overwrite/rename/skip)
- Local skill list display (show installed skills with source metadata)

**004-public-skill-discovery** (required):
- Shared installation UI components (InstallDialog)
- Error handling patterns
- Notification system

**Integration Points**:
- Extend existing `GitHubService` with private repository methods
- Extend existing `Skill` model with source repository metadata
- Add "Private Repos" tab to main navigation
- Extend Settings page with repository configuration UI

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| GitHub API rate limiting | Implement 5-minute caching, display rate limit status, use conditional requests |
| Large repositories (>500 skills) | Pagination (50 skills per page), search/filter, virtual scrolling |
| PAT expiration | Clear error message with link to Settings, detect 401 responses |
| Network failures | Retry logic with exponential backoff, offline indicator |
| Disk space exhaustion | Validate available space before download, cleanup on failure |
| Cross-platform path issues | Use Node.js `path` module exclusively, test on all platforms |

---

## Next Steps (Phase 1: Design & Contracts)

1. **Data Model**: Define `PrivateRepo`, `PrivateSkill`, and `InstalledSkillMetadata` models
2. **Contracts**: Document IPC interface for private repository operations
3. **Quickstart**: Create developer guide for implementing private repo features
4. **Agent Context Update**: Run update-agent-context.ps1 to add new technologies to CLAUDE.md
