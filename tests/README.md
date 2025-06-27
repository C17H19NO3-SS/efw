# TypeScript Web Framework - Test Suite

Comprehensive testing suite for the TypeScript Web Framework featuring unit tests, integration tests, performance tests, and automated testing tools.

## 📋 Test Overview

This test suite provides comprehensive coverage of all framework components:

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing  
- **Performance Tests**: Load testing and benchmarking
- **Security Tests**: Authentication, authorization, and security middleware
- **Template Tests**: Template engine functionality
- **Monitoring Tests**: Analytics and dashboard features

## 🚀 Quick Start

```bash
# Run all tests
bun run test:all

# Run specific test suites
bun run test:unit
bun run test:integration
bun run test:performance

# Run tests with coverage
bun run test:coverage

# Watch mode for development
bun run test:watch

# CI/CD pipeline
bun run test:ci
```

## 📁 Test Structure

```
tests/
├── README.md                 # This file
├── test.config.ts            # Test configuration
├── test-helpers.ts           # Test utilities and helpers
├── run-tests.ts              # Main test runner
├── utils.test.ts             # Utility module tests
├── auth.test.ts              # Authentication tests
├── security.test.ts          # Security middleware tests
├── templates.test.ts         # Template engine tests
├── monitoring.test.ts        # Monitoring and dashboard tests
├── integration.test.ts       # Full framework integration tests
├── performance.test.ts       # Performance and load tests
└── framework.test.ts         # Core framework tests (existing)

scripts/
├── test-ci.sh               # CI/CD test script
└── test-watch.ts            # File watcher for development
```

## 🧪 Test Suites

### Unit Tests

Individual component testing with comprehensive coverage:

```bash
# Run all unit tests
bun run test:unit

# Individual test files
bun test tests/utils.test.ts
bun test tests/auth.test.ts
bun test tests/security.test.ts
```

**Coverage includes:**
- Environment helpers and configuration management
- UUID generation and password hashing
- Caching system (LRU, TTL, memoization)
- Cookie parsing and query string handling
- Response builders and API clients
- Asset versioning and error pages

### Integration Tests

End-to-end testing of complete user workflows:

```bash
# Run integration tests
bun run test:integration
```

**Scenarios tested:**
- User registration and authentication flow
- Protected route access with JWT/sessions
- Admin operations and authorization
- Input validation and error handling
- CORS and security headers
- Template rendering
- Pagination and API responses

### Performance Tests

Load testing and performance benchmarking:

```bash
# Run performance tests
bun run test:performance
```

**Performance metrics:**
- Response time measurement
- Concurrent request handling
- Memory usage monitoring
- CPU intensive operation benchmarks
- Stress testing under heavy load
- Memory leak detection

### Security Tests

Authentication, authorization, and security middleware:

```bash
# Covered in unit and integration tests
bun test tests/auth.test.ts
bun test tests/security.test.ts
```

**Security features tested:**
- JWT token validation and expiration
- Session management and cleanup
- CORS policy enforcement
- Security headers (CSP, HSTS, XSS protection)
- Rate limiting and request throttling
- Input sanitization and XSS prevention

## 🛠️ Test Configuration

### Basic Configuration

```typescript
// tests/test.config.ts
export const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  parallel: true,
  coverage: true,
  auth: {
    testJwtSecret: 'test-jwt-secret',
    testSessionSecret: 'test-session-secret'
  },
  rateLimit: {
    windowMs: 60000,
    max: 100
  }
};
```

### Environment Variables

```bash
NODE_ENV=test
LOG_LEVEL=silent
JWT_SECRET=test-secret
TEST_TIMEOUT=30000
```

## 📊 Test Reports

### Console Output
```bash
🧪 Starting TypeScript Web Framework Test Suite
=============================================================
🚀 Running tests in parallel...

📋 Running utils tests...
✅ utils: 25 passed
📋 Running auth tests...
✅ auth: 15 passed
📋 Running integration tests...
✅ integration: 12 passed

📊 Generating test reports...
📄 JSON report: ./test-results/test-results.json
🌐 HTML report: ./test-results/test-results.html

📊 TEST SUMMARY
=============================================================
Total Tests: 52
✅ Passed: 52
❌ Failed: 0
⏭️  Skipped: 0
⏱️  Duration: 2.34s
📦 Suites: 3

🎉 All tests passed!
```

### Generated Reports

- **JSON Report**: `test-results/test-results.json` - Machine-readable results
- **HTML Report**: `test-results/test-results.html` - Visual dashboard
- **JUnit XML**: `test-results/junit.xml` - CI/CD integration

## 🔧 Development Workflow

### Watch Mode

For active development with automatic test re-running:

```bash
bun run test:watch
```

Interactive commands:
- `r` - Run tests manually
- `c` - Clear console
- `h` - Show help
- `q` - Quit

### Test-Driven Development

1. Write failing test
2. Implement feature
3. Ensure test passes
4. Refactor if needed

Example workflow:
```bash
# Start watch mode
bun run test:watch

# Edit source files in src/
# Tests automatically re-run on file changes
# Fix any failing tests
# Continue development
```

## 🏗️ CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:ci
      - uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-artifacts.tar.gz
```

### Local CI Simulation

```bash
# Run full CI pipeline locally
bun run test:ci

# This includes:
# - Dependency installation
# - Type checking
# - Full test suite with coverage
# - Performance benchmarks
# - Security audit
# - Report generation
```

## 📈 Coverage Reports

Coverage tracking for all framework components:

```bash
# Generate coverage report
bun run test:coverage

# Coverage includes:
# - Line coverage
# - Branch coverage  
# - Function coverage
# - Statement coverage
```

Coverage thresholds:
- Minimum 80% overall coverage
- 90% for critical security components
- 70% for utility functions

## 🎯 Writing New Tests

### Test Structure

```typescript
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { TestServer, createTestApp, setupTestEnv, cleanupTestEnv } from './test-helpers';

describe('Feature Name', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestEnv();
    const app = createTestApp();
    // Setup test routes and middleware
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  test('should do something', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/test/endpoint'
    });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Test Helpers

Use built-in test helpers for common operations:

```typescript
import { 
  expectStatus,
  expectJson, 
  expectSuccess,
  expectError,
  generateTestData,
  performanceTest
} from './test-helpers';

// Status code assertions
expectStatus(response, 200);

// Content type assertions  
expectJson(response);

// Response format assertions
expectSuccess(response);
expectError(response);

// Test data generation
const user = generateTestData.user();
const email = generateTestData.randomEmail();

// Performance testing
const results = await performanceTest(async () => {
  await someOperation();
}, 100); // 100 iterations
```

## 🐛 Debugging Tests

### Verbose Output

```bash
# Run tests with detailed output
bun run test:verbose

# Run specific test with debug info
bun test tests/specific.test.ts --verbose
```

### Test Isolation

```bash
# Run tests sequentially to avoid race conditions
bun run test:sequential

# Stop on first failure for debugging
bun run test:bail
```

### Common Issues

1. **Port conflicts**: Tests use random ports, but ensure no other services are running
2. **Async timing**: Use proper `await` and `delay()` helpers for timing-sensitive tests
3. **State cleanup**: Always clean up test state in `afterEach` hooks
4. **Environment isolation**: Use `setupTestEnv()` and `cleanupTestEnv()` helpers

## 📚 Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names that explain the expected behavior
- Keep tests focused on a single concern
- Use `beforeEach` and `afterEach` for setup and cleanup

### Assertions
- Use specific assertions (`toBe` vs `toEqual`)
- Test both success and failure cases
- Validate error messages and status codes
- Test edge cases and boundary conditions

### Performance
- Keep tests fast (< 5 seconds per test suite)
- Use mocks for external dependencies
- Parallel test execution when possible
- Clean up resources to prevent memory leaks

### Maintenance
- Update tests when changing functionality
- Remove obsolete tests
- Keep test data and fixtures minimal
- Document complex test scenarios

## 🔗 Related Commands

```bash
# Development
bun run dev                    # Start development server
bun run build                  # Build for production
bun run start                  # Start production server

# Testing
bun run test                   # Basic test runner
bun run test:all              # Comprehensive test suite
bun run test:watch            # Watch mode for development
bun run test:ci               # CI/CD pipeline

# Quality Assurance  
bun run test:coverage         # Coverage reports
bun run test:performance      # Performance benchmarks
bun run test:verbose          # Detailed output
```

---

For more information about the framework, see the main [README.md](../README.md).