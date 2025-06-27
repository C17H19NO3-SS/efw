#!/usr/bin/env bun

import { Efw } from '../src/framework';
import { Database, type DatabaseConfig } from '../src/utils/database';
import { createRequestIdMiddleware } from '../src/middleware';
import { cors } from '../src/security/cors';
import { helmet } from '../src/security/helmet';
import { logger } from '../src/utils/logger';
import { ResponseBuilder } from '../src/utils/response';
import { EnvHelper } from '../src/utils/env';

// Database configuration
const dbConfig: DatabaseConfig = {
  host: EnvHelper.get('DB_HOST', 'localhost'),
  user: EnvHelper.get('DB_USER', 'root'),
  password: EnvHelper.get('DB_PASSWORD', ''),
  database: EnvHelper.get('DB_NAME', 'portfolio'),
  port: EnvHelper.getNumber('DB_PORT', 3306),
  connectionLimit: 10
};

// Initialize database
let db: Database;

async function initializeApp() {
  try {
    // Initialize database connection
    db = Database.getInstance(dbConfig);
    
    // Create tables and seed data
    await db.initializeDatabase();
    await db.seedSampleData();
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('💡 Make sure MySQL is running and credentials are correct');
    console.log('📝 Create database: CREATE DATABASE portfolio;');
    process.exit(1);
  }
}

// Initialize EFW app
const app = new Efw({
  staticPath: './public',
  templateEngine: 'handlebars',
  templateDir: './views'
});

// Middleware setup
app.use(createRequestIdMiddleware());
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(logger.requestLogger());

// Serve static files for portfolio assets
app.use('/assets', (req, res, next) => {
  // This will be handled by static middleware
  next();
});

// Home page - Portfolio
app.get('/', async (req, res) => {
  try {
    const projects = await db.getAllProjects();
    
    const portfolioHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio - Web Developer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
        }
        
        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: #667eea;
        }
        
        .nav-links {
            display: flex;
            list-style: none;
            gap: 2rem;
        }
        
        .nav-links a {
            text-decoration: none;
            color: #333;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        
        .nav-links a:hover {
            color: #667eea;
        }
        
        main {
            margin-top: 80px;
            padding: 2rem 0;
        }
        
        .hero {
            text-align: center;
            padding: 4rem 0;
            color: white;
        }
        
        .hero h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            animation: fadeInUp 1s ease;
        }
        
        .hero p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
            animation: fadeInUp 1s ease 0.2s both;
        }
        
        .cta-button {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 1rem 2rem;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            animation: fadeInUp 1s ease 0.4s both;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .cta-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        
        .projects-section {
            background: white;
            margin: 2rem 0;
            border-radius: 20px;
            padding: 3rem 0;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        
        .section-title {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 3rem;
            color: #333;
        }
        
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            padding: 0 2rem;
        }
        
        .project-card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .project-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
        }
        
        .project-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        
        .project-card:hover .project-image {
            transform: scale(1.05);
        }
        
        .project-content {
            padding: 1.5rem;
        }
        
        .project-title {
            font-size: 1.3rem;
            font-weight: bold;
            margin-bottom: 1rem;
            color: #333;
        }
        
        .project-description {
            color: #666;
            margin-bottom: 1rem;
            line-height: 1.6;
        }
        
        .project-tech {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .tech-tag {
            background: #f0f0f0;
            color: #666;
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
        }
        
        .project-status {
            display: inline-block;
            padding: 0.3rem 0.8rem;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-active {
            background: #e8f5e8;
            color: #2e7d32;
        }
        
        .status-completed {
            background: #e3f2fd;
            color: #1565c0;
        }
        
        .status-archived {
            background: #fff3e0;
            color: #ef6c00;
        }
        
        .project-links {
            margin-top: 1rem;
            display: flex;
            gap: 1rem;
        }
        
        .project-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .project-link:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
        }
        
        .project-link.github {
            background: #333;
        }
        
        .project-link.github:hover {
            background: #555;
        }
        
        footer {
            background: rgba(255, 255, 255, 0.95);
            text-align: center;
            padding: 2rem 0;
            margin-top: 3rem;
            color: #666;
        }
        
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-bottom: 1rem;
        }
        
        .footer-links a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        
        .footer-links a:hover {
            text-decoration: underline;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2rem;
            }
            
            .nav-links {
                display: none;
            }
            
            .projects-grid {
                grid-template-columns: 1fr;
                padding: 0 1rem;
            }
            
            .footer-links {
                flex-direction: column;
                gap: 1rem;
            }
        }
        
        .stats {
            display: flex;
            justify-content: center;
            gap: 3rem;
            margin: 2rem 0;
            color: white;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            display: block;
        }
        
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <nav>
                <div class="logo">Portfolio</div>
                <ul class="nav-links">
                    <li><a href="#home">Home</a></li>
                    <li><a href="#projects">Projects</a></li>
                    <li><a href="#contact">Contact</a></li>
                    <li><a href="/api/projects">API</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main>
        <section class="hero" id="home">
            <div class="container">
                <h1>Full Stack Developer</h1>
                <p>Building modern web applications with cutting-edge technologies</p>
                
                <div class="stats">
                    <div class="stat">
                        <span class="stat-number">${projects.length}</span>
                        <span class="stat-label">Projects</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${projects.filter(p => p.status === 'completed').length}</span>
                        <span class="stat-label">Completed</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${projects.filter(p => p.status === 'active').length}</span>
                        <span class="stat-label">Active</span>
                    </div>
                </div>
                
                <a href="#projects" class="cta-button">View My Work</a>
            </div>
        </section>

        <section class="projects-section" id="projects">
            <div class="container">
                <h2 class="section-title">Featured Projects</h2>
                <div class="projects-grid">
                    ${projects.map(project => `
                        <div class="project-card" onclick="window.open('${project.demo_url || project.github_url}', '_blank')">
                            <img src="${project.image_url}" alt="${project.title}" class="project-image" onerror="this.src='https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=800&h=400&fit=crop'">
                            <div class="project-content">
                                <h3 class="project-title">${project.title}</h3>
                                <p class="project-description">${project.description}</p>
                                
                                <div class="project-tech">
                                    ${project.technologies.split(',').map(tech => 
                                        `<span class="tech-tag">${tech.trim()}</span>`
                                    ).join('')}
                                </div>
                                
                                <div style="margin-bottom: 1rem;">
                                    <span class="project-status status-${project.status}">${project.status}</span>
                                </div>
                                
                                <div class="project-links">
                                    ${project.demo_url ? `<a href="${project.demo_url}" class="project-link" target="_blank" onclick="event.stopPropagation()">🌐 Demo</a>` : ''}
                                    ${project.github_url ? `<a href="${project.github_url}" class="project-link github" target="_blank" onclick="event.stopPropagation()">📱 GitHub</a>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>
    </main>

    <footer id="contact">
        <div class="container">
            <div class="footer-links">
                <a href="mailto:developer@example.com">Email</a>
                <a href="https://github.com" target="_blank">GitHub</a>
                <a href="https://linkedin.com" target="_blank">LinkedIn</a>
                <a href="https://twitter.com" target="_blank">Twitter</a>
            </div>
            <p>&copy; 2024 Portfolio. Built with EFW (Efficient Framework for Web)</p>
        </div>
    </footer>

    <script>
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Add scroll effect to header
        window.addEventListener('scroll', () => {
            const header = document.querySelector('header');
            if (window.scrollY > 100) {
                header.style.background = 'rgba(255, 255, 255, 0.98)';
            } else {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
            }
        });
    </script>
</body>
</html>`;

    res.html(portfolioHTML);
  } catch (error) {
    console.error('Error loading portfolio:', error);
    res.status(500).json(ResponseBuilder.error('Failed to load portfolio'));
  }
});

// API Endpoints
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await db.getAllProjects();
    res.json(ResponseBuilder.success(projects, 'Projects retrieved successfully'));
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json(ResponseBuilder.error('Failed to fetch projects'));
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json(ResponseBuilder.error('Invalid project ID'));
    }

    const project = await db.getProjectById(id);
    if (!project) {
      return res.status(404).json(ResponseBuilder.notFound('Project'));
    }

    res.json(ResponseBuilder.success(project, 'Project retrieved successfully'));
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json(ResponseBuilder.error('Failed to fetch project'));
  }
});

// Admin API endpoints (simplified)
app.post('/api/admin/projects', async (req, res) => {
  try {
    const projectData = req.body;
    
    // Basic validation
    if (!projectData.title || !projectData.description || !projectData.technologies) {
      return res.status(400).json(ResponseBuilder.error('Missing required fields'));
    }

    const projectId = await db.createProject({
      title: projectData.title,
      description: projectData.description,
      image_url: projectData.image_url || '',
      demo_url: projectData.demo_url,
      github_url: projectData.github_url,
      technologies: projectData.technologies,
      status: projectData.status || 'active'
    });

    res.status(201).json(ResponseBuilder.success({ id: projectId }, 'Project created successfully'));
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json(ResponseBuilder.error('Failed to create project'));
  }
});

app.put('/api/admin/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json(ResponseBuilder.error('Invalid project ID'));
    }

    const success = await db.updateProject(id, req.body);
    if (!success) {
      return res.status(404).json(ResponseBuilder.notFound('Project'));
    }

    res.json(ResponseBuilder.success(null, 'Project updated successfully'));
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json(ResponseBuilder.error('Failed to update project'));
  }
});

app.delete('/api/admin/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json(ResponseBuilder.error('Invalid project ID'));
    }

    const success = await db.deleteProject(id);
    if (!success) {
      return res.status(404).json(ResponseBuilder.notFound('Project'));
    }

    res.json(ResponseBuilder.success(null, 'Project deleted successfully'));
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json(ResponseBuilder.error('Failed to delete project'));
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json(ResponseBuilder.success({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: 'connected'
  }));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json(ResponseBuilder.notFound('Page'));
});

// Error handler
app.use((error: Error, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json(ResponseBuilder.error('Internal server error'));
});

// Start the application
async function startServer() {
  await initializeApp();
  
  const PORT = EnvHelper.getNumber('PORT', 3000);
  
  app.listen(PORT, () => {
    console.log('🚀 Portfolio application started successfully!');
    console.log(`📱 Server: http://localhost:${PORT}`);
    console.log(`🌐 Portfolio: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api/projects`);
    console.log('');
    console.log('📊 Database Configuration:');
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log('');
    console.log('💡 Environment Variables (.env):');
    console.log('   DB_HOST=localhost');
    console.log('   DB_USER=root');
    console.log('   DB_PASSWORD=your_password');
    console.log('   DB_NAME=portfolio');
    console.log('   DB_PORT=3306');
    console.log('   PORT=3000');
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (db) {
    await db.close();
    console.log('✅ Database connection closed');
  }
  process.exit(0);
});

startServer().catch(console.error);