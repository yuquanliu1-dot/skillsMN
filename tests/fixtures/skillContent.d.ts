/**
 * Skill Content Test Fixtures
 *
 * Provides test fixtures for valid and invalid skill content
 */
/**
 * Valid skill content with all required fields
 */
export declare const validSkillContent = "---\nname: Test Skill\ndescription: A skill for testing AI generation\nversion: 1.0.0\nauthor: Test Author\ntags:\n  - test\n  - ai\n  - generation\n---\n\n# Test Skill\n\nThis is a test skill for verifying AI generation functionality.\n\n## Purpose\n\nThis skill demonstrates the basic structure of a valid skill file.\n\n## Usage\n\n```bash\n# Example usage\ntest-skill --mode generate\n```\n\n## Examples\n\n### Example 1: Basic Generation\n\n```bash\ntest-skill --prompt \"Create a simple skill\"\n```\n\n### Example 2: Advanced Generation\n\n```bash\ntest-skill --prompt \"Create an advanced skill\" --model claude-3-opus\n```\n\n## Notes\n\n- This is a test fixture\n- Used for integration testing\n- Validates AI generation flows\n";
/**
 * Valid minimal skill content
 */
export declare const minimalSkillContent = "---\nname: Minimal Skill\ndescription: Minimal valid skill\n---\n\n# Minimal Content\n\nJust the basics.\n";
/**
 * Invalid skill content - missing frontmatter
 */
export declare const invalidSkillContent_missingFrontmatter = "This skill has no frontmatter.";
/**
 * Invalid skill content - missing name field
 */
export declare const invalidSkillContent_missingName = "---\ndescription: Skill without a name\n---\n\n# Content without name\n";
/**
 * Invalid skill content - missing description field
 */
export declare const invalidSkillContent_missingDescription = "---\nname: Skill Without Description\n---\n\n# Content without description\n";
/**
 * Invalid skill content - malformed YAML
 */
export declare const invalidSkillContent_malformedYAML = "---\nname: Malformed Skill\ndescription: [invalid yaml syntax\ntags: not-a-list\n---\n\n# Content with malformed YAML\n";
/**
 * Invalid skill content - empty file
 */
export declare const invalidSkillContent_empty = "";
/**
 * Large skill content for testing streaming
 */
export declare const largeSkillContent: string;
/**
 * Skill with special characters
 */
export declare const skillWithSpecialCharacters = "---\nname: \"Skill with Quotes\"\ndescription: 'Skill with single quotes and special chars: @#$%^&*()'\n---\n\n# Special Characters\n\nContent with special characters: <script>alert('test')</script>\n\n```python\nprint(\"Code block with special chars: @#$%^&*()\")\n```\n";
/**
 * Skill with code blocks
 */
export declare const skillWithCodeBlocks = "---\nname: Code Examples\ndescription: Skill demonstrating code blocks\n---\n\n# Code Examples\n\n## Python Example\n\n```python\ndef hello_world():\n    print(\"Hello, World!\")\n\nhello_world()\n```\n\n## JavaScript Example\n\n```javascript\nfunction greet(name) {\n    console.log(`Hello, ${name}!`);\n}\n\ngreet('World');\n```\n\n## Bash Example\n\n```bash\n#!/bin/bash\necho \"Hello from bash\"\n```\n";
/**
 * Test prompts for different generation modes
 */
export declare const testPrompts: {
    new: string;
    modify: string;
    insert: string;
    replace: string;
};
/**
 * Expected outputs for test prompts
 */
export declare const expectedOutputs: {
    new: {
        hasName: boolean;
        hasDescription: boolean;
        hasMarkdownContent: boolean;
        isValidYAML: boolean;
    };
    modify: {
        preservesStructure: boolean;
        hasNewContent: boolean;
    };
    insert: {
        insertedAtPosition: boolean;
        contextPreserved: boolean;
    };
    replace: {
        replacedCorrectly: boolean;
        contextPreserved: boolean;
    };
};
//# sourceMappingURL=skillContent.d.ts.map