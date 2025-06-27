import { Monitor } from './monitor';
import { DevTools } from './devtools';
import { Dashboard } from './dashboard';
import { AssetVersioning } from './assets';
import { ConfigManager } from './config';
import { globalCache } from './cache';

export class AdminPanel {
  private static instance: AdminPanel;
  private isEnabled: boolean = false;

  private constructor() {}

  static getInstance(): AdminPanel {
    if (!AdminPanel.instance) {
      AdminPanel.instance = new AdminPanel();
    }
    return AdminPanel.instance;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  isAdminEnabled(): boolean {
    return this.isEnabled;
  }

  generateMainPage(): string {
    if (!this.isEnabled) {
      return this.generateAccessDenied();
    }

    const config = ConfigManager.getInstance();
    const monitor = Monitor.getInstance();
    const devTools = DevTools.getInstance();
    const assetVersioning = AssetVersioning.getInstance();
    
    const systemMetrics = monitor.getSystemMetrics();
    const efwInfo = devTools.getEfwInfo();
    const assetStats = assetVersioning.getAssetStats();
    const cacheStats = globalCache.stats();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - EFW</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f0f2f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .title { font-size: 2rem; font-weight: 700; }
        .subtitle { font-size: 1rem; opacity: 0.9; margin-top: 5px; }
        .nav { display: flex; gap: 20px; margin: 30px 0; }
        .nav-item { 
            background: white; 
            padding: 15px 25px; 
            border-radius: 8px; 
            text-decoration: none; 
            color: #333;
            font-weight: 600;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        }
        .nav-item:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { 
            background: white; 
            padding: 25px; 
            border-radius: 12px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }
        .card-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 20px; color: #2c3e50; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px 0; }
        .metric-label { color: #6c757d; font-weight: 500; }
        .metric-value { font-weight: 700; color: #2c3e50; }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
        .status-success { background: #d4edda; color: #155724; }
        .status-warning { background: #fff3cd; color: #856404; }
        .status-error { background: #f8d7da; color: #721c24; }
        .action-btn { 
            background: #667eea; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-weight: 600;
            margin: 5px;
            transition: background 0.2s ease;
        }
        .action-btn:hover { background: #5a67d8; }
        .action-btn.danger { background: #e53e3e; }
        .action-btn.danger:hover { background: #c53030; }
        .logs-container { 
            background: #1a1a1a; 
            color: #00ff00; 
            padding: 20px; 
            border-radius: 8px; 
            font-family: 'Monaco', 'Menlo', monospace; 
            font-size: 0.9rem;
            max-height: 300px;
            overflow-y: auto;
            margin-top: 15px;
        }
        .breadcrumb { 
            padding: 15px 0; 
            color: #6c757d; 
            font-size: 0.9rem;
        }
        .breadcrumb a { color: #667eea; text-decoration: none; }
        .footer {
            background: white;
            padding: 30px 0;
            margin-top: 50px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <div class="header-content">
                <div>
                    <h1 class="title">EFW Admin Panel</h1>
                    <p class="subtitle">System Management & Monitoring</p>
                </div>
                <div>
                    <span class="status status-success">System Online</span>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="breadcrumb">
            <a href="/">Home</a> / Admin Panel
        </div>

        <div class="nav">
            <a href="/admin/dashboard" class="nav-item">📊 Dashboard</a>
            <a href="/admin/routes" class="nav-item">🛣️ Routes</a>
            <a href="/admin/logs" class="nav-item">📝 Logs</a>
            <a href="/admin/cache" class="nav-item">💾 Cache</a>
            <a href="/admin/config" class="nav-item">⚙️ Config</a>
            <a href="/admin/assets" class="nav-item">🎨 Assets</a>
        </div>

        <div class="grid">
            <div class="card">
                <h2 class="card-title">System Overview</h2>
                <div class="metric">
                    <span class="metric-label">EFW Version</span>
                    <span class="metric-value">${efwInfo.version}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Node.js Version</span>
                    <span class="metric-value">${efwInfo.nodeVersion}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Environment</span>
                    <span class="metric-value">${config.get('env')}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">${this.formatDuration(systemMetrics.uptime)}</span>
                </div>
            </div>

            <div class="card">
                <h2 class="card-title">Performance Metrics</h2>
                <div class="metric">
                    <span class="metric-label">Total Requests</span>
                    <span class="metric-value">${systemMetrics.requestCount.toLocaleString()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Error Rate</span>
                    <span class="metric-value">${((systemMetrics.errorCount / Math.max(systemMetrics.requestCount, 1)) * 100).toFixed(2)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Response Time</span>
                    <span class="metric-value">${systemMetrics.averageResponseTime.toFixed(2)}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Memory Usage</span>
                    <span class="metric-value">${this.formatBytes(systemMetrics.memoryUsage.heapUsed)}</span>
                </div>
            </div>

            <div class="card">
                <h2 class="card-title">Cache Statistics</h2>
                <div class="metric">
                    <span class="metric-label">Cache Size</span>
                    <span class="metric-value">${cacheStats.size} items</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Max Size</span>
                    <span class="metric-value">${cacheStats.maxSize} items</span>
                </div>
                <div class="metric">
                    <span class="metric-label">TTL</span>
                    <span class="metric-value">${cacheStats.ttl / 1000}s</span>
                </div>
                <button class="action-btn danger" onclick="clearCache()">Clear Cache</button>
            </div>

            <div class="card">
                <h2 class="card-title">Asset Management</h2>
                <div class="metric">
                    <span class="metric-label">Total Assets</span>
                    <span class="metric-value">${assetStats.totalAssets}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Size</span>
                    <span class="metric-value">${this.formatBytes(assetStats.totalSize)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Average Size</span>
                    <span class="metric-value">${this.formatBytes(assetStats.averageSize)}</span>
                </div>
                <button class="action-btn" onclick="refreshAssets()">Refresh Assets</button>
            </div>

            <div class="card">
                <h2 class="card-title">Routes Summary</h2>
                <div class="metric">
                    <span class="metric-label">Total Routes</span>
                    <span class="metric-value">${efwInfo.routes.length}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">GET Routes</span>
                    <span class="metric-value">${efwInfo.routes.filter(r => r.method === 'GET').length}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">POST Routes</span>
                    <span class="metric-value">${efwInfo.routes.filter(r => r.method === 'POST').length}</span>
                </div>
                <a href="/admin/routes" class="action-btn">View All Routes</a>
            </div>

            <div class="card">
                <h2 class="card-title">Quick Actions</h2>
                <button class="action-btn" onclick="window.location.reload()">Refresh Panel</button>
                <button class="action-btn" onclick="downloadLogs()">Download Logs</button>
                <button class="action-btn" onclick="exportConfig()">Export Config</button>
                <button class="action-btn danger" onclick="restartServer()">Restart Server</button>
            </div>
        </div>

        <div class="card">
            <h2 class="card-title">System Features</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                ${efwInfo.features.map(feature => `
                    <div style="padding: 10px; background: #f8f9fa; border-radius: 6px; text-align: center;">
                        <span style="font-weight: 600;">✓ ${feature}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

    <div class="footer">
        <div class="container">
            <p>&copy; 2024 EFW (Efficient Framework for Web). Built with ❤️</p>
            <p style="margin-top: 10px; font-size: 0.9rem;">
                Server Time: ${new Date().toLocaleString()} | 
                Environment: ${config.get('env')} |
                Version: ${efwInfo.version}
            </p>
        </div>
    </div>

    <script>
        function clearCache() {
            if (confirm('Are you sure you want to clear the cache?')) {
                fetch('/admin/api/cache/clear', { method: 'POST' })
                    .then(() => window.location.reload());
            }
        }

        function refreshAssets() {
            fetch('/admin/api/assets/refresh', { method: 'POST' })
                .then(() => window.location.reload());
        }

        function downloadLogs() {
            window.open('/admin/api/logs/download', '_blank');
        }

        function exportConfig() {
            window.open('/admin/api/config/export', '_blank');
        }

        function restartServer() {
            if (confirm('Are you sure you want to restart the server? This will disconnect all users.')) {
                fetch('/admin/api/server/restart', { method: 'POST' })
                    .then(() => alert('Server restart initiated'));
            }
        }

        // Auto-refresh every 30 seconds
        setTimeout(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>`;
  }

  private generateAccessDenied(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Denied - Admin Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { 
            text-align: center; 
            max-width: 500px; 
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .icon { font-size: 4rem; margin-bottom: 20px; color: #dc3545; }
        .title { font-size: 2rem; font-weight: 700; margin-bottom: 15px; color: #2c3e50; }
        .message { color: #6c757d; margin-bottom: 30px; font-size: 1.1rem; }
        .btn { 
            background: #007bff; 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 6px; 
            text-decoration: none; 
            font-weight: 600;
            display: inline-block;
            transition: background 0.2s ease;
        }
        .btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔒</div>
        <h1 class="title">Access Denied</h1>
        <p class="message">The admin panel is currently disabled or you don't have permission to access it.</p>
        <a href="/" class="btn">Go Home</a>
    </div>
</body>
</html>`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  generateConfigPage(): string {
    if (!this.isEnabled) {
      return this.generateAccessDenied();
    }

    const config = ConfigManager.getInstance();
    const configData = config.getAll();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuration - Admin Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f0f2f5;
        }
        .header { background: #667eea; color: white; padding: 20px 0; }
        .container { max-width: 1000px; margin: 0 auto; padding: 0 20px; }
        .title { font-size: 1.8rem; font-weight: 700; }
        .breadcrumb { padding: 15px 0; color: #6c757d; }
        .breadcrumb a { color: #667eea; text-decoration: none; }
        .card { 
            background: white; 
            padding: 25px; 
            border-radius: 12px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 20px 0;
        }
        .config-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 15px 0; 
            border-bottom: 1px solid #f1f1f1;
        }
        .config-key { font-weight: 600; color: #2c3e50; }
        .config-value { 
            font-family: 'Monaco', 'Menlo', monospace; 
            background: #f8f9fa; 
            padding: 5px 10px; 
            border-radius: 4px;
            font-size: 0.9rem;
        }
        .btn { 
            background: #667eea; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 6px; 
            cursor: pointer; 
            margin: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1 class="title">Configuration Management</h1>
        </div>
    </div>

    <div class="container">
        <div class="breadcrumb">
            <a href="/admin">Admin Panel</a> / Configuration
        </div>

        <div class="card">
            <h2>Current Configuration</h2>
            ${Object.entries(configData).map(([key, value]) => `
                <div class="config-item">
                    <span class="config-key">${key}</span>
                    <span class="config-value">${JSON.stringify(value)}</span>
                </div>
            `).join('')}
            
            <div style="margin-top: 20px;">
                <button class="btn" onclick="reloadConfig()">Reload Config</button>
                <button class="btn" onclick="exportConfig()">Export Config</button>
            </div>
        </div>
    </div>

    <script>
        function reloadConfig() {
            fetch('/admin/api/config/reload', { method: 'POST' })
                .then(() => window.location.reload());
        }

        function exportConfig() {
            window.open('/admin/api/config/export', '_blank');
        }
    </script>
</body>
</html>`;
  }

  generateLoginPage(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-form { 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
        }
        .title { font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 30px; color: #2c3e50; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 5px; font-weight: 600; }
        .form-input { 
            width: 100%; 
            padding: 12px; 
            border: 1px solid #ddd; 
            border-radius: 6px; 
            font-size: 1rem;
        }
        .btn { 
            width: 100%; 
            background: #667eea; 
            color: white; 
            border: none; 
            padding: 12px; 
            border-radius: 6px; 
            font-size: 1rem; 
            font-weight: 600; 
            cursor: pointer;
        }
        .btn:hover { background: #5a67d8; }
        .error { color: #e53e3e; margin-top: 10px; text-align: center; }
    </style>
</head>
<body>
    <form class="login-form" onsubmit="handleLogin(event)">
        <h1 class="title">Admin Login</h1>
        
        <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-input" id="username" required>
        </div>
        
        <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="password" required>
        </div>
        
        <button type="submit" class="btn">Login</button>
        <div id="error" class="error" style="display: none;"></div>
    </form>

    <script>
        function handleLogin(event) {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            fetch('/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(response => {
                if (response.ok) {
                    window.location.href = '/admin';
                } else {
                    document.getElementById('error').textContent = 'Invalid credentials';
                    document.getElementById('error').style.display = 'block';
                }
            });
        }
    </script>
</body>
</html>`;
  }
}