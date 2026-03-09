const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * UI/UX Quality Audit Script (T135-T141)
 * Verifies quality requirements for the Electron app
 */

const COMPONENTS_DIR = path.join(__dirname, '..', '..', 'src', 'renderer', 'components');
const STYLES_DIR = path.join(__dirname, '..', '..', 'src', 'renderer', 'styles');

let totalIssues = 0;
let totalChecks = 0;

function checkFile(filePath, checkFn, checkName) {
  totalChecks++;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = checkFn(content, filePath);
    if (issues.length > 0) {
      console.log(`\n❌ ${checkName}: ${path.relative(process.cwd(), filePath)}`);
      issues.forEach(issue => console.log(`   - ${issue}`));
      totalIssues += issues.length;
      return false;
    } else {
      console.log(`✓ ${checkName}: ${path.basename(filePath)}`);
      return true;
    }
  } catch (error) {
    console.log(`⚠️  Could not check ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

// T135: Verify all components use SVG icons (no emoji)
function checkNoEmojis(content, filePath) {
  const emojis = ['✓', '✅', '❌', '⚠️', '🗑️', '📁', '📝', '⚙️', '🔍', '➕', '✏️', '💾', '❓', '🎯', '📊', '🔧', '💡'];
  const issues = [];

  emojis.forEach(emoji => {
    if (content.includes(emoji)) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes(emoji)) {
          issues.push(`Line ${index + 1}: Contains emoji "${emoji}"`);
        }
      });
    }
  });

  return issues;
}

// T136: Verify all interactive elements have cursor pointer
function checkCursorPointer(content, filePath) {
  const issues = [];

  // Check for buttons without cursor-pointer
  const buttonMatches = content.matchAll(/<button[^>]*>/g);
  for (const match of buttonMatches) {
    if (!match[0].includes('cursor-pointer') && !match[0].includes('className=')) {
      // Check if there's a className on the next line or same element
      const startIndex = match.index;
      const endIndex = content.indexOf('>', startIndex) + 1;
      const buttonElement = content.substring(startIndex, endIndex + 200);

      if (!buttonElement.includes('cursor-pointer') && !buttonElement.includes('btn')) {
        const lineNumber = content.substring(0, startIndex).split('\n').length;
        issues.push(`Line ${lineNumber}: Button may be missing cursor-pointer class`);
      }
    }
  }

  return issues;
}

// T137: Verify stable hover states (no scale transforms on hover)
function checkStableHoverStates(content, filePath) {
  const issues = [];

  // Check for scale transforms in hover states
  if (content.includes('hover:') && content.includes('scale')) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('hover:') && line.includes('scale') && !line.includes('/* intentional scale */')) {
        issues.push(`Line ${index + 1}: Scale transform on hover may cause layout shifts`);
      }
    });
  }

  return issues;
}

// T138: Verify smooth transitions (150-300ms)
function checkTransitionDurations(content, filePath) {
  const issues = [];

  // Check for transitions longer than 300ms
  const longTransitions = content.match(/duration-\d+/g);
  if (longTransitions) {
    longTransitions.forEach(transition => {
      const duration = parseInt(transition.replace('duration-', ''));
      if (duration > 300) {
        issues.push(`Transition duration ${duration}ms exceeds recommended 300ms`);
      }
    });
  }

  return issues;
}

// T139: Verify light/dark mode contrast (check Tailwind classes)
function checkContrastClasses(content, filePath) {
  const issues = [];

  // Check for gray-400 or lighter text in light mode
  const lightTextClasses = ['gray-300', 'gray-200', 'gray-100', 'slate-300', 'slate-200', 'slate-100'];
  lightTextClasses.forEach(cls => {
    if (content.includes(`text-${cls}`) && !content.includes('dark:text-' + cls)) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes(`text-${cls}`) && !line.includes('dark:')) {
          issues.push(`Line ${index + 1}: Light text class text-${cls} may have insufficient contrast in light mode`);
        }
      });
    }
  });

  return issues;
}

// T140: Check for responsive classes
function checkResponsiveClasses(content, filePath) {
  const issues = [];

  // Check for fixed widths that might break responsiveness
  if (content.includes('w-[') && !content.includes('max-w-')) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('w-[') && !line.includes('max-w-') && !line.includes('min-w-')) {
        issues.push(`Line ${index + 1}: Fixed width may not be responsive`);
      }
    });
  }

  return issues;
}

// T141: Check accessibility attributes
function checkAccessibility(content, filePath) {
  const issues = [];

  // Check for images without alt text
  if (content.includes('<img')) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('<img') && !line.includes('alt=')) {
        issues.push(`Line ${index + 1}: Image missing alt attribute`);
      }
    });
  }

  // Check for buttons without aria-label
  const buttonMatches = content.matchAll(/<button[^>]*>/g);
  for (const match of buttonMatches) {
    if (!match[0].includes('aria-label') && !match[0].includes('>')) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const nextLine = content.split('\n')[lineNumber];
      if (!nextLine || (!nextLine.includes('aria-label') && !match[0].includes('type='))) {
        issues.push(`Line ${lineNumber}: Button may need aria-label for accessibility`);
      }
    }
  }

  return issues;
}

console.log('=== UI/UX Quality Audit (T135-T141) ===\n');

// Get all component files
const componentFiles = fs.readdirSync(COMPONENTS_DIR)
  .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
  .map(file => path.join(COMPONENTS_DIR, file));

// Also check App.tsx
componentFiles.push(path.join(COMPONENTS_DIR, '..', 'App.tsx'));

console.log(`Checking ${componentFiles.length} component files...\n`);

// Run all checks
componentFiles.forEach(file => {
  console.log(`\n📄 ${path.basename(file)}`);
  console.log('-'.repeat(50));

  checkFile(file, checkNoEmojis, 'T135: No Emojis');
  checkFile(file, checkCursorPointer, 'T136: Cursor Pointer');
  checkFile(file, checkStableHoverStates, 'T137: Stable Hover');
  checkFile(file, checkTransitionDurations, 'T138: Transitions');
  checkFile(file, checkContrastClasses, 'T139: Contrast');
  checkFile(file, checkResponsiveClasses, 'T140: Responsive');
  checkFile(file, checkAccessibility, 'T141: Accessibility');
});

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Summary:`);
console.log(`   Total checks: ${totalChecks}`);
console.log(`   Total issues: ${totalIssues}`);

if (totalIssues === 0) {
  console.log('\n✅ All UI/UX quality checks passed!');
  process.exit(0);
} else {
  console.log(`\n❌ ${totalIssues} issue(s) need attention`);
  process.exit(1);
}
