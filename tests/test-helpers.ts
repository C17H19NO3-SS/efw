import { test, expect, beforeEach, afterEach } from 'bun:test';
import { Efw } from '../src/framework';

export interface TestRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface TestResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

export class TestServer {
  private app: Efw;
  private server: any;
  private port: number;

  constructor(app?: Efw) {
    this.app = app || new Efw();
    this.port = Math.floor(Math.random() * 10000) + 3000; // Random port between 3000-13000
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
    }
  }

  getPort(): number {
    return this.port;
  }

  getApp(): Efw {
    return this.app;
  }

  async request(options: TestRequest): Promise<TestResponse> {
    const url = `http://localhost:${this.port}${options.url}`;
    
    const response = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const body = await response.text();
    let parsedBody;
    
    try {
      parsedBody = JSON.parse(body);
    } catch {
      parsedBody = body;
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      headers,
      body: parsedBody,
    };
  }
}

export const createTestApp = (): Efw => {
  return new Efw();
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const generateTestData = {
  user: () => ({
    id: Math.floor(Math.random() * 1000),
    name: `Test User ${Math.random().toString(36).substring(7)}`,
    email: `test${Math.random().toString(36).substring(7)}@example.com`,
    age: Math.floor(Math.random() * 50) + 18,
  }),
  
  post: () => ({
    id: Math.floor(Math.random() * 1000),
    title: `Test Post ${Math.random().toString(36).substring(7)}`,
    content: `This is test content ${Math.random().toString(36).substring(7)}`,
    authorId: Math.floor(Math.random() * 100),
  }),
  
  randomString: (length: number = 10) => {
    return Math.random().toString(36).substring(2, 2 + length);
  },
  
  randomEmail: () => {
    return `test${Math.random().toString(36).substring(7)}@example.com`;
  },
  
  randomNumber: (min: number = 0, max: number = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
};

export const mockRequest = (options: Partial<any> = {}) => ({
  method: 'GET',
  url: '/',
  headers: {},
  params: {},
  query: {},
  body: undefined,
  ...options,
});

export const mockResponse = () => {
  const headers: Record<string, string> = {};
  const response = {
    statusCode: 200,
    headers,
    setHeader: (name: string, value: string) => {
      headers[name] = value;
      return response;
    },
    status: (code: number) => {
      response.statusCode = code;
      return response;
    },
    json: (data: any) => {
      response.body = data;
      headers['content-type'] = 'application/json';
      return response;
    },
    send: (data: any) => {
      response.body = data;
      return response;
    },
    render: (view: string, data?: any) => {
      response.body = { view, data };
      headers['content-type'] = 'text/html';
      return response;
    },
    body: undefined as any,
  };
  return response;
};

export const expectStatus = (response: TestResponse, status: number) => {
  expect(response.status).toBe(status);
};

export const expectHeader = (response: TestResponse, header: string, value: string) => {
  expect(response.headers[header.toLowerCase()]).toBe(value);
};

export const expectJson = (response: TestResponse) => {
  expect(response.headers['content-type']).toContain('application/json');
  expect(typeof response.body).toBe('object');
};

export const expectSuccess = (response: TestResponse) => {
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
};

export const expectError = (response: TestResponse) => {
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
};

// Test environment setup helpers
export const setupTestEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.JWT_SECRET = 'test-secret';
};

export const cleanupTestEnv = () => {
  delete process.env.NODE_ENV;
  delete process.env.LOG_LEVEL;
  delete process.env.JWT_SECRET;
};

// Mock implementations for external dependencies
export const createMockJWT = () => ({
  sign: (payload: any, secret: string, options?: any) => {
    return `mock.jwt.token.${btoa(JSON.stringify(payload))}`;
  },
  verify: (token: string, secret: string) => {
    if (token.startsWith('mock.jwt.token.')) {
      const payload = token.replace('mock.jwt.token.', '');
      return JSON.parse(atob(payload));
    }
    throw new Error('Invalid token');
  },
});

export const performanceTest = async (fn: () => Promise<void>, iterations: number = 100) => {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  
  const end = performance.now();
  const avgTime = (end - start) / iterations;
  
  return {
    totalTime: end - start,
    averageTime: avgTime,
    iterations,
    opsPerSecond: 1000 / avgTime,
  };
};