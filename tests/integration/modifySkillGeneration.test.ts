/**
 * Integration Test: Modify Existing Skill
 *
 * Tests the flow for modifying an existing skill with AI
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { MockAIService, createMockAIService, defaultTestConfig } from '../utils/aiServiceMock';
import { validSkillContent, testPrompts, expectedOutputs } from '../fixtures/skillContent';

describe('Modify Existing Skill Flow', () => {
  let mockAIService: MockAIService;

  beforeAll(() => {
    mockAIService = createMockAIService();
    mockAIService.setConfig(defaultTestConfig);
  });

  afterAll(() => {
    mockAIService.cancelGeneration('test-request-id');
  });

  test('should modify existing skill while preserving structure', async () => {
    const modifiedContent = `---
name: Test Skill (Enhanced)
description: A modified skill for testing AI generation
version: 1.0.0
author: Test Author
tags:
  - test
  - ai
  - generation
  - modified
---

# Test Skill (Enhanced)

This is a modified skill with enhanced AI generation functionality.

## Purpose

This skill demonstrates the modification of a valid skill file.

## Usage

\`\`\`bash
# Example usage
test-skill --mode modify --prompt "Add error handling examples"
\`\`\`

## Examples

### Example 1: Basic Modification

\`\`\`bash
test-skill --prompt "Add error handling examples"
\`\`\`

### Example 2: Advanced Modification

\`\`\`bash
test-skill --prompt "Add troubleshooting section"
\`\`\`

## Error Handling

This section was added by AI modification.
`;

    mockAIService.setMockResponse('generateStream', {
      success: true,
      data: {
        content: modifiedContent,
      },
    });

    const requestId = 'test-modify';
    const request = {
      prompt: testPrompts.modify,
      mode: 'modify',
      skillContext: {
        content: validSkillContent,
      },
    };

    let content = '';
    for await (const chunk of mockAIService.generateStream(requestId, request)) {
      if (!chunk.error) {
        content += chunk.text;
      }
    }

    // Verify structure preserved
    expect(content).toMatch(/name:\s+.+/);
    expect(content).toMatch(/description:\s+.+/);
    expect(content).toContain('## Error Handling');
    expect(expectedOutputs.modify.preservesStructure).toBe(true);
    expect(expectedOutputs.modify.hasNewContent).toBe(true);
  });

  test('should preserve YAML frontmatter', async () => {
    mockAIService.setMockResponse('generateStream', {
      success: true,
      data: {
        content: validSkillContent.replace('Test Skill', 'Modified Test Skill'),
      },
    });

    const requestId = 'test-frontmatter';
    const request = {
      prompt: 'Change the skill name',
      mode: 'modify',
      skillContext: {
        content: validSkillContent,
      },
    };

    let content = '';
    for await (const chunk of mockAIService.generateStream(requestId, request)) {
      if (!chunk.error) {
        content += chunk.text;
      }
    }

    // Verify frontmatter still exists
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
    expect(yamlMatch).not.toBeNull();

    // Verify modified name
    expect(content).toContain('Modified Test Skill');
  });

  test('should handle modification errors', async () => {
    mockAIService.setMockResponse('generateStream', {
      success: false,
      error: {
        code: 'MODIFICATION_ERROR',
        message: 'Failed to modify skill content',
      },
    });

    const requestId = 'test-modify-error';
    const request = {
      prompt: testPrompts.modify,
      mode: 'modify',
      skillContext: {
        content: validSkillContent,
      },
    };

    let hasError = false;
    for await (const chunk of mockAIService.generateStream(requestId, request)) {
      if (chunk.error) {
        hasError = true;
      }
    }

    expect(hasError).toBe(true);
  });
});
