import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { setupTestEnv, cleanupTestEnv } from './test-helpers';

// Global test configuration
export const TEST_CONFIG = {
  timeout: 10000, // 10 seconds
  retries: 3,
  parallel: true,
  verbose: false,
  coverage: true,
  port: {
    start: 3001,
    end: 3999,
  },
  database: {
    testDbUrl: 'sqlite::memory:',
  },
  auth: {
    testJwtSecret: 'test-jwt-secret-key-for-testing-only',
    testSessionSecret: 'test-session-secret-key-for-testing-only',
  },
  cache: {
    maxSize: 100,
    ttl: 60000, // 1 minute
  },
  rateLimit: {
    windowMs: 60000, // 1 minute
    max: 100, // requests per window
  },
};

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  setupTestEnv();
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  cleanupTestEnv();
});

// Per-test setup
beforeEach(async () => {
  // Reset any global state before each test
});

// Per-test cleanup
afterEach(async () => {
  // Clean up after each test
});

export const getTestPort = (): number => {
  return Math.floor(Math.random() * (TEST_CONFIG.port.end - TEST_CONFIG.port.start + 1)) + TEST_CONFIG.port.start;
};

export const isTestEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

export default TEST_CONFIG;