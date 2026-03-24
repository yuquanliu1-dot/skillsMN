"use strict";
/**
 * Integration Test: Modify Existing Skill
 *
 * Tests the flow for modifying an existing skill with AI
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const aiServiceMock_1 = require("../utils/aiServiceMock");
const skillContent_1 = require("../fixtures/skillContent");
(0, globals_1.describe)('Modify Existing Skill Flow', () => {
    let mockAIService;
    (0, globals_1.beforeAll)(() => {
        mockAIService = (0, aiServiceMock_1.createMockAIService)();
        mockAIService.setConfig(aiServiceMock_1.defaultTestConfig);
    });
    (0, globals_1.afterAll)(() => {
        mockAIService.cancelGeneration('test-request-id');
    });
    (0, globals_1.test)('should modify existing skill while preserving structure', async () => {
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
            prompt: skillContent_1.testPrompts.modify,
            mode: 'modify',
            skillContext: {
                content: skillContent_1.validSkillContent,
            },
        };
        let content = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error) {
                content += chunk.text;
            }
        }
        // Verify structure preserved
        (0, globals_1.expect)(content).toMatch(/name:\s+.+/);
        (0, globals_1.expect)(content).toMatch(/description:\s+.+/);
        (0, globals_1.expect)(content).toContain('## Error Handling');
        (0, globals_1.expect)(skillContent_1.expectedOutputs.modify.preservesStructure).toBe(true);
        (0, globals_1.expect)(skillContent_1.expectedOutputs.modify.hasNewContent).toBe(true);
    });
    (0, globals_1.test)('should preserve YAML frontmatter', async () => {
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: skillContent_1.validSkillContent.replace('Test Skill', 'Modified Test Skill'),
            },
        });
        const requestId = 'test-frontmatter';
        const request = {
            prompt: 'Change the skill name',
            mode: 'modify',
            skillContext: {
                content: skillContent_1.validSkillContent,
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
        (0, globals_1.expect)(yamlMatch).not.toBeNull();
        // Verify modified name
        (0, globals_1.expect)(content).toContain('Modified Test Skill');
    });
    (0, globals_1.test)('should handle modification errors', async () => {
        mockAIService.setMockResponse('generateStream', {
            success: false,
            error: {
                code: 'MODIFICATION_ERROR',
                message: 'Failed to modify skill content',
            },
        });
        const requestId = 'test-modify-error';
        const request = {
            prompt: skillContent_1.testPrompts.modify,
            mode: 'modify',
            skillContext: {
                content: skillContent_1.validSkillContent,
            },
        };
        let hasError = false;
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (chunk.error) {
                hasError = true;
            }
        }
        (0, globals_1.expect)(hasError).toBe(true);
    });
});
//# sourceMappingURL=modifySkillGeneration.test.js.map