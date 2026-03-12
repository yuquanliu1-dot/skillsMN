# Data Model: Skills Registry Search Integration

**Feature**: 006-skills-registry-search
**Date**: 2026-03-12
**Purpose**: Define entities, relationships, and data structures for the registry search feature

## Overview

This feature introduces data models for:
1. Search queries and results from the skills.sh registry
2. Installation requests from the frontend
3. Source metadata for tracking installed skills

All models are implemented in TypeScript with strict typing and validation.

## Entity Definitions

### 1. SearchSkillResult

**Purpose**: Represents a skill discovered through the skills.sh registry API

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| id | string | Yes | Unique identifier from registry | Non-empty string |
| skillId | string | Yes | Skill identifier (may differ from id) | Non-empty string |
| name | string | Yes | Display name of the skill | Non-empty string, max 200 chars |
| installs | number | Yes | Number of installations | Non-negative integer |
| source | string | Yes | GitHub repository path | Format: "org/repo" or "user/repo" |

**Relationships**:
- Source maps to a GitHub repository URL: `https://github.com/{source}`
- skillId maps to a specific skill directory within the repository

**State Transitions**: N/A (immutable data from API)

**Example**:
```typescript
{
  id: "abc123-def456",
  skillId: "my-awesome-skill",
  name: "My Awesome Skill",
  installs: 1542,
  source: "skills-org/skills-collection"
}
```

**Implementation**:
```typescript
// src/main/models/SearchSkillResult.ts
export interface SearchSkillResult {
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
}

// Validation function
export function validateSearchSkillResult(data: unknown): data is SearchSkillResult {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === 'string' && obj.id.length > 0 &&
    typeof obj.skillId === 'string' && obj.skillId.length > 0 &&
    typeof obj.name === 'string' && obj.name.length > 0 && obj.name.length <= 200 &&
    typeof obj.installs === 'number' && Number.isInteger(obj.installs) && obj.installs >= 0 &&
    typeof obj.source === 'string' && /^[^/]+\/[^/]+$/.test(obj.source)
  );
}
```

---

### 2. InstallFromRegistryRequest

**Purpose**: Represents a user's request to install a skill from the registry

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| source | string | Yes | GitHub repository path | Format: "org/repo" |
| skillId | string | Yes | Skill identifier to install | Non-empty string |
| targetToolId | string | Yes | Tool to install skill to | Valid tool ID from config |

**Relationships**:
- source + skillId reference a SearchSkillResult
- targetToolId references a configured tool in the application

**State Transitions**:
```
PENDING → IN_PROGRESS → COMPLETED
                    → FAILED
```

**Example**:
```typescript
{
  source: "skills-org/skills-collection",
  skillId: "my-awesome-skill",
  targetToolId: "claude-code"
}
```

**Implementation**:
```typescript
// src/main/models/InstallFromRegistryRequest.ts
export interface InstallFromRegistryRequest {
  source: string;
  skillId: string;
  targetToolId: string;
}

export function validateInstallRequest(data: unknown): data is InstallFromRegistryRequest {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.source === 'string' && /^[^/]+\/[^/]+$/.test(obj.source) &&
    typeof obj.skillId === 'string' && obj.skillId.length > 0 &&
    typeof obj.targetToolId === 'string' && obj.targetToolId.length > 0
  );
}

export enum InstallStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}
```

---

### 3. SkillSource

**Purpose**: Metadata tracking the source of an installed skill for updates and traceability

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| type | string | Yes | Source type identifier | Must be "registry" |
| registryUrl | string | Yes | Base URL of the registry | Valid HTTPS URL |
| source | string | Yes | GitHub repository path | Format: "org/repo" |
| skillId | string | Yes | Skill identifier | Non-empty string |
| installedAt | string | Yes | ISO 8601 timestamp | Valid ISO date string |
| commitHash | string | No | Git commit hash | 40-character hex string |

**Relationships**:
- Links installed skill directory back to source repository
- Enables future update checking and source verification

**State Transitions**: N/A (created once during installation, immutable)

**Example**:
```typescript
{
  type: "registry",
  registryUrl: "https://skills.sh",
  source: "skills-org/skills-collection",
  skillId: "my-awesome-skill",
  installedAt: "2026-03-12T10:30:45.123Z",
  commitHash: "abc123def456789012345678901234567890abcd"
}
```

**Implementation**:
```typescript
// src/main/models/SkillSource.ts
export interface SkillSource {
  type: 'registry';
  registryUrl: string;
  source: string;
  skillId: string;
  installedAt: string;
  commitHash?: string;
}

export function createSkillSource(
  source: string,
  skillId: string,
  commitHash?: string
): SkillSource {
  return {
    type: 'registry',
    registryUrl: 'https://skills.sh',
    source,
    skillId,
    installedAt: new Date().toISOString(),
    ...(commitHash && { commitHash })
  };
}

export function isRegistrySkill(skillSource: SkillSource | undefined): boolean {
  return skillSource?.type === 'registry';
}
```

---

### 4. SearchSkillsResponse

**Purpose**: API response wrapper from skills.sh registry

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| skills | SearchSkillResult[] | Yes | Array of search results | Valid array of results |

**Implementation**:
```typescript
// src/main/models/SearchSkillsResponse.ts
import { SearchSkillResult, validateSearchSkillResult } from './SearchSkillResult';

export interface SearchSkillsResponse {
  skills: SearchSkillResult[];
}

export function validateSearchResponse(data: unknown): data is SearchSkillsResponse {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.skills)) return false;

  return obj.skills.every(skill => validateSearchSkillResult(skill));
}
```

---

## Data Flow

### Search Flow
```
User Input (string)
    ↓
Debounce (400ms)
    ↓
URL Encode Query
    ↓
HTTP GET → https://skills.sh/api/search?q={query}&limit=20
    ↓
JSON Response → SearchSkillsResponse
    ↓
Validate → SearchSkillResult[]
    ↓
Display to User
```

### Installation Flow
```
User Selection (SearchSkillResult)
    ↓
User Chooses Target Tool
    ↓
InstallFromRegistryRequest
    ↓
Create Temp Directory
    ↓
Git Clone → https://github.com/{source}
    ↓
Discover Skill Directory (find SKILL.md)
    ↓
Validate SKILL.md exists
    ↓
Parse Skill Metadata
    ↓
Copy to Target Directory
    ↓
Write SkillSource → .source.json
    ↓
Cleanup Temp Directory
    ↓
Return SkillInfo
```

---

## Storage Locations

### Installed Skills
- **Location**: `{targetTool.skillsPath}/{slugifiedSkillName}/`
- **Files**: All skill files + `.source.json`
- **Example**: `~/.claude/skills/my-awesome-skill/SKILL.md`

### Source Metadata
- **Location**: `{skillDirectory}/.source.json`
- **Format**: JSON file with SkillSource structure
- **Purpose**: Track installation source for future updates

### Temporary Clone
- **Location**: `{os.tmpdir()}/skillsMN-registry-{timestamp}-{uuid}/`
- **Lifetime**: Duration of installation operation only
- **Cleanup**: Always (success or failure)

---

## Validation Rules

### Common Validations
1. **GitHub Repository Path**: Must match pattern `^[^/]+\/[^/]+$`
   - Valid: "org/repo", "user-name/repo-name"
   - Invalid: "org", "org/repo/extra", "org//repo"

2. **Skill Identifier**: Non-empty string, alphanumeric with hyphens and underscores
   - Valid: "my-skill", "skill_name", "Skill123"
   - Invalid: "", "skill with spaces"

3. **ISO 8601 Timestamp**: Must be valid ISO date string
   - Valid: "2026-03-12T10:30:45.123Z"
   - Invalid: "2026-03-12", "invalid-date"

### API Response Validation
- All required fields present
- Types match specification
- Array elements validated individually
- Invalid results filtered out with warning log

### Installation Request Validation
- Source format validated
- Target tool ID verified against configuration
- Skill ID sanitized before use in paths

---

## Error Handling

### Invalid API Response
```typescript
try {
  const response = await fetch(apiUrl);
  const data = await response.json();

  if (!validateSearchResponse(data)) {
    logger.error('Invalid API response structure', { data });
    throw new Error('Received invalid data from registry');
  }

  return data.skills;
} catch (error) {
  // Handle error
}
```

### Validation Failures
- Log detailed error with context
- Return user-friendly error message
- Do not expose internal validation details
- Track validation failures for API monitoring

---

## Future Considerations

### Skill Updates
- SkillSource enables checking for updates by comparing commitHash
- Could add `lastCheckedAt` field for update check scheduling
- May need `updateAvailable` boolean in future

### Multiple Registries
- Current design assumes single registry (skills.sh)
- `registryUrl` field supports multiple registries if needed in future
- `type: 'registry'` allows for other source types (local, git-url, etc.)

### Installation History
- Could add installation tracking to central database
- Enable features like "recently installed", "most used skills"
- Not required for MVP

---

## Implementation Checklist

- [ ] Create `SearchSkillResult.ts` with validation
- [ ] Create `InstallFromRegistryRequest.ts` with validation
- [ ] Create `SkillSource.ts` with factory function
- [ ] Create `SearchSkillsResponse.ts` with validation
- [ ] Add validation utilities to existing `validation.ts`
- [ ] Update shared types in `src/shared/types.ts`
- [ ] Write unit tests for all validation functions
- [ ] Document JSON schemas for API responses
