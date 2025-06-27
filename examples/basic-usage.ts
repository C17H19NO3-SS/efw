// Basic usage example of the TypeScript Web Framework

import { Framework } from '../src/framework';
import { createJwtMiddleware, requireAuth } from '../src/auth/jwt';
import { createSessionMiddleware } from '../src/auth/session';
import { cors } from '../src/security/cors';
import { helmet } from '../src/security/helmet';
import { createBasicRateLimit } from '../src/security/rateLimit';
import { validate, createSchema, commonSchemas } from '../src/validation/schema';
import { logger } from '../src/utils/logger';

// Create a new framework instance
const app = new Framework({
  staticPath: './public',
  templateEngine: 'handlebars',
  templateDir: './views'
});

// Add security middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(createBasicRateLimit(60)); // 60 requests per minute

// Add logging
app.use(logger.requestLogger());

// Add session support
app.use(createSessionMiddleware({
  secret: 'your-secret-key',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Simple route
app.get('/', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

// Route with validation
app.post('/users', 
  validate({
    body: createSchema({
      name: { type: 'string', min: 2, max: 50, required: true },
      email: commonSchemas.email,
      age: { type: 'number', min: 18, max: 120, required: true }
    })
  }),
  (req, res) => {
    const { name, email, age } = req.body;
    
    // Save user logic here...
    const user = { id: Date.now(), name, email, age };
    
    res.status(201).json({ user });
  }
);

// Route with parameters
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  
  // Get user logic here...
  res.json({ user: { id, name: `User ${id}` } });
});

// Protected route with JWT
const jwtSecret = 'your-jwt-secret';
app.use('/api/protected', createJwtMiddleware({ secret: jwtSecret }));

app.get('/api/protected/data', requireAuth(), (req, res) => {
  res.json({ 
    message: 'This is protected data',
    user: req.user 
  });
});

// Session-based authentication
app.post('/login', 
  validate({
    body: createSchema({
      email: commonSchemas.email,
      password: { type: 'string', required: true }
    })
  }),
  async (req, res) => {
    const { email, password } = req.body;
    
    // Verify credentials (replace with real auth logic)
    if (email === 'admin@example.com' && password === 'password') {
      req.session.set('user', { email, role: 'admin' });
      await req.session.save();
      
      res.json({ message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  }
);

// Template rendering
app.get('/dashboard', (req, res) => {
  const user = req.session?.get('user');
  
  if (!user) {
    return res.redirect('/login');
  }
  
  res.render('dashboard', { 
    user,
    title: 'User Dashboard'
  });
});

// Error handling middleware
app.use((error: Error, req: any, res: any, next: any) => {
  logger.error('Unhandled error', { error: error.message });
  
  if (!res.isSent()) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

export default app;