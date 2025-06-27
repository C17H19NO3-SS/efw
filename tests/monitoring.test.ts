import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { 
  TestServer, 
  createTestApp, 
  setupTestEnv, 
  cleanupTestEnv,
  delay,
  performanceTest
} from './test-helpers';

describe('Request Monitoring', () => {
  let testServer: TestServer;
  let requestMetrics: any;
  
  beforeEach(async () => {
    setupTestEnv();
    requestMetrics = {
      totalRequests: 0,
      requestsByMethod: {},
      requestsByPath: {},
      responseTimeSum: 0,
      averageResponseTime: 0,
      errorCount: 0,
      statusCodes: {},
      requests: []
    };
    
    const app = createTestApp();
    
    // Monitoring middleware
    const monitoringMiddleware = () => {
      return (req: any, res: any, next: any) => {
        const startTime = performance.now();
        const originalSend = res.send;
        const originalJson = res.json;
        
        // Track request start
        requestMetrics.totalRequests++;
        
        // Track by method
        if (!requestMetrics.requestsByMethod[req.method]) {
          requestMetrics.requestsByMethod[req.method] = 0;
        }
        requestMetrics.requestsByMethod[req.method]++;
        
        // Track by path
        const path = req.path || req.url.split('?')[0];
        if (!requestMetrics.requestsByPath[path]) {
          requestMetrics.requestsByPath[path] = 0;
        }
        requestMetrics.requestsByPath[path]++;
        
        // Override response methods to track completion
        res.send = function(data: any) {
          const responseTime = performance.now() - startTime;
          trackResponse(req, res, responseTime);
          return originalSend.call(this, data);
        };
        
        res.json = function(data: any) {
          const responseTime = performance.now() - startTime;
          trackResponse(req, res, responseTime);
          return originalJson.call(this, data);
        };
        
        function trackResponse(req: any, res: any, responseTime: number) {
          // Track response time
          requestMetrics.responseTimeSum += responseTime;
          requestMetrics.averageResponseTime = requestMetrics.responseTimeSum / requestMetrics.totalRequests;
          
          // Track status codes
          const statusCode = res.statusCode || 200;
          if (!requestMetrics.statusCodes[statusCode]) {
            requestMetrics.statusCodes[statusCode] = 0;
          }
          requestMetrics.statusCodes[statusCode]++;
          
          // Track errors
          if (statusCode >= 400) {
            requestMetrics.errorCount++;
          }
          
          // Store individual request data
          requestMetrics.requests.push({
            method: req.method,
            path: req.path || req.url.split('?')[0],
            statusCode: statusCode,
            responseTime: responseTime,
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent'] || 'unknown',
            ip: req.ip || req.connection?.remoteAddress || 'unknown'
          });
          
          // Keep only last 100 requests
          if (requestMetrics.requests.length > 100) {
            requestMetrics.requests = requestMetrics.requests.slice(-100);
          }
        }
        
        next();
      };
    };
    
    app.use(monitoringMiddleware());
    
    // Test routes
    app.get('/api/fast', (req: any, res: any) => {
      res.json({ message: 'Fast response' });
    });
    
    app.get('/api/slow', async (req: any, res: any) => {
      await delay(100); // Simulate slow operation
      res.json({ message: 'Slow response' });
    });
    
    app.get('/api/error', (req: any, res: any) => {
      res.status(500).json({ error: 'Server error' });
    });
    
    app.get('/api/notfound', (req: any, res: any) => {
      res.status(404).json({ error: 'Not found' });
    });
    
    app.get('/metrics', (req: any, res: any) => {
      res.json(requestMetrics);
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  test('should track total request count', async () => {
    await testServer.request({ method: 'GET', url: '/api/fast' });
    await testServer.request({ method: 'GET', url: '/api/fast' });
    await testServer.request({ method: 'POST', url: '/api/fast' });
    
    const metricsResponse = await testServer.request({ method: 'GET', url: '/metrics' });
    
    expect(metricsResponse.body.totalRequests).toBe(4); // 3 + 1 for metrics call
  });

  test('should track requests by HTTP method', async () => {
    await testServer.request({ method: 'GET', url: '/api/fast' });
    await testServer.request({ method: 'POST', url: '/api/fast' });
    await testServer.request({ method: 'PUT', url: '/api/fast' });
    
    const metricsResponse = await testServer.request({ method: 'GET', url: '/metrics' });
    
    expect(metricsResponse.body.requestsByMethod.GET).toBe(2); // 1 + 1 for metrics call
    expect(metricsResponse.body.requestsByMethod.POST).toBe(1);
    expect(metricsResponse.body.requestsByMethod.PUT).toBe(1);
  });

  test('should track requests by path', async () => {
    await testServer.request({ method: 'GET', url: '/api/fast' });
    await testServer.request({ method: 'GET', url: '/api/fast' });
    await testServer.request({ method: 'GET', url: '/api/slow' });
    
    const metricsResponse = await testServer.request({ method: 'GET', url: '/metrics' });
    
    expect(metricsResponse.body.requestsByPath['/api/fast']).toBe(2);
    expect(metricsResponse.body.requestsByPath['/api/slow']).toBe(1);
    expect(metricsResponse.body.requestsByPath['/metrics']).toBe(1);
  });

  test('should track response times', async () => {
    await testServer.request({ method: 'GET', url: '/api/fast' });
    await testServer.request({ method: 'GET', url: '/api/slow' });
    
    const metricsResponse = await testServer.request({ method: 'GET', url: '/metrics' });
    
    expect(metricsResponse.body.averageResponseTime).toBeGreaterThan(0);
    expect(metricsResponse.body.responseTimeSum).toBeGreaterThan(0);
    
    // Check individual request times
    const fastRequest = metricsResponse.body.requests.find((r: any) => r.path === '/api/fast');
    const slowRequest = metricsResponse.body.requests.find((r: any) => r.path === '/api/slow');
    
    expect(fastRequest.responseTime).toBeLessThan(slowRequest.responseTime);
  });

  test('should track status codes', async () => {
    await testServer.request({ method: 'GET', url: '/api/fast' });
    await testServer.request({ method: 'GET', url: '/api/error' });
    await testServer.request({ method: 'GET', url: '/api/notfound' });
    
    const metricsResponse = await testServer.request({ method: 'GET', url: '/metrics' });
    
    expect(metricsResponse.body.statusCodes['200']).toBe(2); // fast + metrics
    expect(metricsResponse.body.statusCodes['500']).toBe(1);
    expect(metricsResponse.body.statusCodes['404']).toBe(1);
  });

  test('should track error count', async () => {
    await testServer.request({ method: 'GET', url: '/api/fast' });
    await testServer.request({ method: 'GET', url: '/api/error' });
    await testServer.request({ method: 'GET', url: '/api/notfound' });
    
    const metricsResponse = await testServer.request({ method: 'GET', url: '/metrics' });
    
    expect(metricsResponse.body.errorCount).toBe(2); // 500 + 404
  });

  test('should store detailed request information', async () => {
    await testServer.request({ 
      method: 'GET', 
      url: '/api/fast',
      headers: { 'User-Agent': 'Test Browser 1.0' }
    });
    
    const metricsResponse = await testServer.request({ method: 'GET', url: '/metrics' });
    
    const request = metricsResponse.body.requests.find((r: any) => r.path === '/api/fast');
    
    expect(request).toBeDefined();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/api/fast');
    expect(request.statusCode).toBe(200);
    expect(request.timestamp).toBeDefined();
    expect(request.userAgent).toBe('Test Browser 1.0');
    expect(request.responseTime).toBeGreaterThan(0);
  });
});

describe('System Monitoring', () => {
  let testServer: TestServer;
  let systemMetrics: any;
  
  beforeEach(async () => {
    setupTestEnv();
    systemMetrics = {
      memoryUsage: {
        used: 0,
        total: 0,
        percentage: 0
      },
      uptime: 0,
      startTime: Date.now(),
      cpuUsage: 0,
      requestsPerSecond: 0,
      activeConnections: 0
    };
    
    const app = createTestApp();
    
    // System monitoring middleware
    const systemMonitoringMiddleware = () => {
      let requestCount = 0;
      let lastRequestCountTime = Date.now();
      
      return (req: any, res: any, next: any) => {
        requestCount++;
        
        // Update RPS every second
        const now = Date.now();
        if (now - lastRequestCountTime >= 1000) {
          systemMetrics.requestsPerSecond = requestCount;
          requestCount = 0;
          lastRequestCountTime = now;
        }
        
        // Update system metrics
        systemMetrics.uptime = now - systemMetrics.startTime;
        
        // Mock memory usage (in a real app, you'd use process.memoryUsage())
        const heapTotal = Math.random() * 50 * 1024 * 1024; // Random heap total between 0-50MB
        const heapUsed = Math.random() * heapTotal; // Random heap used, but less than total
        const memUsage = {
          rss: Math.random() * 100 * 1024 * 1024, // Random RSS between 0-100MB
          heapTotal,
          heapUsed,
          external: Math.random() * 10 * 1024 * 1024
        };
        
        systemMetrics.memoryUsage = {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
          rss: memUsage.rss,
          external: memUsage.external
        };
        
        // Mock CPU usage
        systemMetrics.cpuUsage = Math.random() * 100;
        
        next();
      };
    };
    
    app.use(systemMonitoringMiddleware());
    
    app.get('/system/metrics', (req: any, res: any) => {
      res.json(systemMetrics);
    });
    
    app.get('/system/health', (req: any, res: any) => {
      const isHealthy = systemMetrics.memoryUsage.percentage < 90 && 
                       systemMetrics.cpuUsage < 90;
      
      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        uptime: systemMetrics.uptime,
        memory: systemMetrics.memoryUsage,
        cpu: systemMetrics.cpuUsage,
        timestamp: new Date().toISOString()
      });
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  test('should track system uptime', async () => {
    await delay(100);
    
    const response = await testServer.request({ method: 'GET', url: '/system/metrics' });
    
    expect(response.body.uptime).toBeGreaterThan(0);
    expect(response.body.startTime).toBeDefined();
  });

  test('should track memory usage', async () => {
    const response = await testServer.request({ method: 'GET', url: '/system/metrics' });
    
    expect(response.body.memoryUsage.used).toBeGreaterThan(0);
    expect(response.body.memoryUsage.total).toBeGreaterThan(0);
    expect(response.body.memoryUsage.percentage).toBeGreaterThanOrEqual(0);
    expect(response.body.memoryUsage.percentage).toBeLessThanOrEqual(100);
  });

  test('should track CPU usage', async () => {
    const response = await testServer.request({ method: 'GET', url: '/system/metrics' });
    
    expect(response.body.cpuUsage).toBeGreaterThanOrEqual(0);
    expect(response.body.cpuUsage).toBeLessThanOrEqual(100);
  });

  test('should provide health check endpoint', async () => {
    const response = await testServer.request({ method: 'GET', url: '/system/health' });
    
    expect(response.status).toBeOneOf([200, 503]);
    expect(response.body.status).toBeOneOf(['healthy', 'unhealthy']);
    expect(response.body.uptime).toBeGreaterThan(0);
    expect(response.body.memory).toBeDefined();
    expect(response.body.cpu).toBeDefined();
    expect(response.body.timestamp).toBeDefined();
  });
});

describe('Dashboard Generation', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestEnv();
    const app = createTestApp();
    
    // Mock dashboard data
    const dashboardData = {
      metrics: {
        totalRequests: 1234,
        averageResponseTime: 45.6,
        errorRate: 2.3,
        uptime: 86400000, // 1 day
        memoryUsage: 67.8
      },
      recentRequests: [
        { method: 'GET', path: '/api/users', status: 200, time: 23 },
        { method: 'POST', path: '/api/users', status: 201, time: 89 },
        { method: 'GET', path: '/api/posts', status: 200, time: 34 },
        { method: 'DELETE', path: '/api/posts/1', status: 404, time: 12 }
      ],
      popularEndpoints: [
        { path: '/api/users', count: 456 },
        { path: '/api/posts', count: 234 },
        { path: '/api/auth/login', count: 123 }
      ]
    };
    
    // Dashboard HTML generator
    const generateDashboardHTML = (data: any) => {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Monitoring Dashboard</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .metric { 
              display: inline-block; 
              margin: 10px; 
              padding: 20px; 
              border: 1px solid #ddd; 
              border-radius: 5px; 
            }
            .metric-value { font-size: 2em; font-weight: bold; }
            .metric-label { color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            .status-200 { color: green; }
            .status-400 { color: orange; }
            .status-500 { color: red; }
          </style>
          <script>
            function refreshDashboard() {
              window.location.reload();
            }
            setInterval(refreshDashboard, 30000); // Refresh every 30 seconds
          </script>
        </head>
        <body>
          <h1>System Monitoring Dashboard</h1>
          
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">${data.metrics.totalRequests}</div>
              <div class="metric-label">Total Requests</div>
            </div>
            <div class="metric">
              <div class="metric-value">${data.metrics.averageResponseTime}ms</div>
              <div class="metric-label">Avg Response Time</div>
            </div>
            <div class="metric">
              <div class="metric-value">${data.metrics.errorRate}%</div>
              <div class="metric-label">Error Rate</div>
            </div>
            <div class="metric">
              <div class="metric-value">${Math.floor(data.metrics.uptime / 1000)}s</div>
              <div class="metric-label">Uptime</div>
            </div>
            <div class="metric">
              <div class="metric-value">${data.metrics.memoryUsage}%</div>
              <div class="metric-label">Memory Usage</div>
            </div>
          </div>
          
          <h2>Recent Requests</h2>
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Response Time</th>
              </tr>
            </thead>
            <tbody>
              ${data.recentRequests.map((req: any) => `
                <tr>
                  <td>${req.method}</td>
                  <td>${req.path}</td>
                  <td class="status-${Math.floor(req.status / 100) * 100}">${req.status}</td>
                  <td>${req.time}ms</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h2>Popular Endpoints</h2>
          <table>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Request Count</th>
              </tr>
            </thead>
            <tbody>
              ${data.popularEndpoints.map((endpoint: any) => `
                <tr>
                  <td>${endpoint.path}</td>
                  <td>${endpoint.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <p><small>Dashboard auto-refreshes every 30 seconds</small></p>
        </body>
        </html>
      `;
    };
    
    app.get('/dashboard', (req: any, res: any) => {
      res.html(generateDashboardHTML(dashboardData));
    });
    
    app.get('/dashboard/api', (req: any, res: any) => {
      res.json(dashboardData);
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  test('should generate HTML dashboard', async () => {
    const response = await testServer.request({ method: 'GET', url: '/dashboard' });
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('System Monitoring Dashboard');
    expect(response.body).toContain('Total Requests');
    expect(response.body).toContain('1234'); // Total requests value
    expect(response.body).toContain('Recent Requests');
    expect(response.body).toContain('Popular Endpoints');
  });

  test('should provide dashboard data API', async () => {
    const response = await testServer.request({ method: 'GET', url: '/dashboard/api' });
    
    expect(response.status).toBe(200);
    expect(response.body.metrics).toBeDefined();
    expect(response.body.recentRequests).toBeDefined();
    expect(response.body.popularEndpoints).toBeDefined();
    
    expect(response.body.metrics.totalRequests).toBe(1234);
    expect(response.body.recentRequests).toHaveLength(4);
    expect(response.body.popularEndpoints).toHaveLength(3);
  });

  test('should include auto-refresh functionality', async () => {
    const response = await testServer.request({ method: 'GET', url: '/dashboard' });
    
    expect(response.body).toContain('setInterval(refreshDashboard, 30000)');
    expect(response.body).toContain('Dashboard auto-refreshes every 30 seconds');
  });

  test('should style status codes appropriately', async () => {
    const response = await testServer.request({ method: 'GET', url: '/dashboard' });
    
    expect(response.body).toContain('status-200');
    expect(response.body).toContain('status-400');
    expect(response.body).toContain('.status-200 { color: green; }');
    expect(response.body).toContain('.status-400 { color: orange; }');
    expect(response.body).toContain('.status-500 { color: red; }');
  });
});