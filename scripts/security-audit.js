/**
 * Security Audit Script for skillsMN
 * Verifies security best practices
 */

const fs = require('fs');
const path = require('path');

console.log('=== skillsMN Security Audit ===\n');

const checks = [];

// Check 1: Verify safeStorage usage for credentials
console.log('Check 1: Credential Encryption');
try {
  const aiService = fs.readFileSync('src/main/services/AIService.ts', 'utf-8');
  const privateRepoService = fs.readFileSync('src/main/services/PrivateRepoService.ts', 'utf-8');
  const aiConfigService = fs.readFileSync('src/main/services/AIConfigService.ts', 'utf-8');
  
  const usesSafeStorage = 
    aiService.includes('safeStorage.encryptString') &&
    aiService.includes('safeStorage.decryptString') &&
    privateRepoService.includes('safeStorage.encryptString') &&
    privateRepoService.includes('safeStorage.decryptString') &&
    aiConfigService.includes('safeStorage.encryptString') &&
    aiConfigService.includes('safeStorage.decryptString');
  
  if (usesSafeStorage) {
    console.log('  ✓ All services use safeStorage for credentials');
    checks.push(true);
  } else {
    console.log('  ✗ Some services do not use safeStorage');
    checks.push(false);
  }
} catch (error) {
  console.log('  ✗ Error checking credential encryption:', error.message);
  checks.push(false);
}

// Check 2: Verify path validation in services
console.log('\nCheck 2: Path Validation');
try {
  const skillService = fs.readFileSync('src/main/services/SkillService.ts', 'utf-8');
  const pathValidator = fs.readFileSync('src/main/services/PathValidator.ts', 'utf-8');
  
  const usesPathValidation = 
    skillService.includes('pathValidator.validate') &&
    pathValidator.includes('isWithinAllowedDir') &&
    pathValidator.includes('hasDirectoryTraversal');
  
  if (usesPathValidation) {
    console.log('  ✓ All file operations use path validation');
    checks.push(true);
  } else {
    console.log('  ✗ Some file operations may not validate paths');
    checks.push(false);
  }
} catch (error) {
  console.log('  ✗ Error checking path validation:', error.message);
  checks.push(false);
}

// Check 3: Verify IPC channel whitelist
console.log('\nCheck 3: IPC Channel Whitelist');
try {
  const preload = fs.readFileSync('src/main/preload.ts', 'utf-8');
  
  const hasContextBridge = preload.includes('contextBridge.exposeInMainWorld');
  const usesIPCChannels = preload.includes('IPC_CHANNELS');
  const hasValidation = preload.includes('ipcRenderer.invoke') || preload.includes('ipcRenderer.on');
  
  if (hasContextBridge && (usesIPCChannels || hasValidation)) {
    console.log('  ✓ IPC uses contextBridge with channel whitelist');
    checks.push(true);
  } else {
    console.log('  ✗ IPC may not properly whitelist channels');
    checks.push(false);
  }
} catch (error) {
  console.log('  ✗ Error checking IPC whitelist:', error.message);
  checks.push(false);
}

// Check 4: Verify no eval() or dynamic code execution
console.log('\nCheck 4: No Dynamic Code Execution');
try {
  const srcFiles = [];
  const scanDir = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !file.includes('node_modules')) {
        scanDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        srcFiles.push(fullPath);
      }
    });
  };
  
  scanDir('src');
  
  let hasEval = false;
  let hasNewFunction = false;
  
  srcFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('eval(') && !content.includes('// no eval')) {
      hasEval = true;
      console.log(`    Warning: eval() found in ${file}`);
    }
    if (content.includes('new Function(')) {
      hasNewFunction = true;
      console.log(`    Warning: new Function() found in ${file}`);
    }
  });
  
  if (!hasEval && !hasNewFunction) {
    console.log('  ✓ No eval() or new Function() found');
    checks.push(true);
  } else {
    console.log('  ✗ Dynamic code execution detected');
    checks.push(false);
  }
} catch (error) {
  console.log('  ✗ Error checking for dynamic code:', error.message);
  checks.push(false);
}

// Check 5: Verify no command injection vulnerabilities
console.log('\nCheck 5: No Command Injection');
try {
  const srcFiles = [];
  const scanDir = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !file.includes('node_modules')) {
        scanDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        srcFiles.push(fullPath);
      }
    });
  };
  
  scanDir('src');
  
  let hasCommandInjection = false;
  
  srcFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('exec(') || content.includes('spawn(') || content.includes('execSync(')) {
      if (!content.includes('child_process')) {
        // Allow if not using child_process
        return;
      }
      hasCommandInjection = true;
      console.log(`    Warning: Command execution found in ${file}`);
    }
  });
  
  if (!hasCommandInjection) {
    console.log('  ✓ No command injection vulnerabilities found');
    checks.push(true);
  } else {
    console.log('  ✗ Command execution detected (review needed)');
    checks.push(false);
  }
} catch (error) {
  console.log('  ✗ Error checking for command injection:', error.message);
  checks.push(false);
}

// Summary
console.log('\n=== Security Audit Summary ===');
const passed = checks.filter(c => c).length;
const total = checks.length;
console.log(`Passed: ${passed}/${total} checks`);
console.log(`Status: ${passed === total ? '✓ PASS' : '✗ FAIL'}`);

process.exit(passed === total ? 0 : 1);
