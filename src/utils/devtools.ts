import type { FrameworkRequest, FrameworkResponse } from '../types';
import { Router } from '../router';

export interface RouteInfo {
  method: string;
  path: string;
  handler: string;
  middleware: string[];
}

export interface FrameworkInfo {
  name: string;
  version: string;
  nodeVersion: string;
  platform: string;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  routes: RouteInfo[];
  features: string[];
}

export class DevTools {
  private static instance: DevTools;
  private router?: Router;
  private requestLogs: Array<{
    timestamp: Date;
    method: string;
    path: string;
    headers: Record<string, string>;
    query: Record<string, any>;
    body: any;
    ip: string;
    userAgent: string;
  }> = [];

  private constructor() {}

  static getInstance(): DevTools {
    if (!DevTools.instance) {
      DevTools.instance = new DevTools();
    }
    return DevTools.instance;
  }

  setRouter(router: Router): void {
    this.router = router;
  }

  logRequest(req: FrameworkRequest): void {
    this.requestLogs.push({
      timestamp: new Date(),
      method: req.method,
      path: req.path,
      headers: req.headers,
      query: req.query,
      body: req.body,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    // Keep only last 100 requests
    if (this.requestLogs.length > 100) {
      this.requestLogs.shift();
    }
  }

  getRoutes(): RouteInfo[] {
    if (!this.router) {
      return [];
    }

    const routes: RouteInfo[] = [];
    const routerRoutes = (this.router as any).routes || [];

    for (const route of routerRoutes) {
      routes.push({
        method: route.method,
        path: route.path,
        handler: route.handler?.name || 'anonymous',
        middleware: route.middleware?.map((m: any) => m.name || 'anonymous') || []
      });
    }

    return routes;
  }

  getFrameworkInfo(): FrameworkInfo {
    return {
      name: 'TypeScript Web Framework',
      version: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      routes: this.getRoutes(),
      features: [
        'Type-safe routing',
        'Middleware system',
        'Authentication (JWT, Sessions)',
        'Template engines',
        'Security middleware',
        'Request validation',
        'Static file serving',
        'Monitoring & Analytics',
        'Developer tools'
      ]
    };
  }

  getRequestLogs() {
    return this.requestLogs;
  }

  generateRouteListHTML(): string {
    const routes = this.getRoutes();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Routes - Framework DevTools</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .title { font-size: 2rem; font-weight: 700; color: #2563eb; margin-bottom: 10px; }
        .subtitle { color: #6b7280; font-size: 1.1rem; }
        .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .route { 
            display: flex; 
            align-items: center; 
            padding: 15px; 
            border: 1px solid #e5e7eb; 
            border-radius: 6px; 
            margin-bottom: 10px;
            background: #f9fafb;
        }
        .method { 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 0.8rem; 
            font-weight: 600; 
            margin-right: 15px;
            min-width: 60px;
            text-align: center;
        }
        .method-get { background: #dcfce7; color: #166534; }
        .method-post { background: #fef3c7; color: #92400e; }
        .method-put { background: #e0e7ff; color: #3730a3; }
        .method-delete { background: #fecaca; color: #991b1b; }
        .method-patch { background: #f3e8ff; color: #6b21a8; }
        .path { font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9rem; font-weight: 600; flex: 1; }
        .handler { color: #6b7280; font-size: 0.8rem; margin-left: 15px; }
        .back-link { 
            display: inline-block; 
            background: #6b7280; 
            color: white; 
            padding: 8px 16px; 
            border-radius: 4px; 
            text-decoration: none; 
            font-size: 0.9rem;
        }
        .back-link:hover { background: #4b5563; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">API Routes</h1>
            <p class="subtitle">All registered routes in your application</p>
            <a href="/dev/dashboard" class="back-link">← Back to Dashboard</a>
        </div>

        <div class="card">
            <h2>Registered Routes (${routes.length})</h2>
            ${routes.map(route => `
                <div class="route">
                    <span class="method method-${route.method.toLowerCase()}">${route.method}</span>
                    <span class="path">${route.path}</span>
                    <span class="handler">${route.handler}</span>
                </div>
            `).join('')}
            ${routes.length === 0 ? '<p style="color: #6b7280; text-align: center; padding: 20px;">No routes registered yet.</p>' : ''}
        </div>
    </div>
</body>
</html>`;
  }

  generateFrameworkInfoHTML(): string {
    const info = this.getFrameworkInfo();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Framework Info - DevTools</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .title { font-size: 2rem; font-weight: 700; color: #2563eb; margin-bottom: 10px; }
        .subtitle { color: #6b7280; font-size: 1.1rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card-title { font-size: 1.2rem; font-weight: 600; margin-bottom: 15px; color: #374151; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .metric-label { color: #6b7280; }
        .metric-value { font-weight: 600; color: #111827; }
        .feature-list { list-style: none; }
        .feature-list li { 
            padding: 8px 0; 
            border-bottom: 1px solid #f3f4f6;
            position: relative;
            padding-left: 20px;
        }
        .feature-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #16a34a;
            font-weight: bold;
        }
        .back-link { 
            display: inline-block; 
            background: #6b7280; 
            color: white; 
            padding: 8px 16px; 
            border-radius: 4px; 
            text-decoration: none; 
            font-size: 0.9rem;
        }
        .back-link:hover { background: #4b5563; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Framework Information</h1>
            <p class="subtitle">System status and configuration details</p>
            <a href="/dev/dashboard" class="back-link">← Back to Dashboard</a>
        </div>

        <div class="grid">
            <div class="card">
                <h2 class="card-title">Framework Details</h2>
                <div class="metric">
                    <span class="metric-label">Name</span>
                    <span class="metric-value">${info.name}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Version</span>
                    <span class="metric-value">${info.version}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Node.js Version</span>
                    <span class="metric-value">${info.nodeVersion}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Platform</span>
                    <span class="metric-value">${info.platform}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">${Math.floor(info.uptime / 60)}m ${Math.floor(info.uptime % 60)}s</span>
                </div>
            </div>

            <div class="card">
                <h2 class="card-title">Memory Usage</h2>
                <div class="metric">
                    <span class="metric-label">RSS</span>
                    <span class="metric-value">${Math.round(info.memoryUsage.rss / 1024 / 1024)} MB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Heap Used</span>
                    <span class="metric-value">${Math.round(info.memoryUsage.heapUsed / 1024 / 1024)} MB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Heap Total</span>
                    <span class="metric-value">${Math.round(info.memoryUsage.heapTotal / 1024 / 1024)} MB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">External</span>
                    <span class="metric-value">${Math.round(info.memoryUsage.external / 1024 / 1024)} MB</span>
                </div>
            </div>

            <div class="card">
                <h2 class="card-title">Features</h2>
                <ul class="feature-list">
                    ${info.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>

            <div class="card">
                <h2 class="card-title">Routes Summary</h2>
                <div class="metric">
                    <span class="metric-label">Total Routes</span>
                    <span class="metric-value">${info.routes.length}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">GET Routes</span>
                    <span class="metric-value">${info.routes.filter(r => r.method === 'GET').length}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">POST Routes</span>
                    <span class="metric-value">${info.routes.filter(r => r.method === 'POST').length}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Other Routes</span>
                    <span class="metric-value">${info.routes.filter(r => !['GET', 'POST'].includes(r.method)).length}</span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  generateRequestInspectorHTML(): string {
    const logs = this.getRequestLogs();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Request Inspector - DevTools</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .title { font-size: 2rem; font-weight: 700; color: #2563eb; margin-bottom: 10px; }
        .subtitle { color: #6b7280; font-size: 1.1rem; }
        .request-log { 
            background: #fff; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
            margin-bottom: 15px;
            overflow: hidden;
        }
        .request-header { 
            background: #f9fafb; 
            padding: 15px; 
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .request-method { 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 0.8rem; 
            font-weight: 600; 
            margin-right: 10px;
            min-width: 60px;
            text-align: center;
        }
        .method-get { background: #dcfce7; color: #166534; }
        .method-post { background: #fef3c7; color: #92400e; }
        .method-put { background: #e0e7ff; color: #3730a3; }
        .method-delete { background: #fecaca; color: #991b1b; }
        .request-path { font-family: 'Monaco', 'Menlo', monospace; font-weight: 600; flex: 1; }
        .request-time { color: #6b7280; font-size: 0.9rem; }
        .request-details { padding: 15px; }
        .detail-section { margin-bottom: 15px; }
        .detail-title { font-weight: 600; margin-bottom: 8px; color: #374151; }
        .detail-content { 
            background: #f8fafc; 
            padding: 10px; 
            border-radius: 4px; 
            font-family: 'Monaco', 'Menlo', monospace; 
            font-size: 0.8rem;
            overflow-x: auto;
        }
        .back-link { 
            display: inline-block; 
            background: #6b7280; 
            color: white; 
            padding: 8px 16px; 
            border-radius: 4px; 
            text-decoration: none; 
            font-size: 0.9rem;
        }
        .back-link:hover { background: #4b5563; }
        .clear-btn {
            background: #dc2626;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            margin-left: 10px;
        }
        .clear-btn:hover { background: #b91c1c; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Request Inspector</h1>
            <p class="subtitle">Debug incoming requests (last 100 requests)</p>
            <div>
                <a href="/dev/dashboard" class="back-link">← Back to Dashboard</a>
                <button class="clear-btn" onclick="clearLogs()">Clear Logs</button>
            </div>
        </div>

        ${logs.length === 0 ? '<div style="background: #fff; padding: 40px; text-align: center; border-radius: 8px; color: #6b7280;">No requests logged yet. Make some requests to see them here.</div>' : ''}
        
        ${logs.reverse().map(log => `
            <div class="request-log">
                <div class="request-header">
                    <div style="display: flex; align-items: center;">
                        <span class="request-method method-${log.method.toLowerCase()}">${log.method}</span>
                        <span class="request-path">${log.path}</span>
                    </div>
                    <span class="request-time">${log.timestamp.toLocaleString()}</span>
                </div>
                <div class="request-details">
                    <div class="detail-section">
                        <div class="detail-title">Client Info</div>
                        <div class="detail-content">
IP: ${log.ip}
User-Agent: ${log.userAgent}
                        </div>
                    </div>
                    ${Object.keys(log.query).length > 0 ? `
                    <div class="detail-section">
                        <div class="detail-title">Query Parameters</div>
                        <div class="detail-content">${JSON.stringify(log.query, null, 2)}</div>
                    </div>
                    ` : ''}
                    ${log.body ? `
                    <div class="detail-section">
                        <div class="detail-title">Request Body</div>
                        <div class="detail-content">${JSON.stringify(log.body, null, 2)}</div>
                    </div>
                    ` : ''}
                    <div class="detail-section">
                        <div class="detail-title">Headers</div>
                        <div class="detail-content">${JSON.stringify(log.headers, null, 2)}</div>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>

    <script>
        function clearLogs() {
            if (confirm('Are you sure you want to clear all request logs?')) {
                fetch('/dev/inspector/clear', { method: 'POST' })
                    .then(() => window.location.reload());
            }
        }
        
        // Auto-refresh every 10 seconds
        setTimeout(() => {
            window.location.reload();
        }, 10000);
    </script>
</body>
</html>`;
  }

  generateApiTesterHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Tester - DevTools</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .title { font-size: 2rem; font-weight: 700; color: #2563eb; margin-bottom: 10px; }
        .subtitle { color: #6b7280; font-size: 1.1rem; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card-title { font-size: 1.2rem; font-weight: 600; margin-bottom: 15px; color: #374151; }
        .form-group { margin-bottom: 15px; }
        .form-label { display: block; margin-bottom: 5px; font-weight: 600; color: #374151; }
        .form-input, .form-select, .form-textarea { 
            width: 100%; 
            padding: 8px 12px; 
            border: 1px solid #d1d5db; 
            border-radius: 4px; 
            font-size: 0.9rem;
        }
        .form-textarea { min-height: 100px; font-family: 'Monaco', 'Menlo', monospace; }
        .btn { 
            background: #2563eb; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 0.9rem;
        }
        .btn:hover { background: #1d4ed8; }
        .btn-secondary { background: #6b7280; }
        .btn-secondary:hover { background: #4b5563; }
        .response-section { margin-top: 20px; }
        .response-content { 
            background: #f8fafc; 
            border: 1px solid #e5e7eb; 
            border-radius: 4px; 
            padding: 15px; 
            font-family: 'Monaco', 'Menlo', monospace; 
            font-size: 0.8rem;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
        }
        .status-success { color: #16a34a; }
        .status-error { color: #dc2626; }
        .back-link { 
            display: inline-block; 
            background: #6b7280; 
            color: white; 
            padding: 8px 16px; 
            border-radius: 4px; 
            text-decoration: none; 
            font-size: 0.9rem;
            margin-bottom: 20px;
        }
        .back-link:hover { background: #4b5563; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">API Tester</h1>
            <p class="subtitle">Test your API endpoints directly from the browser</p>
            <a href="/dev/dashboard" class="back-link">← Back to Dashboard</a>
        </div>

        <div class="grid">
            <div class="card">
                <h2 class="card-title">Request Builder</h2>
                <form id="apiForm">
                    <div class="form-group">
                        <label class="form-label">Method</label>
                        <select class="form-select" id="method">
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">URL</label>
                        <input type="text" class="form-input" id="url" placeholder="http://localhost:3000/api/example" value="http://localhost:3000/">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Headers (JSON)</label>
                        <textarea class="form-textarea" id="headers" placeholder='{"Content-Type": "application/json"}'>{
  "Content-Type": "application/json"
}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Request Body (JSON)</label>
                        <textarea class="form-textarea" id="body" placeholder='{"key": "value"}'></textarea>
                    </div>
                    
                    <button type="submit" class="btn">Send Request</button>
                    <button type="button" class="btn btn-secondary" onclick="clearForm()">Clear</button>
                </form>
            </div>

            <div class="card">
                <h2 class="card-title">Response</h2>
                <div id="responseStatus"></div>
                <div class="response-section">
                    <div class="response-content" id="responseContent">Make a request to see the response here...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('apiForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const method = document.getElementById('method').value;
            const url = document.getElementById('url').value;
            const headersText = document.getElementById('headers').value;
            const bodyText = document.getElementById('body').value;
            
            let headers = {};
            try {
                if (headersText.trim()) {
                    headers = JSON.parse(headersText);
                }
            } catch (e) {
                document.getElementById('responseContent').textContent = 'Error: Invalid JSON in headers';
                return;
            }
            
            let body = null;
            try {
                if (bodyText.trim() && ['POST', 'PUT', 'PATCH'].includes(method)) {
                    body = JSON.stringify(JSON.parse(bodyText));
                }
            } catch (e) {
                document.getElementById('responseContent').textContent = 'Error: Invalid JSON in request body';
                return;
            }
            
            const statusEl = document.getElementById('responseStatus');
            const contentEl = document.getElementById('responseContent');
            
            statusEl.innerHTML = 'Sending request...';
            contentEl.textContent = 'Loading...';
            
            try {
                const startTime = Date.now();
                const response = await fetch(url, {
                    method,
                    headers,
                    body
                });
                const endTime = Date.now();
                
                const responseText = await response.text();
                let responseData;
                
                try {
                    responseData = JSON.parse(responseText);
                } catch (e) {
                    responseData = responseText;
                }
                
                const statusClass = response.ok ? 'status-success' : 'status-error';
                statusEl.innerHTML = \`<span class="\${statusClass}">Status: \${response.status} \${response.statusText}</span> | Time: \${endTime - startTime}ms\`;
                
                contentEl.textContent = typeof responseData === 'object' 
                    ? JSON.stringify(responseData, null, 2)
                    : responseData;
                    
            } catch (error) {
                statusEl.innerHTML = '<span class="status-error">Error: Request failed</span>';
                contentEl.textContent = error.message;
            }
        });
        
        function clearForm() {
            document.getElementById('url').value = 'http://localhost:3000/';
            document.getElementById('headers').value = '{\\n  "Content-Type": "application/json"\\n}';
            document.getElementById('body').value = '';
            document.getElementById('responseStatus').innerHTML = '';
            document.getElementById('responseContent').textContent = 'Make a request to see the response here...';
        }
    </script>
</body>
</html>`;
  }

  clearRequestLogs(): void {
    this.requestLogs = [];
  }
}

export function createRequestInspectorMiddleware() {
  const devTools = DevTools.getInstance();
  
  return async (req: FrameworkRequest, res: FrameworkResponse, next: () => Promise<void>) => {
    devTools.logRequest(req);
    await next();
  };
}