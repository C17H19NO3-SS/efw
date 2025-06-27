import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { 
  EnvHelper, 
  ConfigManager, 
  UUIDGenerator, 
  PasswordHasher,
  InMemoryCache,
  globalCache,
  cache,
  memoize,
  CookieHelper,
  QueryStringParser,
  ResponseBuilder,
  AssetVersioning,
  ApiClient,
  ErrorPages
} from '../src/utils';
import { setupTestEnv, cleanupTestEnv, delay, generateTestData } from './test-helpers';
import TEST_CONFIG from './test.config';

describe('Environment Helper', () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  test('should get string values with defaults', () => {
    process.env.TEST_STRING = 'hello';
    expect(EnvHelper.getString('TEST_STRING')).toBe('hello');
    expect(EnvHelper.getString('NON_EXISTENT', 'default')).toBe('default');
    delete process.env.TEST_STRING;
  });

  test('should get number values with defaults', () => {
    process.env.TEST_NUMBER = '42';
    expect(EnvHelper.getNumber('TEST_NUMBER')).toBe(42);
    expect(EnvHelper.getNumber('NON_EXISTENT', 10)).toBe(10);
    delete process.env.TEST_NUMBER;
  });

  test('should get boolean values with defaults', () => {
    process.env.TEST_BOOL_TRUE = 'true';
    process.env.TEST_BOOL_FALSE = 'false';
    expect(EnvHelper.getBoolean('TEST_BOOL_TRUE')).toBe(true);
    expect(EnvHelper.getBoolean('TEST_BOOL_FALSE')).toBe(false);
    expect(EnvHelper.getBoolean('NON_EXISTENT', true)).toBe(true);
    delete process.env.TEST_BOOL_TRUE;
    delete process.env.TEST_BOOL_FALSE;
  });

  test('should get array values', () => {
    process.env.TEST_ARRAY = 'item1,item2,item3';
    expect(EnvHelper.getArray('TEST_ARRAY')).toEqual(['item1', 'item2', 'item3']);
    expect(EnvHelper.getArray('NON_EXISTENT', ['default'])).toEqual(['default']);
    delete process.env.TEST_ARRAY;
  });

  test('should check if environment is development/production', () => {
    process.env.NODE_ENV = 'development';
    expect(EnvHelper.isDevelopment()).toBe(true);
    expect(EnvHelper.isProduction()).toBe(false);
    
    process.env.NODE_ENV = 'production';
    expect(EnvHelper.isDevelopment()).toBe(false);
    expect(EnvHelper.isProduction()).toBe(true);
  });
});

describe('Configuration Manager', () => {
  let config: ConfigManager;

  beforeEach(() => {
    config = ConfigManager.getInstance();
    config.reset();
  });

  test('should be a singleton', () => {
    const config1 = ConfigManager.getInstance();
    const config2 = ConfigManager.getInstance();
    expect(config1).toBe(config2);
  });

  test('should load configuration from object', () => {
    const testConfig = {
      database: { url: 'test://localhost' },
      port: 3000
    };
    
    config.load(testConfig);
    expect(config.get('database')?.url).toBe('test://localhost');
    expect(config.get('port')).toBe(3000);
  });

  test('should merge configurations', () => {
    config.load({ a: 1, b: { c: 2 } });
    config.merge({ b: { d: 3 }, e: 4 });
    
    expect(config.get('a')).toBe(1);
    expect(config.get('b')?.c).toBe(2);
    expect(config.get('b')?.d).toBe(3);
    expect(config.get('e')).toBe(4);
  });

  test('should check environment types', () => {
    process.env.NODE_ENV = 'test';
    expect(config.isTest()).toBe(true);
    expect(config.isDevelopment()).toBe(false);
    expect(config.isProduction()).toBe(false);
  });
});

describe('UUID Generator', () => {
  test('should generate valid UUID v4', () => {
    const uuid = UUIDGenerator.v4();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('should generate short UUIDs', () => {
    const shortId = UUIDGenerator.short();
    expect(shortId).toHaveLength(8);
    expect(shortId).toMatch(/^[A-Za-z0-9]{8}$/);
  });

  test('should generate numeric UUIDs', () => {
    const numericId = UUIDGenerator.numeric();
    expect(numericId).toMatch(/^\d+$/);
    expect(numericId.length).toBeGreaterThan(0);
  });

  test('should generate timestamp-based UUIDs', () => {
    const timestampId1 = UUIDGenerator.timestamp();
    const timestampId2 = UUIDGenerator.timestamp();
    expect(timestampId1).not.toBe(timestampId2);
    expect(timestampId1.length).toBeGreaterThan(10);
  });

  test('should generate URL-safe UUIDs', () => {
    const urlSafeId = UUIDGenerator.urlSafe();
    expect(urlSafeId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(urlSafeId.length).toBeGreaterThan(0);
  });
});

describe('Password Hasher', () => {
  const hasher = new PasswordHasher();

  test('should hash passwords securely', async () => {
    const password = 'testPassword123!';
    const hash = await hasher.hash(password);
    
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
    expect(hash).toContain('$');
  });

  test('should verify correct passwords', async () => {
    const password = 'testPassword123!';
    const hash = await hasher.hash(password);
    
    const isValid = await hasher.verify(password, hash);
    expect(isValid).toBe(true);
  });

  test('should reject incorrect passwords', async () => {
    const password = 'testPassword123!';
    const wrongPassword = 'wrongPassword456!';
    const hash = await hasher.hash(password);
    
    const isValid = await hasher.verify(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  test('should check password strength', () => {
    expect(hasher.checkStrength('weak')).toBe('weak');
    expect(hasher.checkStrength('Medium123')).toBe('medium');
    expect(hasher.checkStrength('StrongP@ssw0rd!')).toBe('strong');
  });

  test('should generate secure passwords', () => {
    const generated = hasher.generate();
    expect(generated.length).toBeGreaterThanOrEqual(12);
    expect(hasher.checkStrength(generated)).toBe('strong');
  });
});

describe('In-Memory Cache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache({ maxSize: 100, defaultTTL: 1000 });
  });

  test('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  test('should respect TTL', async () => {
    cache.set('key1', 'value1', 100); // 100ms TTL
    expect(cache.get('key1')).toBe('value1');
    
    await delay(150);
    expect(cache.get('key1')).toBeUndefined();
  });

  test('should respect max size with LRU eviction', () => {
    const smallCache = new InMemoryCache({ maxSize: 2 });
    
    smallCache.set('key1', 'value1');
    smallCache.set('key2', 'value2');
    smallCache.set('key3', 'value3'); // Should evict key1
    
    expect(smallCache.get('key1')).toBeUndefined();
    expect(smallCache.get('key2')).toBe('value2');
    expect(smallCache.get('key3')).toBe('value3');
  });

  test('should handle cache statistics', () => {
    cache.set('key1', 'value1');
    cache.get('key1'); // hit
    cache.get('key2'); // miss
    
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  test('should clear cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    cache.clear();
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });
});

describe('Cookie Helper', () => {
  test('should parse cookie strings', () => {
    const cookieString = 'name=value; httpOnly; secure; path=/; maxAge=3600';
    const parsed = CookieHelper.parse(cookieString);
    
    expect(parsed.name).toBe('value');
    expect(parsed.httpOnly).toBe(true);
    expect(parsed.secure).toBe(true);
    expect(parsed.path).toBe('/');
    expect(parsed.maxAge).toBe(3600);
  });

  test('should serialize cookies', () => {
    const cookie = CookieHelper.serialize('sessionId', 'abc123', {
      httpOnly: true,
      secure: true,
      maxAge: 3600,
      path: '/'
    });
    
    expect(cookie).toContain('sessionId=abc123');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Max-Age=3600');
    expect(cookie).toContain('Path=/');
  });

  test('should handle cookie expiration', () => {
    const futureDate = new Date(Date.now() + 86400000); // 1 day
    const cookie = CookieHelper.serialize('test', 'value', {
      expires: futureDate
    });
    
    expect(cookie).toContain('Expires=');
  });
});

describe('Query String Parser', () => {
  const parser = new QueryStringParser();

  test('should parse query strings', () => {
    const result = parser.parse('name=John&age=30&hobbies=reading&hobbies=gaming');
    
    expect(result.name).toBe('John');
    expect(result.age).toBe('30');
    expect(result.hobbies).toEqual(['reading', 'gaming']);
  });

  test('should handle URL decoding', () => {
    const result = parser.parse('name=John%20Doe&message=Hello%20World%21');
    
    expect(result.name).toBe('John Doe');
    expect(result.message).toBe('Hello World!');
  });

  test('should stringify objects', () => {
    const obj = {
      name: 'John Doe',
      age: 30,
      hobbies: ['reading', 'gaming']
    };
    
    const result = parser.stringify(obj);
    expect(result).toContain('name=John%20Doe');
    expect(result).toContain('age=30');
    expect(result).toContain('hobbies=reading');
    expect(result).toContain('hobbies=gaming');
  });

  test('should handle nested objects', () => {
    const obj = {
      user: {
        name: 'John',
        address: {
          city: 'New York'
        }
      }
    };
    
    const result = parser.parse(parser.stringify(obj));
    expect(result['user[name]']).toBe('John');
    expect(result['user[address][city]']).toBe('New York');
  });
});

describe('Response Builder', () => {
  test('should build success responses', () => {
    const data = { id: 1, name: 'Test' };
    const response = ResponseBuilder.success(data);
    
    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
    expect(response.timestamp).toBeDefined();
  });

  test('should build error responses', () => {
    const response = ResponseBuilder.error('Something went wrong', 500);
    
    expect(response.success).toBe(false);
    expect(response.error.message).toBe('Something went wrong');
    expect(response.error.code).toBe(500);
    expect(response.timestamp).toBeDefined();
  });

  test('should build paginated responses', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const pagination = { page: 1, limit: 10, total: 2, totalPages: 1 };
    const response = ResponseBuilder.paginated(data, pagination);
    
    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
    expect(response.pagination).toEqual(pagination);
  });

  test('should build validation error responses', () => {
    const errors = [
      { field: 'email', message: 'Invalid email format' },
      { field: 'password', message: 'Password too weak' }
    ];
    const response = ResponseBuilder.validationError(errors);
    
    expect(response.success).toBe(false);
    expect(response.error.code).toBe(400);
    expect(response.error.details).toEqual(errors);
  });
});

describe('Asset Versioning', () => {
  test('should version CSS files', () => {
    const versioner = new AssetVersioning();
    const versionedPath = versioner.version('/css/style.css');
    
    expect(versionedPath).toMatch(/\/css\/style\.css\?v=[a-f0-9]+/);
  });

  test('should version JavaScript files', () => {
    const versioner = new AssetVersioning();
    const versionedPath = versioner.version('/js/app.js');
    
    expect(versionedPath).toMatch(/\/js\/app\.js\?v=[a-f0-9]+/);
  });

  test('should generate integrity hashes', () => {
    const versioner = new AssetVersioning();
    const integrity = versioner.generateIntegrity('test content');
    
    expect(integrity).toMatch(/^sha384-[A-Za-z0-9+/]+=*$/);
  });
});

describe('API Client', () => {
  test('should create client instance', () => {
    const client = new ApiClient('http://localhost:3000');
    expect(client).toBeDefined();
  });

  test('should handle request configuration', () => {
    const client = new ApiClient('http://localhost:3000', {
      timeout: 5000,
      headers: { 'Authorization': 'Bearer token' }
    });
    expect(client).toBeDefined();
  });
});

describe('Error Pages', () => {
  test('should generate 404 error page', () => {
    const page = ErrorPages.notFound({
      brandName: 'Test App',
      theme: 'light'
    });
    
    expect(page).toContain('404');
    expect(page).toContain('Not Found');
    expect(page).toContain('Test App');
  });

  test('should generate 500 error page', () => {
    const page = ErrorPages.internalServerError({
      showDetails: false,
      supportEmail: 'support@test.com'
    });
    
    expect(page).toContain('500');
    expect(page).toContain('Internal Server Error');
    expect(page).toContain('support@test.com');
  });

  test('should generate custom error page', () => {
    const page = ErrorPages.custom(418, 'I\'m a teapot', {
      brandName: 'Test App'
    });
    
    expect(page).toContain('418');
    expect(page).toContain('I\'m a teapot');
  });
});

describe('Memoization', () => {
  test('should memoize function results', async () => {
    let callCount = 0;
    const expensiveFunction = async (x: number) => {
      callCount++;
      return x * 2;
    };

    const memoized = memoize(expensiveFunction, 1000);
    
    const result1 = await memoized(5);
    const result2 = await memoized(5);
    
    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(callCount).toBe(1); // Function should only be called once
  });

  test('should respect TTL in memoization', async () => {
    let callCount = 0;
    const expensiveFunction = async (x: number) => {
      callCount++;
      return x * 2;
    };

    const memoized = memoize(expensiveFunction, 100); // 100ms TTL
    
    await memoized(5);
    await delay(150);
    await memoized(5);
    
    expect(callCount).toBe(2); // Function should be called twice due to TTL expiry
  });
});