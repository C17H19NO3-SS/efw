# EFW (Efficient Framework for Web)

A comprehensive, production-ready web framework built with TypeScript and Bun, featuring advanced routing, authentication, monitoring, developer tools, and extensive utility libraries.

## Features

### 🚀 Core Framework
- **Type-safe routing** with parameter extraction
- **Middleware system** for request/response processing
- **Authentication** with JWT and session management
- **Template engine** support (Handlebars, EJS)
- **Built-in security** middleware (CORS, helmet, rate limiting)
- **Request validation** with schema validation
- **Error handling** with custom error classes
- **Static file serving**
- **WebSocket support**

### 🔧 Utility Features
- **Environment Helper**: Type-safe .env variable management with caching
- **Config Manager**: Centralized application configuration with hot-reload
- **UUID Generator**: Multiple UUID formats (v4, short, numeric, timestamp, URL-safe)
- **Password Hash Utility**: Secure PBKDF2 hashing with strength validation

### 📊 Monitoring & Analytics
- **Request Counter**: Track API endpoint usage with detailed metrics
- **Response Time Tracker**: Monitor API performance and latency
- **Memory Usage Monitor**: Real-time system resource monitoring
- **Interactive Dashboard**: Beautiful HTML dashboard with auto-refresh

### 🛠️ Developer Tools
- **API Route Lister**: Visual interface for all registered routes
- **EFW Info**: System status and configuration viewer
- **Request Inspector**: Real-time request debugging with detailed logs
- **API Tester**: Built-in Postman-like testing interface

### 💾 Data Management
- **In-Memory Cache**: LRU cache with TTL, statistics, and memoization
- **Cookie Helper**: Comprehensive cookie parsing and management
- **Query String Parser**: Advanced URL parameter processing
- **Response Builder**: Standardized API response formats

### 🎨 Frontend Utilities
- **Asset Versioning**: Automatic CSS/JS versioning with integrity checking
- **HTTP Client**: Feature-rich API client with interceptors and retries
- **Error Pages**: Beautiful, customizable error pages (404, 500, etc.)
- **Admin Panel**: Complete administrative interface

## Installation

```bash
bun install
```

## Testing

EFW includes a comprehensive test suite with 141 tests covering all framework features:

### Run Tests

```bash
# Run all tests
bun test

# Run specific test suites
bun run test:unit           # Unit tests only
bun run test:integration    # Integration tests
bun run test:performance    # Performance tests

# Advanced test options
bun run test:coverage       # Run with coverage
bun run test:watch          # Watch mode
bun run test:verbose        # Detailed output
bun run test:bail           # Stop on first failure
```

### Test Suites

- **Utils Tests**: Environment, configuration, password hashing, caching
- **Auth Tests**: JWT and session authentication
- **Security Tests**: Rate limiting, CORS, helmet middleware
- **Template Tests**: Handlebars and EJS rendering
- **Monitoring Tests**: Request tracking, system metrics, dashboard
- **Integration Tests**: Full framework integration scenarios

## Quick Start

### Basic Usage

```typescript
import { Efw } from './src/framework';
import { ResponseBuilder } from './src/utils';

const app = new Efw();

app.get('/', (req, res) => {
  res.json(ResponseBuilder.success({ message: 'Hello World!' }));
});

app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json(ResponseBuilder.success({ 
    user: { id, name: 'John Doe' } 
  }));
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Advanced Usage with All Features

```typescript
import { Efw } from './src/framework';
import { 
  createMonitoringMiddleware,
  ConfigManager,
  ResponseBuilder,
  AdminPanel
} from './src/utils';

// Initialize configuration
const config = ConfigManager.getInstance();
const app = new Efw();

// Enable monitoring
app.use(createMonitoringMiddleware());

// Enable admin panel in development
if (config.isDevelopment()) {
  AdminPanel.getInstance().enable();
}

// API with standardized responses
app.get('/api/users', (req, res) => {
  const users = [{ id: 1, name: 'John' }];
  res.json(ResponseBuilder.success(users));
});

// Access developer tools at:
// http://localhost:3000/dev/dashboard
// http://localhost:3000/admin

app.listen(3000);
```

## Implementation Roadmap

### Phase 1: Core Framework ✅
- [x] Basic HTTP server setup
- [x] Request/Response abstractions
- [x] Route matching and parameter extraction
- [x] Middleware system
- [x] Error handling

### Phase 2: Advanced Features ✅
- [x] Authentication system (JWT, sessions)
- [x] Template engine integration
- [x] Static file serving
- [x] Request validation
- [x] Security middleware

### Phase 3: Additional Features ✅
- [ ] WebSocket support
- [x] Rate limiting
- [x] CORS handling
- [x] Logging system
- [x] Testing utilities

### Phase 4: Utility & Productivity Features ✅
- [x] Environment & Configuration Management
- [x] Monitoring & Analytics Dashboard
- [x] Developer Tools & Debugging
- [x] Data Management & Caching
- [x] Frontend Utilities & Error Pages
- [x] Admin Panel & System Management

## Project Structure

```
src/
├── framework.ts          # Main EFW class
├── router.ts            # Route handling
├── middleware.ts        # Middleware system
├── auth/
│   ├── jwt.ts          # JWT authentication
│   └── session.ts      # Session management
├── templates/
│   ├── handlebars.ts   # Handlebars integration
│   └── ejs.ts          # EJS integration
├── security/
│   ├── cors.ts         # CORS middleware
│   ├── helmet.ts       # Security headers
│   └── rateLimit.ts    # Rate limiting
├── validation/
│   └── schema.ts       # Request validation
├── utils/               # 🆕 Comprehensive utility library
│   ├── env.ts          # Environment variable management
│   ├── config.ts       # Configuration management
│   ├── uuid.ts         # UUID generation utilities
│   ├── password.ts     # Password hashing & validation
│   ├── monitor.ts      # Request & system monitoring
│   ├── dashboard.ts    # Analytics dashboard
│   ├── devtools.ts     # Developer tools & debugging
│   ├── cache.ts        # In-memory caching system
│   ├── cookies.ts      # Cookie management utilities
│   ├── querystring.ts  # URL parameter parsing
│   ├── response.ts     # Standardized API responses
│   ├── assets.ts       # Static asset versioning
│   ├── client.ts       # HTTP client library
│   ├── errorpages.ts   # Custom error pages
│   ├── admin.ts        # Admin panel interface
│   ├── logger.ts       # Logging utilities
│   ├── errors.ts       # Custom error classes
│   └── index.ts        # Utility exports
└── types/
    └── index.ts        # Type definitions

examples/
├── feature-integration.ts  # Complete feature demonstration
└── ...                     # Additional examples

public/                     # Static assets
views/                      # Template files
tests/                      # Test files
```

## API Documentation

### EFW Class

```typescript
const app = new Efw(options?: EfwOptions);

// HTTP Methods
app.get(path: string, ...handlers: Handler[])
app.post(path: string, ...handlers: Handler[])
app.put(path: string, ...handlers: Handler[])
app.delete(path: string, ...handlers: Handler[])
app.patch(path: string, ...handlers: Handler[])

// Middleware
app.use(middleware: Middleware)
app.use(path: string, middleware: Middleware)

// Start server
app.listen(port: number, callback?: () => void)
```

### Utility Libraries

#### Configuration Management

```typescript
import { ConfigManager, EnvHelper } from './src/utils';

// Environment variables with type safety
const port = EnvHelper.getNumber('PORT', 3000);
const isDev = EnvHelper.getBoolean('DEBUG', false);

// Centralized configuration
const config = ConfigManager.getInstance();
const dbUrl = config.get('database')?.url;
```

#### Monitoring & Analytics

```typescript
import { createMonitoringMiddleware, Dashboard } from './src/utils';

// Add monitoring to your app
app.use(createMonitoringMiddleware());

// Access dashboard at /dev/dashboard
app.get('/dev/dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(Dashboard.generateHTML());
});
```

#### Response Standardization

```typescript
import { ResponseBuilder } from './src/utils';

app.get('/api/users', (req, res) => {
  const users = await getUsersFromDB();
  res.json(ResponseBuilder.success(users));
});

app.get('/api/users/:id', (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.status(404).json(ResponseBuilder.notFound('User'));
  }
  res.json(ResponseBuilder.success(user));
});
```

#### Caching

```typescript
import { globalCache, cache } from './src/utils';

// Simple caching
globalCache.set('key', 'value', 60000); // 1 minute TTL
const value = globalCache.get('key');

// Function memoization
const expensiveOperation = cache('operation-key', async () => {
  return await performExpensiveCalculation();
}, 300000); // 5 minutes
```

#### Authentication

```typescript
// JWT Authentication
app.use(jwt({ secret: 'your-secret' }));

// Session Authentication
app.use(session({ secret: 'your-secret', store: new MemoryStore() }));
```

#### Templates

```typescript
// Set template engine
app.setTemplateEngine('handlebars', { viewsDir: './views' });

// Render template
res.render('index', { title: 'Home Page' });
```

### Developer Tools

Access these built-in tools during development:

- **Dashboard**: `http://localhost:3000/dev/dashboard` - System metrics and monitoring
- **Routes**: `http://localhost:3000/dev/routes` - All registered routes
- **Inspector**: `http://localhost:3000/dev/inspector` - Request debugging
- **API Tester**: `http://localhost:3000/dev/tester` - Built-in API testing tool
- **Admin Panel**: `http://localhost:3000/admin` - System administration

## Examples

### Complete Feature Integration

See `examples/feature-integration.ts` for a comprehensive example showing:

```typescript
import { Efw } from './src/framework';
import { 
  createMonitoringMiddleware,
  ConfigManager,
  ResponseBuilder,
  AdminPanel,
  ErrorPages
} from './src/utils';

const app = new Efw();
const config = ConfigManager.getInstance();

// Add monitoring and developer tools
app.use(createMonitoringMiddleware());

// Standard API responses
app.get('/api/users', (req, res) => {
  res.json(ResponseBuilder.success([
    { id: 1, name: 'John Doe' }
  ]));
});

// Custom error pages
app.use((req, res) => {
  res.status(404).send(ErrorPages.notFound({
    brandName: 'My App',
    theme: 'light'
  }));
});

// Developer tools and admin panel
app.get('/dev/dashboard', (req, res) => {
  res.send(Dashboard.generateHTML());
});

app.listen(3000);
```

### Environment Configuration

Create a `.env` file:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/myapp
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
LOG_LEVEL=debug
```

### Production Deployment

```typescript
import { Efw } from './src/framework';
import { 
  ConfigManager,
  createMonitoringMiddleware,
  ErrorPages
} from './src/utils';

const config = ConfigManager.getInstance();
const app = new Efw();

// Production middleware
if (config.isProduction()) {
  app.use(createMonitoringMiddleware());
}

// Production error handling
app.use((error: Error, req: any, res: any, next: any) => {
  res.status(500).send(ErrorPages.internalServerError({
    showDetails: false,
    supportEmail: 'support@example.com'
  }));
});

const port = config.get('port') || 3000;
app.listen(port);
```

## Getting Started

1. **Clone and install**:
   ```bash
   git clone <repository>
   cd efw
   bun install
   ```

2. **Run the example**:
   ```bash
   bun run examples/feature-integration.ts
   ```

3. **Access the tools**:
   - App: http://localhost:3000
   - Dashboard: http://localhost:3000/dev/dashboard
   - API Tester: http://localhost:3000/dev/tester
   - Admin Panel: http://localhost:3000/admin

4. **Build for production**:
   ```bash
   bun build examples/feature-integration.ts --outdir dist
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT - See LICENSE file for details
