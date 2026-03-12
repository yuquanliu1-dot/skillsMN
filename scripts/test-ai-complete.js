#!/usr/bin/env node

/**
 * AI Assistant Complete Test Suite
 *
 * Runs all automated tests for the AI assistant feature
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

class AIAssistantCompleteTestSuite {
  constructor() {
    this.results = {
      e2e: null,
      functional: null,
      integration: null,
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      header: '🎯',
      section: '📍',
    }[type] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runScript(scriptPath, scriptName) {
    return new Promise((resolve, reject) => {
      this.log(`Running ${scriptName}...`, 'section');

      const childProcess = spawn('node', [scriptPath], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true,
      });

      childProcess.on('error', (error) => {
        this.log(`${scriptName} failed: ${error.message}`, 'error');
        reject(error);
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          this.log(`${scriptName} completed successfully`, 'success');
          resolve(true);
        } else {
          this.log(`${scriptName} exited with code ${code}`, 'warning');
          resolve(false);
        }
      });
    });
  }

  async checkBuildExists() {
    this.log('Checking if build exists...', 'section');

    const distPath = path.join(process.cwd(), 'dist');
    const exists = await fs.pathExists(distPath);

    if (!exists) {
      this.log('Build not found. Running build...', 'warning');
      return false;
    }

    this.log('Build exists', 'success');
    return true;
  }

  async runBuild() {
    this.log('Building application...', 'section');

    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true,
      });

      buildProcess.on('error', (error) => {
        this.log(`Build failed: ${error.message}`, 'error');
        reject(error);
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          this.log('Build completed successfully', 'success');
          resolve(true);
        } else {
          this.log(`Build exited with code ${code}`, 'error');
          resolve(false);
        }
      });
    });
  }

  async runAllTests() {
    this.log('\n🎯 AI Assistant Complete Test Suite\n', 'header');
    this.log('═'.repeat(60), 'info');

    try {
      // Step 1: Check build
      const buildExists = await this.checkBuildExists();
      if (!buildExists) {
        const buildSuccess = await this.runBuild();
        if (!buildSuccess) {
          throw new Error('Build failed');
        }
      }

      // Step 2: Run E2E tests
      this.log('\n📍 Phase 1: E2E Component Tests\n', 'header');
      this.results.e2e = await this.runScript(
        path.join(process.cwd(), 'scripts', 'test-ai-assistant.js'),
        'E2E Tests'
      );

      // Step 3: Run functional tests
      this.log('\n📍 Phase 2: Functional Tests\n', 'header');
      this.results.functional = await this.runScript(
        path.join(process.cwd(), 'scripts', 'test-ai-functional.js'),
        'Functional Tests'
      );

      // Step 4: Generate final report
      this.generateFinalReport();

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  generateFinalReport() {
    this.log('\n' + '═'.repeat(60), 'info');
    this.log('📊 FINAL TEST RESULTS\n', 'header');

    const e2ePassed = this.results.e2e;
    const functionalPassed = this.results.functional;

    console.log('Test Suites:');
    console.log(`  E2E Tests:          ${e2ePassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Functional Tests:   ${functionalPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('');

    const allPassed = e2ePassed && functionalPassed;

    if (allPassed) {
      this.log('🎉 ALL TESTS PASSED!', 'success');
      this.log('AI Assistant is production-ready!', 'success');
    } else {
      this.log('⚠️ SOME TESTS FAILED', 'warning');
      this.log('Please review the failed tests above', 'warning');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('Reports generated:');
    console.log('  - ai-test-report.json          (E2E tests)');
    console.log('  - ai-functional-test-report.json (Functional tests)');
    console.log('  - AI_TEST_REPORT.md            (Summary report)');
    console.log('═'.repeat(60) + '\n');

    process.exit(allPassed ? 0 : 1);
  }
}

// Run complete test suite
async function main() {
  const testSuite = new AIAssistantCompleteTestSuite();

  try {
    await testSuite.runAllTests();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AIAssistantCompleteTestSuite;
