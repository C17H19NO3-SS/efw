import { Framework } from './src/framework';
import { createJwtMiddleware, requireAuth } from './src/auth/jwt';
import { createSessionMiddleware } from './src/auth/session';
import { cors } from './src/security/cors';
import { helmet } from './src/security/helmet';
import { createBasicRateLimit } from './src/security/rateLimit';
import { validate, commonSchemas, createSchema } from './src/validation/schema';
import { logger } from './src/utils/logger';
import { createRequestIdMiddleware } from './src/middleware';
import { FrameworkRequest, FrameworkResponse, NextFunction, ErrorMiddleware } from './src/types';

const app = new Framework({
  staticPath: './public',
  templateEngine: 'handlebars',
  templateDir: './views'
});

// Request ID middleware (first)
app.use(createRequestIdMiddleware());

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(createBasicRateLimit(100)); // 100 requests per minute

// Logging
app.use(logger.requestLogger());

// Session management
app.use(createSessionMiddleware({
  secret: 'your-session-secret-key-change-in-production',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// JWT authentication (optional - can use either sessions or JWT)
const jwtSecret = 'your-jwt-secret-key-change-in-production';
app.use('/api/protected', createJwtMiddleware({ secret: jwtSecret }));

// Routes
app.get('/', async (req, res) => {
  try {
    const indexFile = Bun.file('./public/index.html');
    const content = await indexFile.text();
    res.html(content);
  } catch (error) {
    res.json({ 
      message: 'TypeScript Web Framework', 
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint for basic info
app.get('/api/info', (req, res) => {
  res.json({ 
    message: 'TypeScript Web Framework', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Welcome page
app.get('/demo', async (req, res) => {
  try {
    const welcomeFile = Bun.file('./public/welcome.html');
    const content = await welcomeFile.text();
    res.html(content);
  } catch (error) {
    res.status(404).json({ error: 'Welcome page not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

// User registration with validation
app.post('/api/register', 
  validate({
    body: createSchema({
      email: commonSchemas.email,
      password: commonSchemas.strongPassword,
      name: { type: 'string', min: 2, max: 50, required: true }
    })
  }),
  (req, res) => {
    const { email, password, name } = req.body;
    
    // In a real app, you would hash the password and save to database
    console.log('User registration:', { email, name });
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: { email, name }
    });
  }
);

// Login with session
app.post('/api/login',
  validate({
    body: createSchema({
      email: commonSchemas.email,
      password: { type: 'string', required: true }
    })
  }),
  async (req, res) => {
    const { email, password } = req.body;
    
    // In a real app, you would verify credentials against database
    if (email === 'admin@example.com' && password === 'password123') {
      req.session.set('user', { email, role: 'admin' });
      await req.session.save();
      
      res.json({ message: 'Login successful', user: { email } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  }
);

// Session-based protected route
app.get('/api/profile', (req, res) => {
  const user = req.session?.get('user');
  
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({ user });
});

// JWT-based protected route
app.get('/api/protected/data', requireAuth(), (req, res) => {
  res.json({ 
    message: 'This is protected data',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Route with parameters
app.get('/api/users/:id', 
  validate({
    params: createSchema({
      id: { type: 'string', pattern: /^\d+$/, required: true }
    })
  }),
  (req, res) => {
    const { id } = req.params;
    
    res.json({ 
      user: { 
        id: parseInt(id), 
        name: `User ${id}`,
        email: `user${id}@example.com`
      }
    });
  }
);

// File upload simulation
app.post('/api/upload', (req, res) => {
  // In a real app, you would handle file uploads here
  res.json({ message: 'File upload endpoint - implement file handling as needed' });
});

// Template rendering example
app.get('/welcome', (req, res) => {
  res.render('welcome', {
    title: 'Welcome to TypeScript Web Framework',
    message: 'This is a server-rendered page using Handlebars templates',
    user: req.session?.get('user')
  });
});

// Error handling middleware
const errorHandler: ErrorMiddleware = (error: Error, req: FrameworkRequest, res: FrameworkResponse, next: NextFunction) => {
  console.error('Unhandled error:', {
    requestId: req.requestId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });
  
  if (!res.isSent()) {
    // Check if it's a validation error
    if (error.name === 'ValidationError' && (error as any).details) {
      res.status(400).json({
        error: 'Validation failed',
        details: (error as any).details.map((e: any) => ({
          field: e.field,
          message: e.message,
          value: e.value
        }))
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
  
  next();
};

app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation:`);
  console.log(`   GET  /                    - Welcome message`);
  console.log(`   GET  /demo                - Framework demo page`);
  console.log(`   GET  /health              - Health check`);
  console.log(`   POST /api/register        - User registration`);
  console.log(`   POST /api/login           - User login`);
  console.log(`   GET  /api/profile         - User profile (session-based)`);
  console.log(`   GET  /api/protected/data  - Protected data (JWT-based)`);
  console.log(`   GET  /api/users/:id       - Get user by ID`);
  console.log(`   GET  /welcome             - Server-rendered welcome page`);
});