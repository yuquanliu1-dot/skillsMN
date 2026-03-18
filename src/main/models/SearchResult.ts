/**
 * Search Result Model
 *
 * Represents a GitHub repository containing Claude Code skills
 */

export interface SkillFileMatch {
  /** Path to SKILL.md file within repository */
  path: string;
  /** Directory path containing the skill */
  directoryPath: string;
  /** Raw GitHub URL for file content */
  downloadUrl: string;
  /** Last modification timestamp */
  lastModified: Date;
}

export interface SearchResult {
  /** Full repository name (owner/repo) */
  repositoryName: string;
  /** GitHub repository URL */
  repositoryUrl: string;
  /** Repository description */
  description: string;
  /** Star count */
  stars: number;
  /** Fork count */
  forks: number;
  /** Whether repository is archived */
  archived: boolean;
  /** Primary language */
  language: string | null;
  /** Default branch name */
  defaultBranch: string;
  /** Array of skill files found in repository */
  skillFiles: SkillFileMatch[];
  /** Total number of skill files found */
  totalSkills: number;
}

export interface GitHubSearchResponse {
  /** Search results */
  results: SearchResult[];
  /** Total count of results */
  totalCount: number;
  /** Whether results are incomplete due to rate limiting */
  incomplete: boolean;
  /** Rate limit information */
  rateLimit: RateLimitInfo;
}

export interface RateLimitInfo {
  /** Remaining requests */
  remaining: number;
  /** Total requests allowed */
  limit: number;
  /** Reset time as Unix timestamp */
  resetTime: number;
  /** Reset time as Date */
  resetDate: Date;
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): string | null {
  if (!query || query.trim().length === 0) {
    return 'Search query is required';
  }

  if (query.length < 2) {
    return 'Search query must be at least 2 characters';
  }

  if (query.length > 256) {
    return 'Search query must be less than 256 characters';
  }

  return null;
}

/**
 * Create SearchResult from GitHub API response
 */
export function createSearchResultFromGitHub(data: any): SearchResult {
  const skillFiles: SkillFileMatch[] = [];
  
  // Extract skill files from repository tree
  if (data.tree && Array.isArray(data.tree)) {
    for (const item of data.tree) {
      if (item.type === 'blob' && item.path.endsWith('SKILL.md')) {
        const directoryPath = item.path.substring(0, item.path.lastIndexOf('/'));
        
        skillFiles.push({
          path: item.path,
          directoryPath,
          downloadUrl: `https://raw.githubusercontent.com/${data.repositoryName}/main/${item.path}`,
          lastModified: new Date(), // Will be updated when we fetch actual file info
        });
      }
    }
  }

  return {
    repositoryName: data.full_name || data.repositoryName,
    repositoryUrl: data.html_url || `https://github.com/${data.full_name}`,
    description: data.description || 'No description available',
    stars: data.stargazers_count || data.stars || 0,
    forks: data.forks_count || data.forks || 0,
    archived: data.archived || false,
    language: data.language,
    defaultBranch: data.default_branch || 'main',
    skillFiles,
    totalSkills: skillFiles.length,
  };
}
