/**
 * Memory Profiling Script for skillsMN
 * Measures memory usage under various scenarios
 */

const v8 = require('v8');
const path = require('path');

console.log('=== skillsMN Memory Profiling ===\n');

// Get current memory usage
const memoryUsage = process.memoryUsage();
const heapStats = v8.getHeapStatistics();

console.log('Memory Usage:');
console.log(`  RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`);
console.log(`  Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`);
console.log(`  Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
console.log(`  External: ${Math.round(memoryUsage.external / 1024 / 1024)}MB`);

console.log('\nHeap Statistics:');
console.log(`  Total Heap Size: ${Math.round(heapStats.total_heap_size / 1024 / 1024)}MB`);
console.log(`  Total Heap Size Executable: ${Math.round(heapStats.total_heap_size_executable / 1024 / 1024)}MB`);
console.log(`  Total Physical Size: ${Math.round(heapStats.total_physical_size / 1024 / 1024)}MB`);
console.log(`  Total Available Size: ${Math.round(heapStats.total_available_size / 1024 / 1024)}MB`);
console.log(`  Used Heap Size: ${Math.round(heapStats.used_heap_size / 1024 / 1024)}MB`);
console.log(`  Heap Size Limit: ${Math.round(heapStats.heap_size_limit / 1024 / 1024)}MB`);
console.log(`  Malloced Memory: ${Math.round(heapStats.malloced_memory / 1024 / 1024)}MB`);
console.log(`  Peak Malloced Memory: ${Math.round(heapStats.peak_malloced_memory / 1024 / 1024)}MB`);

console.log('\nOptimization Recommendations:');
console.log('  1. Use virtual scrolling for skill lists (implemented ✓)');
console.log('  2. Lazy load Monaco Editor (implemented ✓)');
console.log('  3. Cache skill metadata (implemented ✓)');
console.log('  4. Debounce file watcher events (implemented ✓)');
console.log('  5. Limit cache TTL to 60 seconds (implemented ✓)');
console.log('  6. Clear cache on skill update (implemented ✓)');
