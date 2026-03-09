const fs = require('fs');
const path = require('path');

/**
 * Generate 500 test skills for performance testing
 */

const projectDir = path.join(__dirname, '..', '..', '.claude', 'skills');

// Ensure directory exists
if (!fs.existsSync(projectDir)) {
  fs.mkdirSync(projectDir, { recursive: true });
}

// Generate 500 skills
for (let i = 1; i <= 500; i++) {
  const skillName = `test-skill-${i.toString().padStart(3, '0')}`;
  const skillDir = path.join(projectDir, skillName);

  // Create skill directory
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }

  // Create skill.md with frontmatter
  const skillFile = path.join(skillDir, 'skill.md');
  const content = `---
name: ${skillName}
description: 'Test skill ${i} for performance testing - This is a longer description to simulate real skill metadata and test memory usage with realistic data sizes.'
---

# ${skillName}

This is test skill number ${i}.

## Purpose

This skill is generated for performance testing to verify that the application can handle 500+ skills efficiently.

## Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

## Examples

\`\`\`typescript
// Example code block
const skill = {
  name: '${skillName}',
  id: ${i},
  created: new Date().toISOString()
};
\`\`\`

## Notes

- This is test skill ${i} of 500
- Generated on: ${new Date().toISOString()}
- Purpose: Memory usage verification (T129)
`;

  fs.writeFileSync(skillFile, content, 'utf-8');

  if (i % 50 === 0) {
    console.log(`Generated ${i}/500 skills...`);
  }
}

console.log(`\n✓ Successfully generated 500 test skills in ${projectDir}`);
console.log('Next steps:');
console.log('1. Start the application: npm start');
console.log('2. Open Task Manager / Activity Monitor');
console.log('3. Verify memory usage < 300MB');
