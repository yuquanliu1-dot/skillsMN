const fs = require('fs');
const path = require('path');

/**
 * Memory usage test for 500 skills (T129)
 * Simulates what the application does when loading skills
 */

// Import the compiled TypeScript modules
const { SkillModel } = require('../../dist/main/models/Skill.js');
const { SkillDirectoryModel } = require('../../dist/main/models/SkillDirectory.js');

async function testMemoryUsage() {
  console.log('=== Memory Usage Test for 500 Skills (T129) ===\n');

  // Force garbage collection if available (run with --expose-gc)
  if (global.gc) {
    global.gc();
  }

  // Measure initial memory
  const initialMemory = process.memoryUsage();
  console.log('Initial memory usage:');
  console.log(`  Heap Used: ${formatBytes(initialMemory.heapUsed)}`);
  console.log(`  RSS: ${formatBytes(initialMemory.rss)}`);
  console.log('');

  // Load all skills (simulate what the app does)
  const projectDir = path.join(__dirname, '..', '..', '.claude', 'skills');

  if (!fs.existsSync(projectDir)) {
    console.error('ERROR: Test skills not found. Run generate-500-skills.js first.');
    process.exit(1);
  }

  console.log(`Loading skills from: ${projectDir}\n`);

  const startTime = Date.now();
  const skillDirs = await SkillDirectoryModel.getSkillDirectories(projectDir);
  console.log(`Found ${skillDirs.length} skill directories`);

  const skills = [];
  const cache = new Map();

  for (const skillDir of skillDirs) {
    try {
      const skill = await SkillModel.fromDirectory(skillDir, 'project', cache);
      skills.push(skill);
    } catch (error) {
      console.error(`Failed to load skill: ${skillDir}`, error.message);
    }
  }

  const loadTime = Date.now() - startTime;

  // Measure final memory
  const finalMemory = process.memoryUsage();
  console.log('\nFinal memory usage:');
  console.log(`  Heap Used: ${formatBytes(finalMemory.heapUsed)}`);
  console.log(`  RSS: ${formatBytes(finalMemory.rss)}`);
  console.log('');

  // Calculate memory increase
  const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  const rssIncrease = finalMemory.rss - initialMemory.rss;

  console.log('Memory increase:');
  console.log(`  Heap: ${formatBytes(heapIncrease)}`);
  console.log(`  RSS: ${formatBytes(rssIncrease)}`);
  console.log('');

  console.log('Performance:');
  console.log(`  Skills loaded: ${skills.length}`);
  console.log(`  Load time: ${loadTime}ms`);
  console.log(`  Average per skill: ${(loadTime / skills.length).toFixed(2)}ms`);
  console.log('');

  // Verify against target (< 300MB)
  const TARGET_MEMORY_MB = 300;
  const finalMemoryMB = finalMemory.rss / (1024 * 1024);

  console.log('=== RESULT ===');
  if (finalMemoryMB < TARGET_MEMORY_MB) {
    console.log(`✓ PASS: Memory usage (${finalMemoryMB.toFixed(2)}MB) is under ${TARGET_MEMORY_MB}MB target`);
    console.log(`  Headroom: ${(TARGET_MEMORY_MB - finalMemoryMB).toFixed(2)}MB remaining`);
  } else {
    console.log(`✗ FAIL: Memory usage (${finalMemoryMB.toFixed(2)}MB) exceeds ${TARGET_MEMORY_MB}MB target`);
    console.log(`  Exceeded by: ${(finalMemoryMB - TARGET_MEMORY_MB).toFixed(2)}MB`);
  }

  // Additional metrics
  console.log('\nCache statistics:');
  console.log(`  Cached frontmatter entries: ${cache.size}`);
  console.log(`  Cache memory (estimated): ${formatBytes(estimateCacheSize(cache))}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function estimateCacheSize(cache) {
  // Rough estimate: each cache entry has frontmatter object + timestamp
  // Average frontmatter: ~200 bytes
  return cache.size * 250;
}

// Run test
testMemoryUsage().catch(console.error);
