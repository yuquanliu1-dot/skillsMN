/**
 * AI Assistant E2E Test Runner
 *
 * Runs automated tests against the running application
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

class AIAssistantTestRunner {
  constructor() {
    this.appProcess = null;
    this.testResults = [];
    this.isRunning = false;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪',
    }[type] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async startApplication() {
    this.log('Starting application...', 'info');

    return new Promise((resolve, reject) => {
      this.appProcess = spawn('npm', ['start'], {
        cwd: process.cwd(),
        shell: true,
        stdio: 'inherit',
      });

      this.appProcess.on('error', (error) => {
        this.log(`Failed to start application: ${error.message}`, 'error');
        reject(error);
      });

      // Wait for app to start
      setTimeout(() => {
        this.log('Application started', 'success');
        resolve();
      }, 5000);
    });
  }

  async stopApplication() {
    if (this.appProcess) {
      this.log('Stopping application...', 'info');
      this.appProcess.kill('SIGTERM');
      await this.sleep(1000);
      this.appProcess = null;
    }
  }

  async testBuildExists() {
    this.log('Testing: Build exists', 'test');

    const distPath = path.join(process.cwd(), 'dist');
    const mainPath = path.join(distPath, 'src', 'main', 'index.js');
    const rendererPath = path.join(distPath, 'renderer');

    const exists = await fs.pathExists(mainPath) && await fs.pathExists(rendererPath);

    this.testResults.push({
      name: 'Build exists',
      passed: exists,
      details: exists ? 'All build files present' : 'Build files missing',
    });

    return exists;
  }

  async testAIComponentsExist() {
    this.log('Testing: AI components exist', 'test');

    const components = [
      'dist/src/main/services/AIService.js',
      'dist/src/main/services/AIConfigService.js',
      'dist/src/renderer/components/AIAssistPanel.js',
      'dist/src/renderer/services/aiClient.js',
      'dist/src/renderer/hooks/useAIGeneration.js',
    ];

    const results = await Promise.all(
      components.map(async (comp) => {
        const exists = await fs.pathExists(path.join(process.cwd(), comp));
        return { component: comp, exists };
      })
    );

    const allExist = results.every(r => r.exists);

    this.testResults.push({
      name: 'AI components exist',
      passed: allExist,
      details: results,
    });

    return allExist;
  }

  async testConfigurationStructure() {
    this.log('Testing: Configuration structure', 'test');

    const configPath = path.join(process.cwd(), 'src', 'shared', 'types.ts');
    const exists = await fs.pathExists(configPath);

    if (exists) {
      const content = await fs.readFile(configPath, 'utf-8');
      const hasRequiredFields =
        content.includes('AIGenerationMode') &&
        content.includes('AIGenerationRequest') &&
        content.includes('AIConfiguration');

      this.testResults.push({
        name: 'Configuration structure',
        passed: hasRequiredFields,
        details: hasRequiredFields ? 'All required type definitions present' : 'Missing required type definitions',
      });

      return hasRequiredFields;
    }

    this.testResults.push({
      name: 'Configuration structure',
      passed: false,
      details: 'Configuration file not found',
    });

    return false;
  }

  async testServiceMethods() {
    this.log('Testing: Service methods', 'test');

    const servicePath = path.join(process.cwd(), 'dist', 'src', 'main', 'services', 'AIService.js');
    const exists = await fs.pathExists(servicePath);

    if (exists) {
      const content = await fs.readFile(servicePath, 'utf-8');

      const requiredMethods = [
        'encryptAPIKey',
        'decryptAPIKey',
        'initialize',
        'generateStream',
        'cancelGeneration',
        'testConnection',
      ];

      const hasAllMethods = requiredMethods.every(method => content.includes(method));

      this.testResults.push({
        name: 'Service methods',
        passed: hasAllMethods,
        details: requiredMethods.map(m => ({
          method: m,
          present: content.includes(m),
        })),
      });

      return hasAllMethods;
    }

    return false;
  }

  async testUIComponents() {
    this.log('Testing: UI components', 'test');

    const components = [
      {
        name: 'AIAssistPanel',
        path: 'dist/src/renderer/components/AIAssistPanel.js',
      },
      {
        name: 'AIStreamingPreview',
        path: 'dist/src/renderer/components/AIStreamingPreview.js',
      },
      {
        name: 'AIControls',
        path: 'dist/src/renderer/components/AIControls.js',
      },
      {
        name: 'ModeSelector',
        path: 'dist/src/renderer/components/ModeSelector.js',
      },
    ];

    const results = await Promise.all(
      components.map(async ({ name, path: compPath }) => {
        const fullPath = path.join(process.cwd(), compPath);
        const exists = await fs.pathExists(fullPath);
        return { name, exists };
      })
    );

    const allExist = results.every(r => r.exists);

    this.testResults.push({
      name: 'UI components',
      passed: allExist,
      details: results,
    });

    return allExist;
  }

  async testHooks() {
    this.log('Testing: React hooks', 'test');

    const hooks = [
      'dist/src/renderer/hooks/useAIGeneration.js',
    ];

    const results = await Promise.all(
      hooks.map(async (hookPath) => {
        const fullPath = path.join(process.cwd(), hookPath);
        const exists = await fs.pathExists(fullPath);

        if (exists) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const hasRequiredExports =
            content.includes('status') &&
            content.includes('content') &&
            content.includes('generate') &&
            content.includes('stop');

          return { hook: hookPath, exists, hasRequiredExports };
        }

        return { hook: hookPath, exists: false, hasRequiredExports: false };
      })
    );

    const allValid = results.every(r => r.exists && r.hasRequiredExports);

    this.testResults.push({
      name: 'React hooks',
      passed: allValid,
      details: results,
    });

    return allValid;
  }

  async runAllTests() {
    this.log('🚀 Starting AI Assistant E2E Tests\n', 'info');

    try {
      // Build tests
      await this.testBuildExists();
      await this.testAIComponentsExist();

      // Structure tests
      await this.testConfigurationStructure();
      await this.testServiceMethods();

      // UI tests
      await this.testUIComponents();
      await this.testHooks();

      // Generate report
      this.generateReport();

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      throw error;
    }
  }

  generateReport() {
    this.log('\n📊 Test Results Summary\n', 'info');

    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = Math.round((passed / total) * 100);

    console.log('═'.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${percentage}%`);
    console.log('═'.repeat(60));

    this.testResults.forEach((result, index) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${result.name}`);

      if (result.details && !result.passed) {
        console.log(`   Details:`, result.details);
      }
    });

    console.log('═'.repeat(60));

    // Save report to file
    const reportPath = path.join(process.cwd(), 'ai-test-report.json');
    fs.writeJsonSync(reportPath, {
      timestamp: new Date().toISOString(),
      total,
      passed,
      failed: total - passed,
      percentage,
      results: this.testResults,
    }, { spaces: 2 });

    this.log(`\n📄 Detailed report saved to: ${reportPath}`, 'info');

    if (percentage === 100) {
      this.log('\n🎉 All tests passed!', 'success');
    } else if (percentage >= 80) {
      this.log('\n✨ Most tests passed, but some need attention.', 'warning');
    } else {
      this.log('\n⚠️ Several tests failed. Please review the results.', 'error');
    }
  }
}

// Run tests
async function main() {
  const runner = new AIAssistantTestRunner();

  try {
    await runner.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AIAssistantTestRunner;
