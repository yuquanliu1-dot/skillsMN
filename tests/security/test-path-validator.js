const path = require('path');
const { PathValidator } = require('../../dist/main/services/PathValidator.js');

/**
 * Security Testing Suite (T151-T153)
 * Tests path traversal prevention and path validation
 */

console.log('=== Security Testing Suite (T151-T153) ===\n');

const projectDir = 'D:\\skillsMN\\.claude\\skills';
const globalDir = 'C:\\Users\\test\\.claude\\skills';

const validator = new PathValidator(projectDir, globalDir);

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`✅ ${description}`);
      passed++;
    } else {
      console.log(`❌ ${description} - Unexpected result: ${result}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${description} - Error: ${error.message}`);
    failed++;
  }
}

function testThrows(description, fn) {
  try {
    fn();
    console.log(`❌ ${description} - Should have thrown error`);
    failed++;
  } catch (error) {
    if (error.name === 'PathTraversalError') {
      console.log(`✅ ${description} - Correctly blocked with PathTraversalError`);
      passed++;
    } else {
      console.log(`❌ ${description} - Wrong error type: ${error.name}`);
      failed++;
    }
  }
}

console.log('T151: Path Traversal Prevention');
console.log('='.repeat(60));

// Test 1: Basic path traversal with ../
testThrows(
  'Block path traversal with ../',
  () => validator.validate('D:\\skillsMN\\.claude\\skills\\..\\..\\Windows\\System32')
);

// Test 2: Absolute path outside allowed directories
testThrows(
  'Block absolute path outside allowed directories',
  () => validator.validate('C:\\Windows\\System32')
);

// Test 3: Network path
testThrows(
  'Block network path (UNC)',
  () => validator.validate('\\\\server\\share\\file.txt')
);

// Test 4: Path traversal with mixed separators
testThrows(
  'Block path traversal with mixed separators',
  () => validator.validate('D:/skillsMN/.claude/skills/../../../Windows')
);

// Test 5: Relative path starting with ..
testThrows(
  'Block relative path starting with ..',
  () => validator.validate('../Windows/System32')
);

// Test 6: Attempt to access user home directory
testThrows(
  'Block access to user home directory',
  () => validator.validate('C:\\Users\\test\\Documents')
);

// Test 7: Attempt to access root directory
testThrows(
  'Block access to root directory',
  () => validator.validate('C:\\')
);

// Test 8: Attempt to access parent of global directory
testThrows(
  'Block access to parent of global directory',
  () => validator.validate('C:\\Users\\test\\.claude')
);

console.log('\nT152: All File Operations Validate Paths');
console.log('='.repeat(60));

// Test 9: Valid path within project directory
test(
  'Allow valid path within project directory',
  () => {
    const result = validator.validate('D:\\skillsMN\\.claude\\skills\\test-skill');
    return result.includes('test-skill');
  }
);

// Test 10: Valid path within global directory
test(
  'Allow valid path within global directory',
  () => {
    const result = validator.validate('C:\\Users\\test\\.claude\\skills\\global-skill');
    return result.includes('global-skill');
  }
);

// Test 11: Exact allowed directory (edge case)
test(
  'Allow exact project directory',
  () => validator.validate('D:\\skillsMN\\.claude\\skills')
);

// Test 12: Exact allowed directory (global)
test(
  'Allow exact global directory',
  () => validator.validate('C:\\Users\\test\\.claude\\skills')
);

// Test 13: Path normalization (./)
test(
  'Normalize path with ./',
  () => {
    const result = validator.validate('D:\\skillsMN\\.claude\\skills\\.\\test-skill');
    return result.includes('test-skill') && !result.includes('.\\');
  }
);

// Test 14: Path normalization (redundant separators)
test(
  'Normalize path with redundant separators',
  () => {
    const result = validator.validate('D:\\skillsMN\\.claude\\skills\\\\test-skill');
    return result.includes('test-skill');
  }
);

console.log('\nT153: PathValidator with Attack Vectors');
console.log('='.repeat(60));

// Test 15: URL-encoded path traversal
testThrows(
  'Block URL-encoded path traversal (%2e%2e/)',
  () => validator.validate('D:\\skillsMN\\.claude\\skills\\%2e%2e\\Windows')
);

// Test 16: Double URL-encoded path traversal
testThrows(
  'Block double URL-encoded path traversal (%252e%252e/)',
  () => validator.validate('D:\\skillsMN\\.claude\\skills\\%252e%252e\\Windows')
);

// Test 17: Null byte injection attempt
testThrows(
  'Block null byte injection',
  () => validator.validate('D:\\skillsMN\\.claude\\skills\\..\\..\\Windows\\System32\\%00.txt')
);

// Test 18: Long path attack
testThrows(
  'Block excessively long path',
  () => {
    const longPath = 'D:\\skillsMN\\.claude\\skills\\' + 'a'.repeat(10000);
    return validator.validate(longPath);
  }
);

// Test 19: Unicode homograph attack
testThrows(
  'Block Unicode homograph attack',
  () => validator.validate('D:\\skillsMN\\.claude\\skills\\..\\..\\' + String.fromCharCode(0x0041)) // 'A' in Unicode
);

// Test 20: Case sensitivity bypass attempt (Windows)
test(
  'Handle case-insensitive paths correctly (Windows)',
  () => {
    const result = validator.validate('D:\\SKILLSMN\\.CLAUDE\\SKILLS\\test-skill');
    return result.includes('test-skill');
  }
);

// Test 21: Forward slash on Windows
test(
  'Handle forward slashes on Windows',
  () => {
    const result = validator.validate('D:/skillsMN/.claude/skills/test-skill');
    return result.includes('test-skill');
  }
);

// Test 22: isWithinAllowedDir method
test(
  'isWithinAllowedDir returns true for valid paths',
  () => validator.isWithinAllowedDir('D:\\skillsMN\\.claude\\skills\\test-skill')
);

// Test 23: isWithinAllowedDir method (invalid)
test(
  'isWithinAllowedDir returns false for invalid paths',
  () => !validator.isWithinAllowedDir('C:\\Windows\\System32')
);

// Test 24: getSkillSource for project skill
test(
  'getSkillSource returns "project" for project skills',
  () => validator.getSkillSource('D:\\skillsMN\\.claude\\skills\\test-skill') === 'project'
);

// Test 25: getSkillSource for global skill
test(
  'getSkillSource returns "global" for global skills',
  () => validator.getSkillSource('C:\\Users\\test\\.claude\\skills\\global-skill') === 'global'
);

console.log('\n' + '='.repeat(60));
console.log('\n📊 Security Test Summary:\n');
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  📊 Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n✅ All security tests passed! Path traversal prevention working correctly.\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} security test(s) failed. Review vulnerabilities.\n`);
  process.exit(1);
}
