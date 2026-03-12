# Quickstart: Skills Registry Search Integration

**Feature**: 006-skills-registry-search
**Date**: 2026-03-12

## Overview

This quickstart guide provides step-by-step instructions for implementing the Skills Registry Search Integration feature. This feature replaces direct GitHub search with the skills.sh registry API for skill discovery.

## Prerequisites

### Required Software
- Node.js 20+ LTS
- Git 2.0+
- VS Code (recommended) or another TypeScript IDE

### Required Knowledge
- TypeScript (strict mode)
- React 18+ and hooks
- Electron IPC (main/renderer processes)
- Jest testing framework

### Project Setup
```bash
# Clone the repository
git clone <repository-url>
cd skillsMN

# Install dependencies
npm install

# Ensure you're on the feature branch
git checkout 006-skills-registry-search

# Verify build works
npm run build
npm test
```

---

## Implementation Order

Follow this order for optimal development flow:

### Phase 1: Backend Models and Services (Day 1-2)

1. **Data Models** (`src/main/models/`)
   - Create `SearchSkillResult.ts`
   - Create `InstallFromRegistryRequest.ts`
   - Create `SkillSource.ts`
   - Add validation functions
   - Write unit tests

2. **Registry Service** (`src/main/services/RegistryService.ts`)
   - Implement API client for skills.sh
   - Add error handling
   - Add logging
   - Write unit tests with mocked HTTP

3. **Git Operations** (`src/main/utils/gitOperations.ts`)
   - Implement shallow clone
   - Add error parsing
   - Add progress callbacks
   - Write unit tests

4. **Skill Discovery** (`src/main/utils/skillDiscovery.ts`)
   - Implement directory search
   - Handle multiple repository patterns
   - Write unit tests

5. **Skill Installer** (`src/main/services/SkillInstaller.ts`)
   - Combine git operations + discovery + copy
   - Add temporary file management
   - Add source metadata writing
   - Write unit tests

### Phase 2: IPC Layer (Day 2-3)

6. **IPC Handlers** (`src/main/ipc/registryHandlers.ts`)
   - Implement `registry:search` handler
   - Implement `registry:install` handler
   - Implement `registry:check-installed` handler
   - Add progress events
   - Write unit tests

7. **Preload Script** (`src/main/preload.ts`)
   - Expose registry APIs to renderer
   - Add type definitions
   - Test IPC communication

### Phase 3: Frontend (Day 3-4)

8. **Design UI Components** (Use ui-ux-pro-max skill)
   - Research search UI patterns
   - Design component structure
   - Plan user interactions
   - Document design decisions

9. **Frontend Client** (`src/renderer/services/registryClient.ts`)
   - Implement IPC client wrapper
   - Add error handling
   - Write unit tests

10. **React Hook** (`src/renderer/hooks/useRegistrySearch.ts`)
    - Implement debounced search
    - Add loading states
    - Add error states
    - Write unit tests

11. **UI Components** (`src/renderer/components/`)
    - `RegistrySearch.tsx` - Main search interface
    - `SearchResultsList.tsx` - Results display
    - `SkillResultCard.tsx` - Individual result
    - `InstallDialog.tsx` - Tool selection dialog
    - Add loading/error states
    - Write component tests

### Phase 4: Integration and Testing (Day 4-5)

12. **Integration Tests**
    - Test full search → install flow
    - Test error scenarios
    - Test concurrent operations
    - Verify cleanup

13. **Manual Testing**
    - Test on Windows, macOS, Linux
    - Test various search queries
    - Test installation scenarios
    - Test error handling

14. **Performance Testing**
    - Measure search latency
    - Measure installation time
    - Test with large result sets
    - Profile memory usage

---

## Step-by-Step Implementation

### Step 1: Create Data Models

```bash
# Create model files
touch src/main/models/SearchSkillResult.ts
touch src/main/models/InstallFromRegistryRequest.ts
touch src/main/models/SkillSource.ts
```

**Example - SearchSkillResult.ts**:
```typescript
export interface SearchSkillResult {
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
}

export function validateSearchSkillResult(data: unknown): data is SearchSkillResult {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === 'string' && obj.id.length > 0 &&
    typeof obj.skillId === 'string' && obj.skillId.length > 0 &&
    typeof obj.name === 'string' && obj.name.length > 0 &&
    typeof obj.installs === 'number' && Number.isInteger(obj.installs) &&
    typeof obj.source === 'string' && /^[^/]+\/[^/]+$/.test(obj.source)
  );
}
```

**Write Test**:
```typescript
// tests/unit/models/SearchSkillResult.test.ts
import { validateSearchSkillResult } from '../../../src/main/models/SearchSkillResult';

describe('SearchSkillResult', () => {
  it('should validate correct data', () => {
    const valid = {
      id: 'abc123',
      skillId: 'my-skill',
      name: 'My Skill',
      installs: 100,
      source: 'org/repo'
    };

    expect(validateSearchSkillResult(valid)).toBe(true);
  });

  it('should reject invalid source format', () => {
    const invalid = {
      id: 'abc123',
      skillId: 'my-skill',
      name: 'My Skill',
      installs: 100,
      source: 'invalid-source'
    };

    expect(validateSearchSkillResult(invalid)).toBe(false);
  });
});
```

### Step 2: Implement Registry Service

```typescript
// src/main/services/RegistryService.ts
import fetch from 'node-fetch';
import { SearchSkillResult, validateSearchSkillResult } from '../models/SearchSkillResult';

export class RegistryService {
  private baseUrl = 'https://skills.sh';

  async search(query: string, limit: number = 20): Promise<SearchSkillResult[]> {
    const url = new URL('/api/search', this.baseUrl);
    url.searchParams.set('q', query.trim());
    url.searchParams.set('limit', limit.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();

    return data.skills.filter(validateSearchSkillResult);
  }
}
```

### Step 3: Implement Git Operations

```typescript
// src/main/utils/gitOperations.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitOperations {
  async shallowClone(source: string, targetDir: string): Promise<void> {
    const repoUrl = `https://github.com/${source}.git`;

    await execAsync(
      `git clone --depth 1 --single-branch "${repoUrl}" "${targetDir}"`,
      { timeout: 300000 }
    );
  }
}
```

### Step 4: Create IPC Handlers

```typescript
// src/main/ipc/registryHandlers.ts
import { ipcMain } from 'electron';
import { registryService } from '../services/RegistryService';

export function registerRegistryHandlers() {
  ipcMain.handle('registry:search', async (event, { query }) => {
    return await registryService.search(query);
  });

  ipcMain.handle('registry:install', async (event, request) => {
    // Installation logic
  });
}
```

### Step 5: Update Preload Script

```typescript
// src/main/preload.ts (additions)
const registryAPI = {
  search: (query: string) => ipcRenderer.invoke('registry:search', { query }),
  install: (request: any) => ipcRenderer.invoke('registry:install', request),
  onInstallProgress: (callback: any) => {
    const listener = (event: any, data: any) => callback(data);
    ipcRenderer.on('registry:install:progress', listener);
    return () => ipcRenderer.removeListener('registry:install:progress', listener);
  }
};

contextBridge.exposeInMainWorld('electron', {
  // ... existing APIs
  registrySearch: registryAPI.search,
  registryInstall: registryAPI.install,
  onRegistryInstallProgress: registryAPI.onInstallProgress
});
```

### Step 6: Create Frontend Hook

```typescript
// src/renderer/hooks/useRegistrySearch.ts
import { useState, useEffect } from 'react';
import { SearchSkillResult } from '../../shared/types';

export function useRegistrySearch(debounceMs: number = 400) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchSkillResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const searchResults = await window.electron.registrySearch(searchQuery);
      setResults(searchResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { query, setQuery, results, loading, error };
}
```

### Step 7: Create UI Components

```typescript
// src/renderer/components/RegistrySearch.tsx
import React from 'react';
import { useRegistrySearch } from '../hooks/useRegistrySearch';
import { SearchResultsList } from './SearchResultsList';

export function RegistrySearch() {
  const { query, setQuery, results, loading, error } = useRegistrySearch();

  return (
    <div className="registry-search">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for skills..."
        className="search-input"
      />

      {loading && <div className="loading">Searching...</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && <SearchResultsList results={results} />}
    </div>
  );
}
```

---

## Testing Strategy

### Run Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- SearchSkillResult.test.ts

# Run with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration
```

### Test Checklist
- [ ] All model validation functions tested
- [ ] Registry service tested with mocked HTTP
- [ ] Git operations tested with test repositories
- [ ] IPC handlers tested with mocked services
- [ ] React hooks tested with testing-library
- [ ] Components tested with various states
- [ ] Integration tests cover full flow
- [ ] Error scenarios covered

---

## Debugging Tips

### Backend Debugging
```typescript
// Add logging to services
import { logger } from '../utils/logger';

logger.info('Registry search started', { query });
logger.error('Clone failed', { error: error.message, stack: error.stack });
```

### Frontend Debugging
```typescript
// Use React DevTools
// Add console logs in development
if (process.env.NODE_ENV === 'development') {
  console.log('Search results:', results);
}
```

### IPC Debugging
```typescript
// Log all IPC calls in development
if (process.env.NODE_ENV === 'development') {
  ipcMain.on('*', (event, ...args) => {
    console.log('IPC:', event.channel, args);
  });
}
```

---

## Common Issues

### Git Not Found
**Error**: "Git is not installed or not in PATH"
**Solution**: Install Git and ensure it's in system PATH

### API Timeout
**Error**: "Search request timed out"
**Solution**: Check internet connection, verify skills.sh is accessible

### Permission Denied
**Error**: "Cannot write to skills directory"
**Solution**: Check directory permissions, run with appropriate privileges

### Invalid Skill Structure
**Error**: "Skill missing SKILL.md file"
**Solution**: Verify repository structure, contact skill author

---

## Performance Optimization

### Search Optimization
- Debounce input (400ms)
- Cache recent searches (optional)
- Cancel pending requests on new input

### Installation Optimization
- Shallow clone (depth=1)
- Single branch only
- Cleanup temp files immediately
- Show progress to user

### Rendering Optimization
- Virtual scrolling for large result lists
- Lazy load skill details
- Memoize components appropriately

---

## Next Steps

1. Review [research.md](./research.md) for detailed technical decisions
2. Review [data-model.md](./data-model.md) for entity definitions
3. Review contracts in [contracts/](./contracts/) for interface specifications
4. Start implementing following the order above
5. Write tests as you implement each component
6. Run integration tests frequently
7. Test manually on all platforms

---

## Resources

- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [React Hooks Documentation](https://react.dev/reference/react)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Skills.sh API Documentation](https://skills.sh/docs/api)

---

## Support

- **Technical Questions**: Review research.md and contracts
- **Implementation Issues**: Check existing tests for examples
- **API Issues**: Check skills.sh status page
- **Feature Questions**: Review spec.md user scenarios

Good luck with the implementation! 🚀
