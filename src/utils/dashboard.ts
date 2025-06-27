import { Monitor } from './monitor';

export class Dashboard {
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  static generateHTML(): string {
    const monitor = Monitor.getInstance();
    const metrics = monitor.export();
    const { system, requests, summary } = metrics;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Framework Dashboard</title>
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
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card-title { font-size: 1.2rem; font-weight: 600; margin-bottom: 15px; color: #374151; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .metric-label { color: #6b7280; }
        .metric-value { font-weight: 600; color: #111827; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .table th { background: #f9fafb; font-weight: 600; color: #374151; }
        .status-ok { color: #16a34a; }
        .status-warning { color: #ea580c; }
        .status-error { color: #dc2626; }
        .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: #2563eb; transition: width 0.3s ease; }
        .refresh-btn { 
            background: #2563eb; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 0.9rem;
            margin-top: 10px;
        }
        .refresh-btn:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Framework Dashboard</h1>
            <p class="subtitle">Real-time monitoring and analytics</p>
        </div>

        <div class="grid">
            <div class="card">
                <h2 class="card-title">System Overview</h2>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">${this.formatDuration(system.uptime)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Requests</span>
                    <span class="metric-value">${summary.totalRequests.toLocaleString()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Error Rate</span>
                    <span class="metric-value ${summary.errorRate > 5 ? 'status-error' : summary.errorRate > 1 ? 'status-warning' : 'status-ok'}">${summary.errorRate.toFixed(2)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Response Time</span>
                    <span class="metric-value">${system.averageResponseTime.toFixed(2)}ms</span>
                </div>
            </div>

            <div class="card">
                <h2 class="card-title">Memory Usage</h2>
                <div class="metric">
                    <span class="metric-label">RSS</span>
                    <span class="metric-value">${this.formatBytes(system.memoryUsage.rss)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Heap Used</span>
                    <span class="metric-value">${this.formatBytes(system.memoryUsage.heapUsed)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Heap Total</span>
                    <span class="metric-value">${this.formatBytes(system.memoryUsage.heapTotal)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">External</span>
                    <span class="metric-value">${this.formatBytes(system.memoryUsage.external)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(system.memoryUsage.heapUsed / system.memoryUsage.heapTotal) * 100}%"></div>
                </div>
            </div>

            <div class="card">
                <h2 class="card-title">CPU Usage</h2>
                <div class="metric">
                    <span class="metric-label">User</span>
                    <span class="metric-value">${(system.cpuUsage.user / 1000).toFixed(2)}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">System</span>
                    <span class="metric-value">${(system.cpuUsage.system / 1000).toFixed(2)}ms</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h2 class="card-title">Request Metrics</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Method</th>
                        <th>Count</th>
                        <th>Avg Time</th>
                        <th>Min Time</th>
                        <th>Max Time</th>
                        <th>Last Accessed</th>
                    </tr>
                </thead>
                <tbody>
                    ${requests.map(req => `
                        <tr>
                            <td>${req.path}</td>
                            <td><span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${req.method}</span></td>
                            <td>${req.count.toLocaleString()}</td>
                            <td>${req.averageTime.toFixed(2)}ms</td>
                            <td>${req.minTime.toFixed(2)}ms</td>
                            <td>${req.maxTime.toFixed(2)}ms</td>
                            <td>${req.lastAccessed.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <button class="refresh-btn" onclick="window.location.reload()">Refresh Data</button>
        </div>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>`;
  }

  static generateJSON() {
    const monitor = Monitor.getInstance();
    return monitor.export();
  }

  static generateText(): string {
    const monitor = Monitor.getInstance();
    const metrics = monitor.export();
    const { system, requests, summary } = metrics;

    let output = '\n=== FRAMEWORK DASHBOARD ===\n\n';
    
    output += 'SYSTEM OVERVIEW:\n';
    output += `  Uptime: ${this.formatDuration(system.uptime)}\n`;
    output += `  Total Requests: ${summary.totalRequests.toLocaleString()}\n`;
    output += `  Error Rate: ${summary.errorRate.toFixed(2)}%\n`;
    output += `  Avg Response Time: ${system.averageResponseTime.toFixed(2)}ms\n\n`;
    
    output += 'MEMORY USAGE:\n';
    output += `  RSS: ${this.formatBytes(system.memoryUsage.rss)}\n`;
    output += `  Heap Used: ${this.formatBytes(system.memoryUsage.heapUsed)}\n`;
    output += `  Heap Total: ${this.formatBytes(system.memoryUsage.heapTotal)}\n`;
    output += `  External: ${this.formatBytes(system.memoryUsage.external)}\n\n`;
    
    output += 'TOP ENDPOINTS:\n';
    requests.slice(0, 10).forEach((req, i) => {
      output += `  ${i + 1}. ${req.method} ${req.path} - ${req.count} requests (${req.averageTime.toFixed(2)}ms avg)\n`;
    });
    
    return output;
  }
}