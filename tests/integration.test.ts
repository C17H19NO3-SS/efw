import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { 
  TestServer, 
  createTestApp, 
  setupTestEnv, 
  cleanupTestEnv,
  delay,
  generateTestData,
  expectStatus,
  expectJson,
  expectSuccess,
  expectError
} from './test-helpers';
import TEST_CONFIG from './test.config';

describe('Full EFW Integration', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestEnv();
    const app = createTestApp();
    
    // Mock session store
    const sessions = new Map();
    
    // Mock user database
    const users = [
      { id: 1, email: 'admin@example.com', password: 'hashed_admin_pass', role: 'admin' },
      { id: 2, email: 'user@example.com', password: 'hashed_user_pass', role: 'user' }
    ];
    
    // Mock JWT implementation
    const jwt = {
      sign: (payload: any, secret: string, options?: any) => {
        const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
        const encodedPayload = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 }));
        const signature = btoa(`signature-${Date.now()}`);
        return `${header}.${encodedPayload}.${signature}`;
      },
      verify: (token: string, secret: string) => {
        if (!token || !token.includes('.')) throw new Error('Invalid token');
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token');
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error('Token expired');
        return payload;
      }
    };
    
    // Security middleware stack
    app.use((req: any, res: any, next: any) => {
      // CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      if (req.method === 'OPTIONS') {
        return res.status(204).send('');
      }
      
      next();
    });
    
    // Request parsing middleware
    app.use((req: any, res: any, next: any) => {
      if (req.headers['content-type'] === 'application/json' && req.body) {
        try {
          req.body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
          return res.status(400).json({ 
            success: false, 
            error: { message: 'Invalid JSON', code: 400 } 
          });
        }
      }
      next();
    });
    
    // Authentication middleware
    app.use((req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, TEST_CONFIG.auth.testJwtSecret);
          req.user = decoded;
        } catch (error) {
          req.authError = (error as Error).message;
        }
      }
      
      next();
    });
    
    // Rate limiting (simplified)
    const rateLimitStore = new Map();
    app.use((req: any, res: any, next: any) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const windowStart = now - 60000; // 1 minute window
      
      let requests = rateLimitStore.get(key) || [];
      requests = requests.filter((time: number) => time > windowStart);
      
      if (requests.length >= 100) {
        return res.status(429).json({
          success: false,
          error: { message: 'Rate limit exceeded', code: 429 }
        });
      }
      
      requests.push(now);
      rateLimitStore.set(key, requests);
      
      next();
    });
    
    // Input validation middleware
    const validateUser = (req: any, res: any, next: any) => {
      const { email, password } = req.body || {};
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Validation failed',
            code: 400,
            details: [
              { field: 'email', message: 'Email is required' },
              { field: 'password', message: 'Password is required' }
            ]
          }
        });
      }
      
      if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 400,
            details: [{ field: 'email', message: 'Invalid email format' }]
          }
        });
      }
      
      next();
    };
    
    const requireAuth = (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required', code: 401 }
        });
      }
      next();
    };
    
    const requireAdmin = (req: any, res: any, next: any) => {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { message: 'Admin access required', code: 403 }
        });
      }
      next();
    };
    
    // Routes
    
    // Public routes
    app.get('/', (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          message: 'Welcome to the EFW (Efficient Framework for Web)',
          version: '1.0.0',
          endpoints: ['/auth/login', '/api/users', '/admin/stats']
        }
      });
    });
    
    app.post('/auth/login', validateUser, (req: any, res: any) => {
      const { email, password } = req.body;
      const user = users.find(u => u.email === email);
      
      if (!user || user.password !== `hashed_${password}`) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid credentials', code: 401 }
        });
      }
      
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        TEST_CONFIG.auth.testJwtSecret
      );
      
      res.json({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, role: user.role }
        }
      });
    });
    
    app.post('/auth/register', validateUser, (req: any, res: any) => {
      const { email, password } = req.body;
      
      if (users.find(u => u.email === email)) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email already exists', code: 409 }
        });
      }
      
      const newUser = {
        id: users.length + 1,
        email,
        password: `hashed_${password}`,
        role: 'user'
      };
      
      users.push(newUser);
      
      res.status(201).json({
        success: true,
        data: {
          user: { id: newUser.id, email: newUser.email, role: newUser.role }
        }
      });
    });
    
    // Protected routes
    app.get('/api/profile', requireAuth, (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    });
    
    app.get('/api/users', requireAuth, (req: any, res: any) => {
      const page = parseInt(req.query?.page) || 1;
      const limit = parseInt(req.query?.limit) || 10;
      const offset = (page - 1) * limit;
      
      const paginatedUsers = users
        .slice(offset, offset + limit)
        .map(({ password, ...user }) => user);
      
      res.json({
        success: true,
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: users.length,
          totalPages: Math.ceil(users.length / limit)
        }
      });
    });
    
    app.put('/api/users/:id', requireAuth, (req: any, res: any) => {
      const userId = parseInt(req.params.id);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found', code: 404 }
        });
      }
      
      // Users can only update their own profile (except admins)
      if (req.user.role !== 'admin' && req.user.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden', code: 403 }
        });
      }
      
      const { email } = req.body;
      if (email) {
        users[userIndex].email = email;
      }
      
      const { password, ...updatedUser } = users[userIndex];
      
      res.json({
        success: true,
        data: { user: updatedUser }
      });
    });
    
    // Admin routes
    app.get('/admin/stats', requireAdmin, (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          totalUsers: users.length,
          adminUsers: users.filter(u => u.role === 'admin').length,
          regularUsers: users.filter(u => u.role === 'user').length,
          lastLogin: new Date().toISOString()
        }
      });
    });
    
    app.delete('/admin/users/:id', requireAdmin, (req: any, res: any) => {
      const userId = parseInt(req.params.id);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found', code: 404 }
        });
      }
      
      users.splice(userIndex, 1);
      
      res.json({
        success: true,
        data: { message: 'User deleted successfully' }
      });
    });
    
    // Health check
    app.get('/health', (req: any, res: any) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });
    
    // Template rendering route
    app.get('/page/:name', (req: any, res: any) => {
      const template = `
        <!DOCTYPE html>
        <html>
          <head><title>{{title}}</title></head>
          <body>
            <h1>{{title}}</h1>
            <p>{{content}}</p>
          </body>
        </html>
      `;
      
      const rendered = template
        .replace(/\{\{title\}\}/g, req.params.name)
        .replace(/\{\{content\}\}/g, `This is the ${req.params.name} page.`);
      
      res.html(rendered);
    });
    
    // Error handling middleware
    app.use((error: Error, req: any, res: any, next: any) => {
      console.error('Error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 500,
          ...(process.env.NODE_ENV !== 'production' && { details: error.message })
        }
      });
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  describe('End-to-End User Journey', () => {
    test('should handle complete user registration and authentication flow', async () => {
      // 1. Register new user
      const registerResponse = await testServer.request({
        method: 'POST',
        url: '/auth/register',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'newuser@example.com', password: 'password123' }
      });
      
      expectStatus(registerResponse, 201);
      expectSuccess(registerResponse);
      expect(registerResponse.body.data.user.email).toBe('newuser@example.com');
      
      // 2. Login with new user
      const loginResponse = await testServer.request({
        method: 'POST',
        url: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'newuser@example.com', password: 'password123' }
      });
      
      expectStatus(loginResponse, 200);
      expectSuccess(loginResponse);
      expect(loginResponse.body.data.token).toBeDefined();
      
      const token = loginResponse.body.data.token;
      
      // 3. Access protected profile endpoint
      const profileResponse = await testServer.request({
        method: 'GET',
        url: '/api/profile',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      expectStatus(profileResponse, 200);
      expectSuccess(profileResponse);
      expect(profileResponse.body.data.user.email).toBe('newuser@example.com');
      
      // 4. Update profile
      const updateResponse = await testServer.request({
        method: 'PUT',
        url: `/api/users/${loginResponse.body.data.user.id}`,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: { email: 'updated@example.com' }
      });
      
      expectStatus(updateResponse, 200);
      expectSuccess(updateResponse);
      expect(updateResponse.body.data.user.email).toBe('updated@example.com');
    });

    test('should handle admin operations', async () => {
      // 1. Login as admin
      const adminLoginResponse = await testServer.request({
        method: 'POST',
        url: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'admin@example.com', password: 'admin_pass' }
      });
      
      expectStatus(adminLoginResponse, 200);
      const adminToken = adminLoginResponse.body.data.token;
      
      // 2. Access admin stats
      const statsResponse = await testServer.request({
        method: 'GET',
        url: '/admin/stats',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      expectStatus(statsResponse, 200);
      expectSuccess(statsResponse);
      expect(statsResponse.body.data.totalUsers).toBeGreaterThan(0);
      
      // 3. List all users
      const usersResponse = await testServer.request({
        method: 'GET',
        url: '/api/users',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      expectStatus(usersResponse, 200);
      expectSuccess(usersResponse);
      expect(usersResponse.body.data).toBeInstanceOf(Array);
      expect(usersResponse.body.pagination).toBeDefined();
    });
  });

  describe('Security Integration', () => {
    test('should enforce authentication on protected routes', async () => {
      const response = await testServer.request({
        method: 'GET',
        url: '/api/profile'
      });
      
      expectStatus(response, 401);
      expectError(response);
      expect(response.body.error.message).toBe('Authentication required');
    });

    test('should enforce authorization on admin routes', async () => {
      // Login as regular user
      const loginResponse = await testServer.request({
        method: 'POST',
        url: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'user@example.com', password: 'user_pass' }
      });
      
      const userToken = loginResponse.body.data.token;
      
      // Try to access admin endpoint
      const response = await testServer.request({
        method: 'GET',
        url: '/admin/stats',
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      expectStatus(response, 403);
      expectError(response);
      expect(response.body.error.message).toBe('Admin access required');
    });

    test('should include security headers', async () => {
      const response = await testServer.request({
        method: 'GET',
        url: '/'
      });
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    test('should handle CORS preflight requests', async () => {
      const response = await testServer.request({
        method: 'OPTIONS',
        url: '/api/users',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET'
        }
      });
      
      expectStatus(response, 204);
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });

  describe('Input Validation Integration', () => {
    test('should validate required fields', async () => {
      const response = await testServer.request({
        method: 'POST',
        url: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'test@example.com' } // Missing password
      });
      
      expectStatus(response, 400);
      expectError(response);
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.some((d: any) => d.field === 'password')).toBe(true);
    });

    test('should validate email format', async () => {
      const response = await testServer.request({
        method: 'POST',
        url: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'invalid-email', password: 'password123' }
      });
      
      expectStatus(response, 400);
      expectError(response);
      expect(response.body.error.details.some((d: any) => d.field === 'email')).toBe(true);
    });

    test('should handle malformed JSON', async () => {
      const response = await testServer.request({
        method: 'POST',
        url: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json}'
      });
      
      expectStatus(response, 400);
      expectError(response);
      expect(response.body.error.message).toBe('Invalid JSON');
    });
  });

  describe('Template Rendering Integration', () => {
    test('should render HTML templates', async () => {
      const response = await testServer.request({
        method: 'GET',
        url: '/page/welcome'
      });
      
      expectStatus(response, 200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>welcome</title>');
      expect(response.body).toContain('<h1>welcome</h1>');
      expect(response.body).toContain('This is the welcome page.');
    });
  });

  describe('Error Handling Integration', () => {
    test('should return proper error responses for not found', async () => {
      const response = await testServer.request({
        method: 'GET',
        url: '/nonexistent/route'
      });
      
      expectStatus(response, 404);
    });

    test('should handle duplicate registration', async () => {
      // Try to register with existing email
      const response = await testServer.request({
        method: 'POST',
        url: '/auth/register',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'admin@example.com', password: 'password123' }
      });
      
      expectStatus(response, 409);
      expectError(response);
      expect(response.body.error.message).toBe('Email already exists');
    });
  });

  describe('Pagination Integration', () => {
    test('should support pagination in user listing', async () => {
      // Login first
      const loginResponse = await testServer.request({
        method: 'POST',
        url: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'admin@example.com', password: 'admin_pass' }
      });
      
      const token = loginResponse.body.data.token;
      
      // Test pagination
      const response = await testServer.request({
        method: 'GET',
        url: '/api/users?page=1&limit=1',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      expectStatus(response, 200);
      expectSuccess(response);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });
  });

  describe('Health Check Integration', () => {
    test('should provide health status', async () => {
      const response = await testServer.request({
        method: 'GET',
        url: '/health'
      });
      
      expectStatus(response, 200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.memory).toBeDefined();
    });
  });
});