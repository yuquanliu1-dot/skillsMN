# API Contract: Skills.sh Registry

**Feature**: 006-skills-registry-search
**Date**: 2026-03-12
**Version**: 1.0.0
**Base URL**: https://skills.sh

## Overview

This contract defines the external API integration with the skills.sh registry service for skill discovery.

## Endpoints

### Search Skills

**Endpoint**: `GET /api/search`

**Purpose**: Search for skills in the registry by query string

**Authentication**: None (public API)

**Rate Limiting**: Not documented (implement client-side debouncing)

**Request Parameters**:

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| q | string | Yes | Search query | Non-empty, URL-encoded, max 500 chars |
| limit | number | No | Maximum results to return | Default: 20, Max: 100 |

**Request Example**:
```http
GET /api/search?q=react%20hooks&limit=20 HTTP/1.1
Host: skills.sh
Accept: application/json
```

**Success Response** (200 OK):
```json
{
  "skills": [
    {
      "id": "abc123-def456",
      "skillId": "react-hooks-collection",
      "name": "React Hooks Collection",
      "installs": 5420,
      "source": "facebook/react"
    },
    {
      "id": "xyz789-uvw012",
      "skillId": "custom-react-hooks",
      "name": "Custom React Hooks",
      "installs": 3201,
      "source": "react-community/hooks"
    }
  ]
}
```

**Response Schema**:
```typescript
interface SearchResponse {
  skills: Array<{
    id: string;        // UUID format
    skillId: string;   // Skill identifier (alphanumeric, hyphens, underscores)
    name: string;      // Display name (1-200 characters)
    installs: number;  // Installation count (non-negative integer)
    source: string;    // GitHub path "org/repo" or "user/repo"
  }>;
}
```

**Error Responses**:

| Status Code | Description | Response Body |
|-------------|-------------|---------------|
| 400 | Invalid query parameter | `{"error": "Invalid query parameter"}` |
| 429 | Rate limit exceeded | `{"error": "Rate limit exceeded"}` |
| 500 | Server error | `{"error": "Internal server error"}` |
| 503 | Service unavailable | `{"error": "Service temporarily unavailable"}` |

**Error Response Schema**:
```typescript
interface ErrorResponse {
  error: string;
  details?: string;
}
```

---

## Client Implementation

### Service Class

```typescript
// src/main/services/RegistryService.ts
import fetch from 'node-fetch';
import { SearchSkillResult, validateSearchSkillResult } from '../models/SearchSkillResult';

const REGISTRY_BASE_URL = 'https://skills.sh';
const SEARCH_TIMEOUT_MS = 10000;
const DEFAULT_LIMIT = 20;

export class RegistryService {
  /**
   * Search for skills in the registry
   * @param query - Search query string
   * @param limit - Maximum number of results (default: 20)
   * @returns Array of search results
   */
  async search(query: string, limit: number = DEFAULT_LIMIT): Promise<SearchSkillResult[]> {
    // Validate input
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Build URL
    const url = new URL('/api/search', REGISTRY_BASE_URL);
    url.searchParams.set('q', query.trim());
    url.searchParams.set('limit', limit.toString());

    try {
      // Make request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'skillsMN/0.1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      // Parse JSON response
      const data = await response.json();

      // Validate response structure
      if (!data.skills || !Array.isArray(data.skills)) {
        throw new Error('Invalid API response: missing skills array');
      }

      // Validate each result and filter invalid ones
      const validResults: SearchSkillResult[] = [];
      for (const skill of data.skills) {
        if (validateSearchSkillResult(skill)) {
          validResults.push(skill);
        } else {
          console.warn('Invalid skill result received:', skill);
        }
      }

      return validResults;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Search request timed out');
      }
      throw error;
    }
  }

  private async handleHttpError(response: fetch.Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Response body not JSON, use status text
    }

    switch (response.status) {
      case 400:
        throw new Error(`Invalid request: ${errorMessage}`);
      case 429:
        throw new Error('Rate limit exceeded. Please try again later.');
      case 500:
      case 503:
        throw new Error('Registry service temporarily unavailable. Please try again later.');
      default:
        throw new Error(`Registry error: ${errorMessage}`);
    }
  }
}

export const registryService = new RegistryService();
```

---

## Error Handling

### Client-Side Errors

| Error Type | User Message | Recovery Action |
|------------|--------------|-----------------|
| Network failure | "Unable to connect to skills registry. Check your internet connection." | Retry button |
| Timeout (10s) | "Search is taking too long. Please try again." | Retry button |
| Invalid query | "Invalid search query. Please try different keywords." | Clear query |
| Rate limit (429) | "Too many searches. Please wait a moment and try again." | Auto-retry after 60s |
| Server error (5xx) | "Registry service is temporarily unavailable." | Retry button |
| Parse error | "Received invalid data from registry." | Retry button |

### Logging

Log all API interactions with:
- Timestamp
- Request URL and parameters
- Response status code
- Response time
- Error details (if applicable)

**Example Log**:
```
[INFO] Registry API Request - 2026-03-12T10:30:45.123Z
  URL: https://skills.sh/api/search?q=react&limit=20
  Method: GET

[INFO] Registry API Response - 2026-03-12T10:30:46.456Z
  Status: 200 OK
  Duration: 1333ms
  Results: 15 skills returned

[ERROR] Registry API Error - 2026-03-12T10:35:22.789Z
  URL: https://skills.sh/api/search?q=invalid&limit=20
  Status: 500 Internal Server Error
  Error: Internal server error
  Duration: 234ms
```

---

## Rate Limiting Strategy

### Client-Side Implementation

```typescript
// Debounce search input to prevent excessive API calls
const DEBOUNCE_MS = 400;

let lastSearchTime = 0;

export async function debouncedSearch(query: string): Promise<SearchSkillResult[]> {
  const now = Date.now();
  const timeSinceLastSearch = now - lastSearchTime;

  if (timeSinceLastSearch < DEBOUNCE_MS) {
    await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS - timeSinceLastSearch));
  }

  lastSearchTime = Date.now();
  return registryService.search(query);
}
```

### User Feedback

- Show loading spinner during search
- Disable search input while request in flight
- Display "Searching..." text during API call

---

## Testing Strategy

### Unit Tests

1. **URL Construction**:
   - Test query encoding (special characters, spaces)
   - Test limit parameter handling
   - Test URL building with various inputs

2. **Response Validation**:
   - Test valid response parsing
   - Test invalid response handling
   - Test partial validation (some results invalid)

3. **Error Handling**:
   - Test network failure
   - Test timeout handling
   - Test various HTTP error codes
   - Test malformed JSON response

### Integration Tests

1. **Live API Testing** (with mock server):
   - Test actual HTTP requests
   - Verify request headers
   - Test rate limiting behavior

2. **Error Scenarios**:
   - Server returns 500
   - Server returns malformed JSON
   - Network timeout

### Contract Tests

1. **Schema Validation**:
   - Verify response matches TypeScript types
   - Test all field types and constraints
   - Test required vs optional fields

2. **Backward Compatibility**:
   - Test with missing optional fields
   - Test with additional unknown fields (should be ignored)

---

## Mock Server for Testing

```typescript
// tests/mocks/registryServer.ts
import express from 'express';

export function createMockRegistryServer() {
  const app = express();

  app.get('/api/search', (req, res) => {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    // Validate query
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid query parameter' });
    }

    // Return mock results
    const results = [
      {
        id: 'test-skill-1',
        skillId: 'test-skill',
        name: 'Test Skill',
        installs: 100,
        source: 'test-org/test-repo'
      }
    ];

    res.json({ skills: results });
  });

  return app;
}
```

---

## Performance Requirements

- **Search latency**: <3 seconds end-to-end
- **Timeout**: 10 seconds maximum
- **Concurrent requests**: Support up to 5 concurrent searches
- **Result limit**: Default 20, maximum 100

---

## Security Considerations

1. **HTTPS Only**: All requests use HTTPS
2. **No Authentication**: Public API, no credentials required
3. **Input Validation**: Validate query before sending
4. **Timeout Protection**: Prevent hanging requests
5. **Error Sanitization**: Don't expose internal errors to users

---

## Monitoring

Track these metrics:
- Request success rate
- Average response time
- Error rate by status code
- Rate limit occurrences
- Timeout frequency

---

## Future Considerations

### Pagination
- API may add pagination in future (offset/limit or cursor-based)
- Current design assumes all results in single response
- Plan for pagination support if result sets grow large

### Caching
- Could cache search results client-side (5-minute TTL)
- Must invalidate on error or rate limit
- Consider localStorage for recent searches

### Advanced Search
- May add filters (by category, author, etc.)
- May add sorting options
- Current design supports query string only

---

## Versioning

- **Current Version**: 1.0.0
- **Stability**: API contract is stable
- **Breaking Changes**: Will be announced and versioned
- **Deprecation**: 6-month notice for breaking changes

---

## Support

- **Documentation**: https://skills.sh/docs/api
- **Status Page**: https://status.skills.sh
- **Contact**: api@skills.sh
