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

// Mock JWT for testing since we're using Bun
const mockJWT = {
  sign: (payload: any, secret: string, options?: any) => {
    const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = btoa(`mock-signature-${Date.now()}`);
    return `${header}.${encodedPayload}.${signature}`;
  },
  
  verify: (token: string, secret: string) => {
    if (!token || !token.includes('.')) {
      throw new Error('Invalid token format');
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    try {
      const payload = JSON.parse(atob(parts[1]));
      
      // Check expiration
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        throw new Error('Token expired');
      }
      
      return payload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
};

describe('JWT Authentication', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestEnv();
    const app = createTestApp();
    
    // Add JWT middleware with mock
    app.use((req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          const decoded = mockJWT.verify(token, TEST_CONFIG.auth.testJwtSecret);
          req.user = decoded;
        } catch (error) {
          return res.status(401).json({ 
            success: false, 
            error: { message: 'Invalid token', code: 401 } 
          });
        }
      }
      
      next();
    });
    
    // Test routes
    app.post('/auth/login', (req: any, res: any) => {
      const { email, password } = req.body;
      
      if (email === 'test@example.com' && password === 'password123') {
        const token = mockJWT.sign(
          { userId: 1, email },
          TEST_CONFIG.auth.testJwtSecret,
          { expiresIn: '1h' }
        );
        
        res.json({
          success: true,
          data: { token, user: { id: 1, email } }
        });
      } else {
        res.status(401).json({
          success: false,
          error: { message: 'Invalid credentials', code: 401 }
        });
      }
    });
    
    app.get('/auth/profile', (req: any, res: any) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required', code: 401 }
        });
      }
      
      res.json({
        success: true,
        data: { user: req.user }
      });
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  test('should login with valid credentials', async () => {
    const response = await testServer.request({
      method: 'POST',
      url: '/auth/login',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'test@example.com', password: 'password123' }
    });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  test('should reject invalid credentials', async () => {
    const response = await testServer.request({
      method: 'POST',
      url: '/auth/login',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'test@example.com', password: 'wrongpassword' }
    });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Invalid credentials');
  });

  test('should access protected route with valid token', async () => {
    // First login to get token
    const loginResponse = await testServer.request({
      method: 'POST',
      url: '/auth/login',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'test@example.com', password: 'password123' }
    });
    
    const token = loginResponse.body.data.token;
    
    // Then access protected route
    const response = await testServer.request({
      method: 'GET',
      url: '/auth/profile',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  test('should reject access without token', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/auth/profile'
    });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Authentication required');
  });

  test('should reject access with invalid token', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/auth/profile',
      headers: { 'Authorization': 'Bearer invalid.token.here' }
    });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Invalid token');
  });

  test('should handle token expiration', async () => {
    // Create an expired token
    const expiredToken = mockJWT.sign(
      { userId: 1, email: 'test@example.com', exp: Math.floor(Date.now() / 1000) - 3600 },
      TEST_CONFIG.auth.testJwtSecret
    );
    
    const response = await testServer.request({
      method: 'GET',
      url: '/auth/profile',
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe('Session Authentication', () => {
  let testServer: TestServer;
  const sessions = new Map(); // Mock session store
  
  beforeEach(async () => {
    setupTestEnv();
    const app = createTestApp();
    
    // Session middleware mock
    app.use((req: any, res: any, next: any) => {
      const sessionId = req.headers['x-session-id'];
      
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        
        // Check session expiration
        if (session.expires > Date.now()) {
          req.session = session.data;
        } else {
          sessions.delete(sessionId);
        }
      }
      
      // Helper function to save session
      req.saveSession = (data: any) => {
        const sessionId = generateSessionId();
        const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        
        sessions.set(sessionId, { data, expires });
        res.setHeader('X-Session-Id', sessionId);
        req.session = data;
      };
      
      next();
    });
    
    // Test routes
    app.post('/session/login', (req: any, res: any) => {
      const { email, password } = req.body;
      
      if (email === 'test@example.com' && password === 'password123') {
        req.saveSession({ userId: 1, email });
        
        res.json({
          success: true,
          data: { user: { id: 1, email } }
        });
      } else {
        res.status(401).json({
          success: false,
          error: { message: 'Invalid credentials', code: 401 }
        });
      }
    });
    
    app.get('/session/profile', (req: any, res: any) => {
      if (!req.session) {
        return res.status(401).json({
          success: false,
          error: { message: 'Session required', code: 401 }
        });
      }
      
      res.json({
        success: true,
        data: { user: req.session }
      });
    });
    
    app.post('/session/logout', (req: any, res: any) => {
      const sessionId = req.headers['x-session-id'];
      
      if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
      }
      
      res.json({
        success: true,
        data: { message: 'Logged out successfully' }
      });
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    sessions.clear();
    cleanupTestEnv();
  });

  test('should create session on login', async () => {
    const response = await testServer.request({
      method: 'POST',
      url: '/session/login',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'test@example.com', password: 'password123' }
    });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.headers['x-session-id']).toBeDefined();
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  test('should access protected route with valid session', async () => {
    // First login to get session
    const loginResponse = await testServer.request({
      method: 'POST',
      url: '/session/login',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'test@example.com', password: 'password123' }
    });
    
    const sessionId = loginResponse.headers['x-session-id'];
    
    // Then access protected route
    const response = await testServer.request({
      method: 'GET',
      url: '/session/profile',
      headers: { 'X-Session-Id': sessionId }
    });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  test('should reject access without session', async () => {
    const response = await testServer.request({
      method: 'GET',
      url: '/session/profile'
    });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Session required');
  });

  test('should handle session logout', async () => {
    // Login first
    const loginResponse = await testServer.request({
      method: 'POST',
      url: '/session/login',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'test@example.com', password: 'password123' }
    });
    
    const sessionId = loginResponse.headers['x-session-id'];
    
    // Logout
    const logoutResponse = await testServer.request({
      method: 'POST',
      url: '/session/logout',
      headers: { 'X-Session-Id': sessionId }
    });
    
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);
    
    // Try to access protected route after logout
    const profileResponse = await testServer.request({
      method: 'GET',
      url: '/session/profile',
      headers: { 'X-Session-Id': sessionId }
    });
    
    expect(profileResponse.status).toBe(401);
  });

  test('should handle session expiration', async () => {
    // Create an expired session manually
    const sessionId = generateSessionId();
    const expiredSession = {
      data: { userId: 1, email: 'test@example.com' },
      expires: Date.now() - 1000 // Expired 1 second ago
    };
    
    sessions.set(sessionId, expiredSession);
    
    const response = await testServer.request({
      method: 'GET',
      url: '/session/profile',
      headers: { 'X-Session-Id': sessionId }
    });
    
    expect(response.status).toBe(401);
    expect(sessions.has(sessionId)).toBe(false); // Should be cleaned up
  });
});

describe('Authentication Middleware', () => {
  test('should handle missing authorization header', () => {
    const req = mockRequest({ headers: {} });
    const res = mockResponse();
    let nextCalled = false;
    
    const middleware = (req: any, res: any, next: any) => {
      if (!req.headers.authorization) {
        return res.status(401).json({ error: 'No authorization header' });
      }
      next();
    };
    
    const next = () => { nextCalled = true; };
    
    middleware(req, res, next);
    
    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  test('should handle malformed authorization header', () => {
    const req = mockRequest({ 
      headers: { authorization: 'InvalidFormat' } 
    });
    const res = mockResponse();
    let nextCalled = false;
    
    const middleware = (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Invalid authorization header' });
      }
      next();
    };
    
    const next = () => { nextCalled = true; };
    
    middleware(req, res, next);
    
    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  test('should pass through valid authorization', () => {
    const req = mockRequest({ 
      headers: { authorization: 'Bearer valid-token' } 
    });
    const res = mockResponse();
    let nextCalled = false;
    
    const middleware = (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        req.token = authHeader.substring(7);
      }
      next();
    };
    
    const next = () => { nextCalled = true; };
    
    middleware(req, res, next);
    
    expect(req.token).toBe('valid-token');
    expect(nextCalled).toBe(true);
  });
});

// Helper function to generate session IDs
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}