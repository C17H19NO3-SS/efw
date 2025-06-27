#!/usr/bin/env bun

/**
 * Test Watch Mode for EFW (Efficient Framework for Web)
 * 
 * Watches for file changes and automatically re-runs relevant tests
 */

import { watch } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

interface WatchConfig {
  testDirs: string[];
  srcDirs: string[];
  extensions: string[];
  ignored: string[];
  debounceMs: number;
}

class TestWatcher {
  private config: WatchConfig;
  private isRunning = false;
  private debounceTimer?: NodeJS.Timeout;

  constructor(config: Partial<WatchConfig> = {}) {
    this.config = {
      testDirs: ['tests'],
      srcDirs: ['src', 'examples'],
      extensions: ['.ts', '.js', '.json'],
      ignored: ['node_modules', '.git', 'dist', 'coverage', 'test-results'],
      debounceMs: 500,
      ...config
    };
  }

  start(): void {
    console.log('👀 Starting test watcher...');
    console.log('🔍 Watching directories:', [...this.config.testDirs, ...this.config.srcDirs]);
    console.log('📁 Extensions:', this.config.extensions);
    console.log('⏱️  Debounce:', this.config.debounceMs + 'ms');
    console.log('');
    console.log('Press Ctrl+C to stop watching');
    console.log('='.repeat(50));

    // Run tests initially
    this.runTests('Initial run');

    // Watch directories
    const watchDirs = [...this.config.testDirs, ...this.config.srcDirs];
    
    watchDirs.forEach(dir => {
      if (existsSync(dir)) {
        this.watchDirectory(dir);
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping test watcher...');
      process.exit(0);
    });
  }

  private watchDirectory(dir: string): void {
    watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const filePath = path.join(dir, filename);
      
      // Check if file should be ignored
      if (this.shouldIgnoreFile(filePath)) {
        return;
      }

      // Check if file has watched extension
      if (!this.hasWatchedExtension(filename)) {
        return;
      }

      this.debounceRun(filePath, eventType);
    });
  }

  private shouldIgnoreFile(filePath: string): boolean {
    return this.config.ignored.some(ignored => 
      filePath.includes(ignored)
    );
  }

  private hasWatchedExtension(filename: string): boolean {
    return this.config.extensions.some(ext => 
      filename.endsWith(ext)
    );
  }

  private debounceRun(filePath: string, eventType: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const reason = `${eventType} ${path.relative(process.cwd(), filePath)}`;
      this.runTests(reason);
    }, this.config.debounceMs);
  }

  private async runTests(reason: string): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ Tests already running, skipping...');
      return;
    }

    this.isRunning = true;
    
    console.log('\n' + '='.repeat(50));
    console.log(`🧪 Running tests (${reason})`);
    console.log('⏰ Started at:', new Date().toLocaleTimeString());
    console.log('='.repeat(50));

    const startTime = Date.now();

    try {
      await this.executeTests();
      
      const duration = Date.now() - startTime;
      console.log('='.repeat(50));
      console.log(`✅ Tests completed in ${duration}ms`);
      console.log('👀 Watching for changes...');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log('='.repeat(50));
      console.log(`❌ Tests failed in ${duration}ms`);
      console.log('👀 Watching for changes...');
    } finally {
      this.isRunning = false;
    }
  }

  private executeTests(): Promise<void> {
    return new Promise((resolve, reject) => {
      const testProcess = spawn('bun', ['test', '--verbose'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tests failed with code ${code}`));
        }
      });

      testProcess.on('error', (error) => {
        reject(error);
      });
    });
  }
}

// Interactive commands
class InteractiveCommands {
  private watcher: TestWatcher;

  constructor(watcher: TestWatcher) {
    this.watcher = watcher;
    this.setupInputHandling();
  }

  private setupInputHandling(): void {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
      const keyStr = key.toString();

      switch (keyStr) {
        case '\u0003': // Ctrl+C
          console.log('\n👋 Goodbye!');
          process.exit(0);
          break;
        
        case 'r':
        case 'R':
          console.log('\n🔄 Manually triggering test run...');
          this.watcher['runTests']('Manual trigger');
          break;
        
        case 'h':
        case 'H':
          this.showHelp();
          break;
        
        case 'c':
        case 'C':
          console.clear();
          console.log('🧹 Console cleared');
          break;
        
        case 'q':
        case 'Q':
          console.log('\n👋 Quitting...');
          process.exit(0);
          break;
      }
    });

    // Show initial help
    setTimeout(() => this.showHelp(), 1000);
  }

  private showHelp(): void {
    console.log('\n📋 Interactive Commands:');
    console.log('  r - Run tests manually');
    console.log('  c - Clear console');
    console.log('  h - Show this help');
    console.log('  q - Quit');
    console.log('  Ctrl+C - Exit');
    console.log('');
  }
}

// CLI interface
function main(): void {
  const args = process.argv.slice(2);
  const config: Partial<WatchConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--debounce':
        config.debounceMs = parseInt(args[++i]) || 500;
        break;
      case '--test-dirs':
        config.testDirs = args[++i].split(',');
        break;
      case '--src-dirs':
        config.srcDirs = args[++i].split(',');
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  const watcher = new TestWatcher(config);
  new InteractiveCommands(watcher);
  watcher.start();
}

function showHelp(): void {
  console.log(`
EFW Test Watcher

Usage: bun run scripts/test-watch.ts [options]

Options:
  --debounce <ms>        Debounce time in milliseconds (default: 500)
  --test-dirs <dirs>     Comma-separated test directories (default: tests)
  --src-dirs <dirs>      Comma-separated source directories (default: src,examples)
  --help                 Show this help message

Interactive Commands (while running):
  r - Run tests manually
  c - Clear console
  h - Show help
  q - Quit
  Ctrl+C - Exit

Examples:
  bun run scripts/test-watch.ts
  bun run scripts/test-watch.ts --debounce 1000
  bun run scripts/test-watch.ts --test-dirs tests,e2e --src-dirs src,lib
  `);
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { TestWatcher, type WatchConfig };