# Skills Registry API Integration

**Version**: 1.1.0
**Last Updated**: 2026-03-12
**Related Components**: `RegistryService.ts`, `SkillInstaller.ts`, `gitOperations.ts`

## Overview

The Skills Registry integration uses a hybrid architecture:
- **Discovery**: skills.sh API for centralized skill search
- **Distribution**: GitHub repositories for skill installation via git clone

This document covers the technical details of the API integration, error handling, and best practices.

---

## skills.sh API Specification

### Base URL

```
https://skills.sh
```

### Search Endpoint

**Endpoint**: `/api/search`
**Method**: `GET`
**Content-Type**: `application/json`

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query (URL-encoded) |
| `limit` | integer | No | 20 | Maximum number of results (1-100) |

#### Request Example

```http
GET /api/search?q=data%20analysis&limit=20 HTTP/1.1
Host: skills.sh
Accept: application/json
User-Agent: skillsMN-Desktop/1.0
```

#### Response Format

**Status**: `200 OK`

```json
{
  "skills": [
    {
      "id": "abc123-def456-ghi789",
      "skillId": "data-analysis-helper",
      "name": "Data Analysis Helper",
      "installs": 1247,
      "source": "username/data-analysis-skills"
    }
  ],
  "total": 1,
  "query": "data analysis"
}
```

#### Response Schema

```typescript
interface SearchSkillsResponse {
  skills: SearchSkillResult[];
  total: number;
  query: string;
}

interface SearchSkillResult {
  id: string;          // UUID v4 format
  skillId: string;     // Skill identifier (slug format)
  name: string;        // Display name (1-200 characters)
  installs: number;    // Installation count (≥ 0)
  source: string;      // GitHub repo path: "owner/repo"
}
```

#### Error Responses

**Status**: `400 Bad Request`

```json
{
  "error": "Invalid query parameter",
  "message": "Query must be at least 1 character"
}
```

**Status**: `429 Too Many Requests`

```json
{
  "error": "Rate limit exceeded",
  "message": "Try again in 60 seconds",
  "retryAfter": 60
}
```

**Status**: `500 Internal Server Error`

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

### Default Limits

- **Unauthenticated**: 60 requests per minute
- **Future**: Authenticated requests may have higher limits

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1647123456
```

### Client-Side Handling

```typescript
// src/main/services/RegistryService.ts
const response = await fetch(url.toString(), {
  method: 'GET',
  signal: controller.signal,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'skillsMN-Desktop/1.0'
  }
});

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') || '60';
  throw new Error(`Rate limited. Try again in ${retryAfter} seconds`);
}
```

---

## GitHub Repository Integration

### Repository URL Construction

```typescript
const repoUrl = `https://github.com/${source}.git`;
// Example: source = "username/repo"
// Result: "https://github.com/username/repo.git"
```

### Shallow Clone Strategy

**Command**:
```bash
git clone --depth 1 --single-branch https://github.com/username/repo.git
```

**Parameters**:
- `--depth 1`: Only fetch latest commit (faster download)
- `--single-branch`: Only clone default branch

**Timeout**: 5 minutes (300,000ms)

**Buffer Size**: 10MB (1024 * 1024 * 10 bytes)

### Git Error Detection

```typescript
// src/main/utils/gitOperations.ts
private parseGitError(errorMessage: string): { code: RegistryErrorCode; message: string } {
  if (errorMessage.includes('git') && errorMessage.includes('not found')) {
    return {
      code: 'GIT_NOT_FOUND',
      message: ERROR_MESSAGES.GIT_NOT_FOUND.user
    };
  }

  if (errorMessage.includes('Repository not found') || errorMessage.includes('404')) {
    return {
      code: 'REPO_NOT_FOUND',
      message: ERROR_MESSAGES.REPO_NOT_FOUND.user
    };
  }

  if (errorMessage.includes('Authentication failed') || errorMessage.includes('403')) {
    return {
      code: 'REPO_PRIVATE',
      message: ERROR_MESSAGES.REPO_PRIVATE.user
    };
  }

  if (errorMessage.includes('fatal:') || errorMessage.includes('error:')) {
    return {
      code: 'INSTALLATION_FAILED',
      message: ERROR_MESSAGES.INSTALLATION_FAILED.user
    };
  }

  return {
    code: 'INSTALLATION_FAILED',
    message: errorMessage
  };
}
```

---

## Error Code Mapping

### Error Code Hierarchy

```
RegistryErrorCode (Frontend)
    ↓
IPC Response
    ↓
RegistryErrorCode (Backend)
    ↓
Git Error / API Error
```

### Complete Error Code Table

| Code | Source | User Message | Retryable |
|------|--------|--------------|-----------|
| `REGISTRY_NETWORK_ERROR` | skills.sh API timeout/failure | Unable to connect to skills.sh. Check your internet connection. | Yes |
| `GIT_NOT_FOUND` | Git executable not in PATH | Git is required but not installed. Install from https://git-scm.com | No |
| `REPO_NOT_FOUND` | GitHub 404 response | This skill repository could not be found. It may have been moved or deleted. | No |
| `REPO_PRIVATE` | GitHub 403 response | This skill is in a private repository. Contact the author or search for public alternatives. | No |
| `REGISTRY_SKILL_NOT_FOUND` | No SKILL.md in repo | The specified skill was not found in the repository. | No |
| `REGISTRY_INVALID_SKILL` | Missing SKILL.md file | Invalid skill structure: SKILL.md file not found in the expected location. | No |
| `INSTALLATION_FAILED` | Generic git/IO error | Installation failed. Please try again. | Yes |

### Error Propagation Flow

```
1. Backend Error (gitOperations.ts)
   ↓
2. SkillInstaller catches and assigns code
   ↓
3. IPC Handler wraps in IPCResponse
   ↓
4. Preload exposes to renderer
   ↓
5. Frontend InstallDialog maps to UI
   ↓
6. User sees friendly message with action
```

### Example Error Handling

**Backend**:
```typescript
// src/main/services/SkillInstaller.ts
try {
  const cloneResult = await gitOperations.shallowClone(request.source, tempRoot);
  if (!cloneResult.success) {
    throw Object.assign(new Error(cloneResult.error), {
      code: cloneResult.errorCode
    });
  }
} catch (error: any) {
  return {
    success: false,
    error: error.message,
    errorCode: error.code || 'INSTALLATION_FAILED'
  };
}
```

**Frontend**:
```typescript
// src/renderer/components/InstallDialog.tsx
const ERROR_CONFIG: Record<string, { title: string; action: string; retryable: boolean }> = {
  GIT_NOT_FOUND: {
    title: 'Git Not Installed',
    action: 'Install Git from https://git-scm.com and restart the application',
    retryable: false
  },
  REPO_NOT_FOUND: {
    title: 'Repository Not Found',
    action: 'The skill repository may have been moved or deleted. Try searching for an alternative skill.',
    retryable: false
  },
  NETWORK_ERROR: {
    title: 'Network Error',
    action: 'Check your internet connection and try again',
    retryable: true
  }
};

// Display retry button only for retryable errors
{canRetry && (
  <button onClick={handleRetry}>
    <ArrowPathIcon className="w-4 h-4" />
    Try Again
  </button>
)}
```

---

## Skill Discovery Logic

### Multi-Skill Repository Support

Repositories may contain multiple skills in subdirectories:

```
repo-root/
├── skill-1/
│   └── SKILL.md
├── skill-2/
│   └── SKILL.md
└── README.md
```

### Discovery Algorithm

```typescript
// src/main/utils/skillDiscovery.ts
async findSkillByName(
  repoDir: string,
  skillName: string,
  maxDepth: number = 3
): Promise<string | undefined> {
  const entries = await readdirAsync(repoDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(repoDir, entry.name);

    // Case-insensitive directory name match
    if (entry.isDirectory() && entry.name.toLowerCase() === skillName.toLowerCase()) {
      const skillFilePath = path.join(fullPath, 'SKILL.md');
      if (fs.existsSync(skillFilePath)) {
        return fullPath;
      }
    }

    // Recursive search if depth allows
    if (entry.isDirectory() && maxDepth > 0) {
      const found = await this.findSkillByName(fullPath, skillName, maxDepth - 1);
      if (found) return found;
    }
  }

  return undefined;
}
```

### Fallback Behavior

If skill not found by name, fallback to first valid skill directory:

```typescript
const skillDir = await skillDiscovery.findSkillByName(tempRoot, request.skillId, 2)
  || await skillDiscovery.findFirstSkill(tempRoot, 2);
```

---

## Installation Metadata

### Source Metadata File

**Location**: `{skill_directory}/.source.json`

**Schema**:
```typescript
interface SkillSourceMetadata {
  type: 'registry';
  registryUrl: string;      // "https://skills.sh"
  source: string;           // "owner/repo"
  skillId: string;          // "skill-name"
  installedAt: string;      // ISO 8601 timestamp
  commitHash?: string;      // Git commit SHA (7+ chars)
}
```

**Example**:
```json
{
  "type": "registry",
  "registryUrl": "https://skills.sh",
  "source": "anthropics/claude-skills",
  "skillId": "code-review",
  "installedAt": "2026-03-12T10:30:45.123Z",
  "commitHash": "abc123d"
}
```

### Usage

```typescript
// Write metadata after installation
const sourceMetadata = createSkillSource(request.source, request.skillId, commitHash);
await fs.promises.writeFile(
  path.join(targetPath, '.source.json'),
  JSON.stringify(sourceMetadata, null, 2)
);

// Read metadata to check installation status
const metadata = JSON.parse(await fs.promises.readFile('.source.json', 'utf-8'));
if (metadata.type === 'registry' && metadata.skillId === skillId) {
  setIsInstalled(true);
}
```

---

## Progress Tracking

### Progress Event Structure

```typescript
interface InstallProgressEvent {
  stage: 'cloning' | 'discovering' | 'copying' | 'writing_metadata' | 'cleaning_up' | 'completed';
  message: string;
  progress?: number;  // 0-100
}
```

### Stage Mapping

| Stage | Progress | Description | Duration (Typical) |
|-------|----------|-------------|-------------------|
| `cloning` | 10% | Git clone --depth 1 | 2-10 seconds |
| `discovering` | 40% | Find skill directory | < 1 second |
| `copying` | 60% | Copy skill files | 1-3 seconds |
| `writing_metadata` | 80% | Write .source.json | < 1 second |
| `cleaning_up` | 90% | Remove temp directory | < 1 second |
| `completed` | 100% | Installation finished | - |

### Progress Event Flow

```
Main Process (SkillInstaller)
    ↓
IPC Handler sends via webContents.send()
    ↓
Renderer Process (preload.ts)
    ↓
React Component (InstallDialog)
    ↓
UI displays progress bar/message
```

### Example Implementation

**Main Process**:
```typescript
// src/main/services/SkillInstaller.ts
onProgress?.({ stage: 'cloning', message: 'Cloning repository...', progress: 10 });
const cloneResult = await gitOperations.shallowClone(request.source, tempRoot);

onProgress?.({ stage: 'discovering', message: 'Finding skill directory...', progress: 40 });
const skillDir = await skillDiscovery.findSkillByName(tempRoot, request.skillId, 2);
```

**Renderer Process**:
```typescript
// src/renderer/components/InstallDialog.tsx
useEffect(() => {
  window.electronAPI.onInstallProgress((event, progress: InstallProgressEvent) => {
    setInstallProgress(progress.message);
  });
}, []);
```

---

## Security Considerations

### HTTPS Only

All API calls use HTTPS:

```typescript
const url = `https://skills.sh/api/search?q=${encodeURIComponent(query)}`;
```

### Input Validation

**Search Query**:
```typescript
if (!query || typeof query !== 'string' || query.trim().length === 0) {
  throw new Error('Invalid search query');
}
```

**Source Path**:
```typescript
// Validate "owner/repo" format
if (!/^[^/]+\/[^/]+$/.test(source)) {
  throw new Error('Invalid source format');
}
```

### Path Traversal Prevention

```typescript
// Validate target directory is within skills root
const skillsRoot = PathBuf::from(&tool.skills_path);
const targetPath = path.join(targetDirectory, slugifiedName);

if (!targetPath.startsWith(skillsRoot)) {
  throw new Error('Invalid target directory');
}
```

### Temporary Directory Cleanup

**Guaranteed Cleanup**:
```typescript
const tempRoot = path.join(os.tmpdir(), `skillsMN-${uuidv4()}`);

try {
  // Installation logic...
} finally {
  // Always cleanup, even on error
  if (fs.existsSync(tempRoot)) {
    await fs.promises.rm(tempRoot, { recursive: true, force: true });
  }
}
```

---

## Testing Guidelines

### Unit Tests

**RegistryService**:
```typescript
describe('RegistryService', () => {
  it('should search skills with valid query', async () => {
    const results = await RegistryService.searchSkills('data analysis', 10);
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('should handle network errors', async () => {
    // Mock fetch to fail
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    await expect(RegistryService.searchSkills('test')).rejects.toThrow('Network error');
  });
});
```

**SkillInstaller**:
```typescript
describe('SkillInstaller', () => {
  it('should install skill from registry', async () => {
    const result = await skillInstaller.installFromRegistry(
      { source: 'owner/repo', skillId: 'test-skill', targetToolId: 'claude-code' },
      '/tmp/skills'
    );
    expect(result.success).toBe(true);
    expect(result.skillPath).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('Registry Integration', () => {
  it('should search and install skill end-to-end', async () => {
    // 1. Search
    const results = await window.electronAPI.searchRegistry('code review');
    expect(results.success).toBe(true);
    expect(results.data.length).toBeGreaterThan(0);

    // 2. Install
    const skill = results.data[0];
    const installResult = await window.electronAPI.installFromRegistry({
      source: skill.source,
      skillId: skill.skillId,
      targetToolId: 'claude-code'
    }, testDirectory);

    expect(installResult.success).toBe(true);

    // 3. Verify
    const metadata = JSON.parse(
      await fs.promises.readFile(path.join(installResult.skillPath, '.source.json'), 'utf-8')
    );
    expect(metadata.skillId).toBe(skill.skillId);
  });
});
```

---

## Performance Optimization

### Debounced Search

```typescript
// src/renderer/hooks/useRegistrySearch.ts
const debouncedSearch = useCallback(async (searchQuery: string) => {
  if (!searchQuery.trim()) {
    setResults([]);
    return;
  }

  setIsLoading(true);
  try {
    const searchResults = await searchRegistry(searchQuery);
    setResults(searchResults);
  } finally {
    setIsLoading(false);
  }
}, [debounceMs]);

useEffect(() => {
  const timeoutId = setTimeout(() => {
    debouncedSearch(query);
  }, 400);  // 400ms debounce

  return () => clearTimeout(timeoutId);
}, [query, debouncedSearch]);
```

### Shallow Clone

```bash
# Only fetch latest commit, not full history
git clone --depth 1 --single-branch https://github.com/owner/repo.git
```

**Benefits**:
- 80-95% faster than full clone
- 90% less disk space
- Still includes all skill files

### Parallel Installation

Multiple skills can be installed in parallel:

```typescript
const skills = ['skill-1', 'skill-2', 'skill-3'];
const results = await Promise.all(
  skills.map(skillId => skillInstaller.installFromRegistry({ skillId, ... }))
);
```

---

## Troubleshooting

### Common Issues

**1. "Git Not Found" Error**

**Cause**: Git executable not in system PATH

**Solution**:
```bash
# Verify git is installed
git --version

# Add to PATH (Windows)
setx PATH "%PATH%;C:\Program Files\Git\bin"

# Restart application after PATH update
```

**2. "Repository Not Found" Error**

**Cause**: Repository deleted, moved, or renamed

**Solution**:
- Search for alternative skill with similar functionality
- Check skills.sh for updated skill information
- Contact skill author if known

**3. "Network Error" During Search**

**Cause**: skills.sh API unreachable

**Solution**:
- Check internet connection
- Verify firewall allows HTTPS to skills.sh
- Try again (transient network issues)

**4. Installation Stuck at "Cloning"**

**Cause**: Large repository or slow network

**Solution**:
- Wait up to 5 minutes (timeout limit)
- Check network speed
- Try installing smaller skill

### Debug Logging

Enable verbose logging:

```typescript
// src/main/services/RegistryService.ts
console.log(`[RegistryService] Searching for: ${query}`);
console.log(`[RegistryService] Request URL: ${url}`);
console.log(`[RegistryService] Response status: ${response.status}`);
```

```typescript
// src/main/utils/gitOperations.ts
console.log(`[GitOperations] Cloning ${source} to ${targetDir}`);
console.log(`[GitOperations] Clone completed in ${duration}ms`);
```

---

## API Changelog

### v1.1.0 (2026-03-12)

**Added**:
- Initial skills.sh registry integration
- `/api/search` endpoint support
- Multi-skill repository support
- Installation progress tracking
- Error code propagation system
- Source metadata tracking

**Performance**:
- 400ms search debounce
- Shallow git clone (depth=1)
- Parallel installation support

---

## Future Enhancements

### Planned Features

1. **Authenticated API** (v1.2)
   - API key support for higher rate limits
   - Personalized skill recommendations
   - Usage analytics

2. **Skill Updates** (v1.2)
   - Check for updates based on commit hash
   - One-click update functionality
   - Changelog viewing

3. **Offline Cache** (v1.3)
   - Cache search results locally
   - Install previously downloaded skills
   - Sync when online

4. **Batch Installation** (v1.3)
   - Install multiple skills at once
   - Dependency resolution
   - Installation queue

---

## References

- **skills.sh API Documentation**: https://skills.sh/docs/api
- **GitHub REST API**: https://docs.github.com/en/rest
- **Git Documentation**: https://git-scm.com/docs
- **Electron IPC Guide**: https://www.electronjs.org/docs/latest/tutorial/ipc

---

**Maintained By**: skillsMN Development Team
**Contact**: https://github.com/anthropics/skillsMN/issues
