/**
 * Test Fixtures - Sample Skill Data
 *
 * Provides sample skills for testing
 */

export interface TestSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  path: string;
  content: string;
  sourceType: 'local' | 'registry' | 'private-repo';
  sourceMetadata?: {
    type: string;
    source?: string;
    repoPath?: string;
  };
}

/**
 * Sample skill content with YAML frontmatter
 */
export const sampleSkillContent = `---
name: Test Skill
description: A test skill for automated testing
version: 1.0.0
author: Test Author
---

# Test Skill

This is a test skill for automated testing.

## Features

- Feature 1: Description
- Feature 2: Description

## Usage

\`\`\`
/test-skill
\`\`\`

## Examples

Example usage of the test skill.
`;

/**
 * Sample skills for testing
 */
export const testSkills: TestSkill[] = [
  {
    id: 'test-skill-1',
    name: 'Test Skill Alpha',
    description: 'First test skill',
    version: '1.0.0',
    author: 'Test Author',
    path: '/skills/test-skill-alpha/skill.md',
    content: sampleSkillContent.replace('Test Skill', 'Test Skill Alpha'),
    sourceType: 'local',
  },
  {
    id: 'test-skill-2',
    name: 'Test Skill Beta',
    description: 'Second test skill',
    version: '1.0.0',
    author: 'Test Author',
    path: '/skills/test-skill-beta/skill.md',
    content: sampleSkillContent.replace('Test Skill', 'Test Skill Beta'),
    sourceType: 'local',
  },
  {
    id: 'test-skill-registry',
    name: 'Claude API Helper',
    description: 'A skill from the registry',
    version: '2.0.0',
    author: 'Anthropic',
    path: '/skills/claude-api-helper/skill.md',
    content: sampleSkillContent.replace('Test Skill', 'Claude API Helper'),
    sourceType: 'registry',
    sourceMetadata: {
      type: 'registry',
      source: 'anthropics/skills',
    },
  },
  {
    id: 'test-skill-private',
    name: 'Private Skill',
    description: 'A skill from private repo',
    version: '1.0.0',
    author: 'Internal Team',
    path: '/skills/private-skill/skill.md',
    content: sampleSkillContent.replace('Test Skill', 'Private Skill'),
    sourceType: 'private-repo',
    sourceMetadata: {
      type: 'private-repo',
      repoPath: 'my-org/my-skills',
    },
  },
];

/**
 * Generate a unique skill name for testing
 */
export function generateUniqueSkillName(prefix = 'test-skill'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate skill content with custom name
 */
export function generateSkillContent(name: string, description = 'Generated test skill'): string {
  return `---
name: ${name}
description: ${description}
version: 1.0.0
author: Test Suite
---

# ${name}

${description}

## Usage

This skill was generated for testing purposes.
`;
}

/**
 * Invalid skill content (missing required fields)
 */
export const invalidSkillContent = `---
description: Missing name field
version: 1.0.0
---

# Invalid Skill

This skill has invalid frontmatter.
`;

/**
 * Skill content with special characters in name
 */
export const specialCharsSkillContent = `---
name: "Test-Skill_With.Special"
description: Skill with special characters
version: 1.0.0
---

# Test-Skill_With.Special

Testing special character handling.
`;

/**
 * Large skill content for performance testing
 */
export function generateLargeSkillContent(lines = 1000): string {
  const content = `---
name: Large Test Skill
description: A large skill for performance testing
version: 1.0.0
---

# Large Test Skill

This skill contains a lot of content.

`;

  const body = Array(lines).fill('This is a line of content for testing large file handling.').join('\n');
  return content + body;
}

/**
 * Skill with complex YAML frontmatter
 */
export const complexYamlSkillContent = `---
name: Complex Skill
description: |
  A skill with multi-line description.
  This tests YAML parsing capabilities.
version: 1.0.0
author: Test Author
tags:
  - testing
  - e2e
  - automation
settings:
  enabled: true
  timeout: 30000
---

# Complex Skill

This skill has complex YAML frontmatter.
`;

/**
 * Private skill data for private repo testing
 */
export const privateSkills = [
  {
    name: 'Internal API Client',
    path: 'internal-api-client/skill.md',
    lastModified: new Date().toISOString(),
    description: 'Internal API integration skill',
  },
  {
    name: 'Company Workflow',
    path: 'company-workflow/skill.md',
    lastModified: new Date().toISOString(),
    description: 'Company-specific workflow automation',
  },
];

/**
 * Private repository data
 */
export const privateRepos = [
  {
    id: 'github-1',
    owner: 'my-org',
    repo: 'my-skills',
    type: 'github' as const,
    displayName: 'my-org/my-skills',
  },
  {
    id: 'gitlab-1',
    url: 'https://gitlab.company.com/team/skills',
    type: 'gitlab' as const,
    displayName: 'team/skills (GitLab)',
  },
];
