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
export declare const sampleSkillContent = "---\nname: Test Skill\ndescription: A test skill for automated testing\nversion: 1.0.0\nauthor: Test Author\n---\n\n# Test Skill\n\nThis is a test skill for automated testing.\n\n## Features\n\n- Feature 1: Description\n- Feature 2: Description\n\n## Usage\n\n```\n/test-skill\n```\n\n## Examples\n\nExample usage of the test skill.\n";
/**
 * Sample skills for testing
 */
export declare const testSkills: TestSkill[];
/**
 * Generate a unique skill name for testing
 */
export declare function generateUniqueSkillName(prefix?: string): string;
/**
 * Generate skill content with custom name
 */
export declare function generateSkillContent(name: string, description?: string): string;
/**
 * Invalid skill content (missing required fields)
 */
export declare const invalidSkillContent = "---\ndescription: Missing name field\nversion: 1.0.0\n---\n\n# Invalid Skill\n\nThis skill has invalid frontmatter.\n";
/**
 * Skill content with special characters in name
 */
export declare const specialCharsSkillContent = "---\nname: \"Test-Skill_With.Special\"\ndescription: Skill with special characters\nversion: 1.0.0\n---\n\n# Test-Skill_With.Special\n\nTesting special character handling.\n";
/**
 * Large skill content for performance testing
 */
export declare function generateLargeSkillContent(lines?: number): string;
/**
 * Skill with complex YAML frontmatter
 */
export declare const complexYamlSkillContent = "---\nname: Complex Skill\ndescription: |\n  A skill with multi-line description.\n  This tests YAML parsing capabilities.\nversion: 1.0.0\nauthor: Test Author\ntags:\n  - testing\n  - e2e\n  - automation\nsettings:\n  enabled: true\n  timeout: 30000\n---\n\n# Complex Skill\n\nThis skill has complex YAML frontmatter.\n";
/**
 * Private skill data for private repo testing
 */
export declare const privateSkills: {
    name: string;
    path: string;
    lastModified: string;
    description: string;
}[];
/**
 * Private repository data
 */
export declare const privateRepos: ({
    id: string;
    owner: string;
    repo: string;
    type: "github";
    displayName: string;
    url?: undefined;
} | {
    id: string;
    url: string;
    type: "gitlab";
    displayName: string;
    owner?: undefined;
    repo?: undefined;
})[];
//# sourceMappingURL=skills.d.ts.map