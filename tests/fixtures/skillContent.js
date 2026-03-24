"use strict";
/**
 * Skill Content Test Fixtures
 *
 * Provides test fixtures for valid and invalid skill content
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectedOutputs = exports.testPrompts = exports.skillWithCodeBlocks = exports.skillWithSpecialCharacters = exports.largeSkillContent = exports.invalidSkillContent_empty = exports.invalidSkillContent_malformedYAML = exports.invalidSkillContent_missingDescription = exports.invalidSkillContent_missingName = exports.invalidSkillContent_missingFrontmatter = exports.minimalSkillContent = exports.validSkillContent = void 0;
/**
 * Valid skill content with all required fields
 */
exports.validSkillContent = `---
name: Test Skill
description: A skill for testing AI generation
version: 1.0.0
author: Test Author
tags:
  - test
  - ai
  - generation
---

# Test Skill

This is a test skill for verifying AI generation functionality.

## Purpose

This skill demonstrates the basic structure of a valid skill file.

## Usage

\`\`\`bash
# Example usage
test-skill --mode generate
\`\`\`

## Examples

### Example 1: Basic Generation

\`\`\`bash
test-skill --prompt "Create a simple skill"
\`\`\`

### Example 2: Advanced Generation

\`\`\`bash
test-skill --prompt "Create an advanced skill" --model claude-3-opus
\`\`\`

## Notes

- This is a test fixture
- Used for integration testing
- Validates AI generation flows
`;
/**
 * Valid minimal skill content
 */
exports.minimalSkillContent = `---
name: Minimal Skill
description: Minimal valid skill
---

# Minimal Content

Just the basics.
`;
/**
 * Invalid skill content - missing frontmatter
 */
exports.invalidSkillContent_missingFrontmatter = `This skill has no frontmatter.`;
/**
 * Invalid skill content - missing name field
 */
exports.invalidSkillContent_missingName = `---
description: Skill without a name
---

# Content without name
`;
/**
 * Invalid skill content - missing description field
 */
exports.invalidSkillContent_missingDescription = `---
name: Skill Without Description
---

# Content without description
`;
/**
 * Invalid skill content - malformed YAML
 */
exports.invalidSkillContent_malformedYAML = `---
name: Malformed Skill
description: [invalid yaml syntax
tags: not-a-list
---

# Content with malformed YAML
`;
/**
 * Invalid skill content - empty file
 */
exports.invalidSkillContent_empty = '';
/**
 * Large skill content for testing streaming
 */
exports.largeSkillContent = `---
name: Large Skill
description: A skill with extensive content for testing streaming
---

# Large Skill Content

${Array(100).fill('## Section\n\nThis is section content.\n\n').join('')}
`;
/**
 * Skill with special characters
 */
exports.skillWithSpecialCharacters = `---
name: "Skill with Quotes"
description: 'Skill with single quotes and special chars: @#$%^&*()'
---

# Special Characters

Content with special characters: <script>alert('test')</script>

\`\`\`python
print("Code block with special chars: @#$%^&*()")
\`\`\`
`;
/**
 * Skill with code blocks
 */
exports.skillWithCodeBlocks = `---
name: Code Examples
description: Skill demonstrating code blocks
---

# Code Examples

## Python Example

\`\`\`python
def hello_world():
    print("Hello, World!")

hello_world()
\`\`\`

## JavaScript Example

\`\`\`javascript
function greet(name) {
    console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

## Bash Example

\`\`\`bash
#!/bin/bash
echo "Hello from bash"
\`\`\`
`;
/**
 * Test prompts for different generation modes
 */
exports.testPrompts = {
    new: 'Create a skill for testing API endpoints',
    modify: 'Add error handling examples to the existing skill',
    insert: 'Add a troubleshooting section',
    replace: 'Rewrite this section with better examples',
};
/**
 * Expected outputs for test prompts
 */
exports.expectedOutputs = {
    new: {
        hasName: true,
        hasDescription: true,
        hasMarkdownContent: true,
        isValidYAML: true,
    },
    modify: {
        preservesStructure: true,
        hasNewContent: true,
    },
    insert: {
        insertedAtPosition: true,
        contextPreserved: true,
    },
    replace: {
        replacedCorrectly: true,
        contextPreserved: true,
    },
};
//# sourceMappingURL=skillContent.js.map