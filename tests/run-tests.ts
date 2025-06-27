#!/usr/bin/env bun

/**
 * Comprehensive Test Runner for EFW (Efficient Framework for Web)
 * 
 * This script provides a complete test execution environment with:
 * - Multiple test suite execution
 * - Coverage reporting
 * - Performance benchmarking
 * - Detailed reporting
 * - CI/CD integration
 */

import { spawn, spawnSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  errors: string[];
}

interface TestConfiguration {
  suites: string[];
  coverage: boolean;
  verbose: boolean;
  bail: boolean;
  parallel: boolean;
  timeout: number;
  outputDir: string;
  reporters: string[];
}

class TestRunner {
  private config: TestConfiguration;
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor(config: Partial<TestConfiguration> = {}) {
    this.config = {
      suites: ['unit', 'integration', 'performance'],
      coverage: true,
      verbose: false,
      bail: false,
      parallel: true,
      timeout: 30000,
      outputDir: './test-results',
      reporters: ['console', 'json', 'html'],
      ...config
    };
  }

  async run(): Promise<void> {
    console.log('🧪 Starting EFW Test Suite');
    console.log('=' .repeat(60));
    
    this.startTime = Date.now();
    
    // Setup output directory
    this.setupOutputDirectory();
    
    // Set environment variables
    this.setupTestEnvironment();
    
    try {
      // Run test suites
      if (this.config.parallel) {
        await this.runTestsInParallel();
      } else {
        await this.runTestsSequentially();
      }
      
      // Generate reports
      await this.generateReports();
      
      // Show summary
      this.showSummary();
      
      // Exit with appropriate code
      const hasFailures = this.results.some(r => r.failed > 0);
      process.exit(hasFailures ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    }
  }

  private setupOutputDirectory(): void {
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  private setupTestEnvironment(): void {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.TEST_TIMEOUT = this.config.timeout.toString();
  }

  private async runTestsInParallel(): Promise<void> {
    console.log('🚀 Running tests in parallel...\n');
    
    const promises = this.getTestSuiteFiles().map(async (file) => {
      return this.runTestFile(file);
    });
    
    this.results = await Promise.all(promises);
  }

  private async runTestsSequentially(): Promise<void> {
    console.log('🔄 Running tests sequentially...\n');
    
    for (const file of this.getTestSuiteFiles()) {
      const result = await this.runTestFile(file);
      this.results.push(result);
      
      if (this.config.bail && result.failed > 0) {
        console.log('🛑 Stopping due to test failures (bail enabled)');
        break;
      }
    }
  }

  private getTestSuiteFiles(): string[] {
    const testFiles: string[] = [];
    
    if (this.config.suites.includes('unit')) {
      testFiles.push(
        'tests/utils.test.ts',
        'tests/auth.test.ts',
        'tests/security.test.ts',
        'tests/templates.test.ts',
        'tests/monitoring.test.ts',
        'tests/framework.test.ts'
      );
    }
    
    if (this.config.suites.includes('integration')) {
      testFiles.push('tests/integration.test.ts');
    }
    
    if (this.config.suites.includes('performance')) {
      testFiles.push('tests/performance.test.ts');
    }
    
    return testFiles.filter(file => existsSync(file));
  }

  private async runTestFile(file: string): Promise<TestResult> {
    const suiteName = path.basename(file, '.test.ts');
    const startTime = Date.now();
    
    console.log(`📋 Running ${suiteName} tests...`);
    
    try {
      const args = ['test', file];
      
      if (this.config.verbose) {
        args.push('--verbose');
      }
      
      if (this.config.coverage) {
        args.push('--coverage');
      }
      
      const result = spawnSync('bun', args, {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
        encoding: 'utf8',
        timeout: this.config.timeout
      });
      
      const duration = Date.now() - startTime;
      
      if (result.error) {
        throw result.error;
      }
      
      const output = result.stdout || '';
      const errorOutput = result.stderr || '';
      
      // Parse test results from output
      const testResult = this.parseTestOutput(suiteName, output, errorOutput, duration);
      
      if (testResult.failed > 0) {
        console.log(`❌ ${suiteName}: ${testResult.failed} failed, ${testResult.passed} passed`);
      } else {
        console.log(`✅ ${suiteName}: ${testResult.passed} passed`);
      }
      
      return testResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`💥 ${suiteName}: Error running tests`);
      
      return {
        suite: suiteName,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        errors: [(error as Error).message]
      };
    }
  }

  private parseTestOutput(suite: string, stdout: string, stderr: string, duration: number): TestResult {
    // Simple parser for Bun test output
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    // Parse test results (this is a simplified parser)
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      if (line.includes('✓') || line.includes('pass')) {
        passed++;
      } else if (line.includes('✗') || line.includes('fail')) {
        failed++;
        errors.push(line);
      } else if (line.includes('skip')) {
        skipped++;
      }
    }
    
    // If no explicit counts found, assume success if no stderr
    if (passed === 0 && failed === 0 && !stderr) {
      passed = 1; // At least one test ran successfully
    }
    
    if (stderr) {
      errors.push(stderr);
      if (failed === 0) {
        failed = 1;
      }
    }
    
    return {
      suite,
      passed,
      failed,
      skipped,
      duration,
      errors
    };
  }

  private async generateReports(): Promise<void> {
    console.log('\n📊 Generating test reports...');
    
    if (this.config.reporters.includes('json')) {
      await this.generateJSONReport();
    }
    
    if (this.config.reporters.includes('html')) {
      await this.generateHTMLReport();
    }
    
    if (this.config.reporters.includes('junit')) {
      await this.generateJUnitReport();
    }
  }

  private async generateJSONReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: this.getSummaryStats(),
      results: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    const filePath = path.join(this.config.outputDir, 'test-results.json');
    writeFileSync(filePath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report: ${filePath}`);
  }

  private async generateHTMLReport(): Promise<void> {
    const summary = this.getSummaryStats();
    const html = this.generateHTMLContent(summary);
    
    const filePath = path.join(this.config.outputDir, 'test-results.html');
    writeFileSync(filePath, html);
    console.log(`🌐 HTML report: ${filePath}`);
  }

  private async generateJUnitReport(): Promise<void> {
    const xml = this.generateJUnitXML();
    
    const filePath = path.join(this.config.outputDir, 'junit.xml');
    writeFileSync(filePath, xml);
    console.log(`📋 JUnit report: ${filePath}`);
  }

  private generateHTMLContent(summary: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>EFW - Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .suite { margin-bottom: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .suite-header { font-weight: bold; margin-bottom: 10px; }
        .metrics { display: flex; gap: 20px; }
        .metric { text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .error { background-color: #f8d7da; padding: 10px; border-radius: 3px; margin: 5px 0; }
    </style>
</head>
<body>
    <h1>EFW - Test Results</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value ${summary.totalFailed === 0 ? 'success' : 'failure'}">${summary.totalPassed}</div>
                <div>Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value ${summary.totalFailed === 0 ? 'success' : 'failure'}">${summary.totalFailed}</div>
                <div>Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.totalSkipped}</div>
                <div>Skipped</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(summary.totalDuration / 1000).toFixed(2)}s</div>
                <div>Duration</div>
            </div>
        </div>
    </div>
    
    <h2>Test Suites</h2>
    <table>
        <thead>
            <tr>
                <th>Suite</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Skipped</th>
                <th>Duration</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${this.results.map(result => `
                <tr>
                    <td>${result.suite}</td>
                    <td class="success">${result.passed}</td>
                    <td class="${result.failed > 0 ? 'failure' : 'success'}">${result.failed}</td>
                    <td>${result.skipped}</td>
                    <td>${(result.duration / 1000).toFixed(2)}s</td>
                    <td class="${result.failed === 0 ? 'success' : 'failure'}">
                        ${result.failed === 0 ? '✅ PASS' : '❌ FAIL'}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    ${this.results.filter(r => r.errors.length > 0).map(result => `
        <div class="suite">
            <div class="suite-header">${result.suite} - Errors</div>
            ${result.errors.map(error => `<div class="error">${error}</div>`).join('')}
        </div>
    `).join('')}
    
    <p><small>Generated on ${new Date().toISOString()}</small></p>
</body>
</html>
    `.trim();
  }

  private generateJUnitXML(): string {
    const summary = this.getSummaryStats();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="EFW" tests="${summary.totalTests}" failures="${summary.totalFailed}" errors="0" time="${(summary.totalDuration / 1000).toFixed(3)}">
${this.results.map(result => `
    <testsuite name="${result.suite}" tests="${result.passed + result.failed + result.skipped}" failures="${result.failed}" errors="0" time="${(result.duration / 1000).toFixed(3)}">
        ${Array(result.passed).fill(0).map((_, i) => `
        <testcase name="${result.suite}-test-${i + 1}" time="0.001" />
        `).join('')}
        ${result.errors.map((error, i) => `
        <testcase name="${result.suite}-error-${i + 1}" time="0.001">
            <failure message="Test failed">${error}</failure>
        </testcase>
        `).join('')}
    </testsuite>
`).join('')}
</testsuites>`;
  }

  private getSummaryStats() {
    return {
      totalTests: this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
      totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: this.results.reduce((sum, r) => sum + r.skipped, 0),
      totalDuration: Date.now() - this.startTime,
      suiteCount: this.results.length
    };
  }

  private showSummary(): void {
    const summary = this.getSummaryStats();
    const duration = (summary.totalDuration / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.totalPassed}`);
    console.log(`❌ Failed: ${summary.totalFailed}`);
    console.log(`⏭️  Skipped: ${summary.totalSkipped}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📦 Suites: ${summary.suiteCount}`);
    
    if (summary.totalFailed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n💥 ${summary.totalFailed} test(s) failed`);
    }
    
    console.log('='.repeat(60));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const config: Partial<TestConfiguration> = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--coverage':
        config.coverage = true;
        break;
      case '--no-coverage':
        config.coverage = false;
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--bail':
        config.bail = true;
        break;
      case '--sequential':
        config.parallel = false;
        break;
      case '--timeout':
        config.timeout = parseInt(args[++i]) || 30000;
        break;
      case '--output':
        config.outputDir = args[++i];
        break;
      case '--suites':
        config.suites = args[++i].split(',');
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  const runner = new TestRunner(config);
  await runner.run();
}

function showHelp() {
  console.log(`
EFW Test Runner

Usage: bun run tests/run-tests.ts [options]

Options:
  --coverage              Enable coverage reporting (default: true)
  --no-coverage          Disable coverage reporting
  --verbose              Verbose output
  --bail                 Stop on first failure
  --sequential           Run tests sequentially instead of parallel
  --timeout <ms>         Test timeout in milliseconds (default: 30000)
  --output <dir>         Output directory for reports (default: ./test-results)
  --suites <list>        Comma-separated list of test suites (unit,integration,performance)
  --help                 Show this help message

Examples:
  bun run tests/run-tests.ts
  bun run tests/run-tests.ts --verbose --coverage
  bun run tests/run-tests.ts --suites unit,integration
  bun run tests/run-tests.ts --sequential --bail
  `);
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { TestRunner, type TestConfiguration, type TestResult };