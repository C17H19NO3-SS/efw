import { Efw } from '../src/framework';
import { 
  createMonitoringMiddleware, 
  createRequestInspectorMiddleware,
  Dashboard,
  DevTools,
  AdminPanel,
  ErrorPages,
  ConfigManager,
  ResponseBuilder,
  globalCache
} from '../src/utils';

// Initialize configuration
const config = ConfigManager.getInstance();

// Create EFW instance
const app = new Efw({
  staticPath: './public'
});

// Initialize utilities
const devTools = DevTools.getInstance();
const adminPanel = AdminPanel.getInstance();

// Enable admin panel in development
if (config.isDevelopment()) {
  adminPanel.enable();
}

// Set up router reference for dev tools
devTools.setRouter((app as any).router);

// Add monitoring middleware
app.use(createMonitoringMiddleware());

// Add request inspector middleware (development only)
if (config.isDevelopment()) {
  app.use(createRequestInspectorMiddleware());
}

// API Routes with standardized responses
app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ];
  
  res.json(ResponseBuilder.success(users));
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json(ResponseBuilder.badRequest('Invalid user ID'));
  }
  
  // Simulate user lookup
  if (userId === 1) {
    const user = { id: 1, name: 'John Doe', email: 'john@example.com' };
    res.json(ResponseBuilder.success(user));
  } else {
    res.status(404).json(ResponseBuilder.notFound('User'));
  }
});

// Cache example
app.get('/api/cache-example', async (req, res) => {
  const cacheKey = 'expensive-operation';
  
  // Try to get from cache first
  let result = globalCache.get(cacheKey);
  
  if (!result) {
    // Simulate expensive operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    result = { data: 'This was cached!', timestamp: new Date().toISOString() };
    
    // Cache for 5 minutes
    globalCache.set(cacheKey, result, 300000);
  }
  
  res.json(ResponseBuilder.success(result, { fromCache: !!result }));
});

// Developer Tools Routes
app.get('/dev/dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(Dashboard.generateHTML());
});

app.get('/dev/routes', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(devTools.generateRouteListHTML());
});

app.get('/dev/info', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(devTools.generateEfwInfoHTML());
});

app.get('/dev/inspector', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(devTools.generateRequestInspectorHTML());
});

app.post('/dev/inspector/clear', (req, res) => {
  devTools.clearRequestLogs();
  res.json(ResponseBuilder.success(null, { message: 'Logs cleared' }));
});

app.get('/dev/tester', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(devTools.generateApiTesterHTML());
});

// Admin Panel Routes
app.get('/admin', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(adminPanel.generateMainPage());
});

app.get('/admin/config', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(adminPanel.generateConfigPage());
});

// Admin API Routes
app.post('/admin/api/cache/clear', (req, res) => {
  globalCache.clear();
  res.json(ResponseBuilder.success(null, { message: 'Cache cleared successfully' }));
});

app.get('/admin/api/config/export', (req, res) => {
  const configData = config.getAll();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="config.json"');
  res.json(configData);
});

app.post('/admin/api/config/reload', (req, res) => {
  config.reload();
  res.json(ResponseBuilder.success(null, { message: 'Configuration reloaded' }));
});

// Error handling with custom error pages
app.use((req, res, next) => {
  res.status(404);
  res.setHeader('Content-Type', 'text/html');
  res.send(ErrorPages.notFound({
    brandName: 'My EFW App',
    homeUrl: '/',
    theme: 'light'
  }));
});

// Global error handler
app.use((error: Error, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  
  res.status(500);
  res.setHeader('Content-Type', 'text/html');
  res.send(ErrorPages.internalServerError({
    brandName: 'My EFW App',
    homeUrl: '/',
    showDetails: config.isDevelopment(),
    theme: 'light'
  }, config.isDevelopment() ? error.stack : undefined));
});

// Example route demonstrating various features
app.get('/demo', (req, res) => {
  const demoData = {
    message: 'This demonstrates the new EFW features',
    features: [
      'Environment configuration',
      'Request monitoring',
      'Developer tools',
      'Caching system',
      'Standardized API responses',
      'Error pages',
      'Admin panel'
    ],
    config: {
      environment: config.get('env'),
      port: config.get('port')
    },
    cache: globalCache.stats(),
    timestamp: new Date().toISOString()
  };
  
  res.json(ResponseBuilder.success(demoData));
});

// Start server
const port = config.get('port') || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Dashboard: http://localhost:${port}/dev/dashboard`);
  console.log(`🛠️  Dev Tools: http://localhost:${port}/dev/routes`);
  console.log(`⚙️  Admin Panel: http://localhost:${port}/admin`);
  console.log(`🧪 Demo: http://localhost:${port}/demo`);
});

export default app;