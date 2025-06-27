import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { 
  TestServer, 
  createTestApp, 
  mockRequest, 
  mockResponse, 
  setupTestEnv, 
  cleanupTestEnv,
  delay,
  generateTestData
} from './test-helpers';
import TEST_CONFIG from './test.config';

describe('CORS Middleware', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestEnv();
    const app = createTestApp();
    
    // CORS middleware implementation
    const corsMiddleware = (options: any = {}) => {
      const {
        origin = '*',
        methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders = ['Content-Type', 'Authorization'],
        credentials = false,
        maxAge = 86400
      } = options;
      
      return (req: any, res: any, next: any) => {
        const requestOrigin = req.headers.origin;
        
        // Handle origin
        if (origin === '*') {
          res.setHeader('Access-Control-Allow-Origin', '*');
        } else if (Array.isArray(origin)) {
          if (origin.includes(requestOrigin)) {
            res.setHeader('Access-Control-Allow-Origin', requestOrigin);
          }
        } else if (typeof origin === 'string') {
          res.setHeader('Access-Control-Allow-Origin', origin);
        } else if (typeof origin === 'function') {
          const allowedOrigin = origin(requestOrigin);
          if (allowedOrigin) {
            res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
          }
        }
        
        // Handle methods
        res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
        
        // Handle headers
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
        
        // Handle credentials
        if (credentials) {
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        
        // Handle preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Max-Age', maxAge.toString());
          return res.status(204).send('');
        }
        
        next();
      };
    };
    
    app.use(corsMiddleware({
      origin: ['http://localhost:3000', 'https://example.com'],
      credentials: true
    }));
    
    app.get('/api/test', (req: any, res: any) => {
      res.json({ success: true, message: 'CORS test' });
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  test('should handle preflight OPTIONS request', async () => {
    const response = await testServer.request({
      method: 'OPTIONS',
      url: '/api/test',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-methods']).toContain('GET');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  test('should allow requests from allowed origins', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/api/test',
      headers: {
        'Origin': 'https://example.com'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
  });

  test('should reject requests from disallowed origins', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/api/test',
      headers: {
        'Origin': 'https://malicious.com'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Security Headers Middleware (Helmet)', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestEnv();
    const app = createTestApp();
    
    // Security headers middleware implementation
    const helmetMiddleware = (options: any = {}) => {
      const defaults = {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"]
          }
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        noSniff: true,
        frameguard: { action: 'deny' },
        xssFilter: true,
        referrerPolicy: 'same-origin'
      };
      
      const config = { ...defaults, ...options };
      
      return (req: any, res: any, next: any) => {
        // Content Security Policy
        if (config.contentSecurityPolicy) {
          const csp = Object.entries(config.contentSecurityPolicy.directives)
            .map(([key, value]) => {
              const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
              return `${directive} ${Array.isArray(value) ? value.join(' ') : value}`;
            })
            .join('; ');
          res.setHeader('Content-Security-Policy', csp);
        }
        
        // HTTP Strict Transport Security
        if (config.hsts) {
          let hstsHeader = `max-age=${config.hsts.maxAge}`;
          if (config.hsts.includeSubDomains) hstsHeader += '; includeSubDomains';
          if (config.hsts.preload) hstsHeader += '; preload';
          res.setHeader('Strict-Transport-Security', hstsHeader);
        }
        
        // X-Content-Type-Options
        if (config.noSniff) {
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        
        // X-Frame-Options
        if (config.frameguard) {
          res.setHeader('X-Frame-Options', config.frameguard.action.toUpperCase());
        }
        
        // X-XSS-Protection
        if (config.xssFilter) {
          res.setHeader('X-XSS-Protection', '1; mode=block');
        }
        
        // Referrer Policy
        if (config.referrerPolicy) {
          res.setHeader('Referrer-Policy', config.referrerPolicy);
        }
        
        next();
      };
    };
    
    app.use(helmetMiddleware());
    
    app.get('/secure', (req: any, res: any) => {
      res.json({ secure: true });
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  test('should set Content Security Policy header', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/secure'
    });
    
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  test('should set HSTS header', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/secure'
    });
    
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
  });

  test('should set X-Content-Type-Options header', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/secure'
    });
    
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('should set X-Frame-Options header', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/secure'
    });
    
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  test('should set XSS Protection header', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/secure'
    });
    
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
  });
});

describe('Rate Limiting Middleware', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestEnv();
    const app = createTestApp();
    
    // Rate limiting middleware implementation
    const rateLimitMiddleware = (options: any = {}) => {
      const {
        windowMs = 60 * 1000, // 1 minute
        max = 10,             // 10 requests per window
        message = 'Too many requests',
        statusCode = 429,
        keyGenerator = (req: any) => req.ip || req.connection?.remoteAddress || 'unknown'
      } = options;
      
      const store = new Map();
      
      // Clean up expired entries periodically
      setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store.entries()) {
          if (now - entry.resetTime > windowMs) {
            store.delete(key);
          }
        }
      }, windowMs);
      
      return (req: any, res: any, next: any) => {
        const key = keyGenerator(req);
        const now = Date.now();
        
        let entry = store.get(key);
        
        if (!entry || now - entry.resetTime > windowMs) {
          entry = {
            count: 0,
            resetTime: now
          };
          store.set(key, entry);
        }
        
        entry.count++;
        
        res.setHeader('X-RateLimit-Limit', max.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count).toString());
        res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime + windowMs).toISOString());
        
        if (entry.count > max) {
          return res.status(statusCode).json({
            success: false,
            error: { message, code: statusCode }
          });
        }
        
        next();
      };
    };
    
    app.use(rateLimitMiddleware({
      windowMs: 1000, // 1 second for testing
      max: 3
    }));
    
    app.get('/api/limited', (req: any, res: any) => {
      res.json({ success: true, message: 'Request allowed' });
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  test('should allow requests within rate limit', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/api/limited'
    });
    
    expect(response.status).toBe(200);
    expect(response.headers['x-ratelimit-limit']).toBe('3');
    expect(response.headers['x-ratelimit-remaining']).toBe('2');
  });

  test('should block requests exceeding rate limit', async () => {
    // Make requests up to the limit
    for (let i = 0; i < 3; i++) {
      await testServer.request({
        method: 'GET',
        url: '/api/limited'
      });
    }
    
    // This request should be blocked
    const response = await testServer.request({
      method: 'GET',
      url: '/api/limited'
    });
    
    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Too many requests');
  });

  test('should reset rate limit after window expires', async () => {
    // Make requests up to the limit
    for (let i = 0; i < 3; i++) {
      await testServer.request({
        method: 'GET',
        url: '/api/limited'
      });
    }
    
    // Wait for window to expire
    await delay(1100);
    
    // This request should now be allowed
    const response = await testServer.request({
      method: 'GET',
      url: '/api/limited'
    });
    
    expect(response.status).toBe(200);
    expect(response.headers['x-ratelimit-remaining']).toBe('2');
  });

  test('should include proper rate limit headers', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/api/limited'
    });
    
    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
    
    // Verify header values
    expect(parseInt(response.headers['x-ratelimit-limit'])).toBe(3);
    expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeLessThanOrEqual(3);
  });
});

describe('Input Sanitization Middleware', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestEnv();
    const app = createTestApp();
    
    // Input sanitization middleware
    const sanitizeMiddleware = () => {
      const escapeHtml = (text: string) => {
        const map: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
      };
      
      const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return escapeHtml(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }
        if (obj && typeof obj === 'object') {
          const sanitized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
          }
          return sanitized;
        }
        return obj;
      };
      
      return (req: any, res: any, next: any) => {
        if (req.body) {
          req.body = sanitizeObject(req.body);
        }
        if (req.query) {
          req.query = sanitizeObject(req.query);
        }
        next();
      };
    };
    
    app.use(sanitizeMiddleware());
    
    app.post('/api/sanitize', (req: any, res: any) => {
      res.json({ 
        success: true, 
        data: req.body,
        query: req.query 
      });
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  test('should sanitize HTML in request body', async () => {
    const maliciousInput = {
      message: '<script>alert("xss")</script>',
      name: 'John & Jane'
    };
    
    const response = await testServer.request({
      method: 'POST',
      url: '/api/sanitize',
      headers: { 'Content-Type': 'application/json' },
      body: maliciousInput
    });
    
    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(response.body.data.name).toBe('John &amp; Jane');
  });

  test('should sanitize nested objects', async () => {
    const nestedInput = {
      user: {
        profile: {
          bio: '<img src="x" onerror="alert(1)">'
        }
      }
    };
    
    const response = await testServer.request({
      method: 'POST',
      url: '/api/sanitize',
      headers: { 'Content-Type': 'application/json' },
      body: nestedInput
    });
    
    expect(response.status).toBe(200);
    expect(response.body.data.user.profile.bio).toBe('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
  });

  test('should sanitize arrays', async () => {
    const arrayInput = {
      tags: ['<script>', 'normal-tag', '"quoted"']
    };
    
    const response = await testServer.request({
      method: 'POST',
      url: '/api/sanitize',
      headers: { 'Content-Type': 'application/json' },
      body: arrayInput
    });
    
    expect(response.status).toBe(200);
    expect(response.body.data.tags).toEqual([
      '&lt;script&gt;',
      'normal-tag',
      '&quot;quoted&quot;'
    ]);
  });
});