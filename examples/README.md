# Portfolio Website Example

A beautiful, responsive portfolio website built with EFW (Efficient Framework for Web) and MySQL integration.

## Features

### 🎨 Frontend
- **Modern Design**: Gradient backgrounds, glassmorphism effects, and smooth animations
- **Responsive Layout**: Mobile-first design that works on all devices
- **Interactive UI**: Hover effects, smooth scrolling, and dynamic stats
- **Project Showcase**: Grid layout with project cards, technology tags, and status indicators

### 🗄️ Backend
- **MySQL Integration**: Full database connectivity with connection pooling
- **RESTful API**: Complete CRUD operations for project management
- **Auto-seeding**: Sample data automatically populated on first run
- **Error Handling**: Comprehensive error handling and logging

### 🚀 Technology Stack
- **Framework**: EFW (Efficient Framework for Web)
- **Runtime**: Bun
- **Database**: MySQL 8.0+
- **Language**: TypeScript
- **Styling**: Modern CSS with animations and responsive design

## Quick Start

### 1. Prerequisites
- Bun runtime
- MySQL 8.0 or higher

### 2. Automated Setup

Run the automated setup script:

```bash
chmod +x scripts/setup-mysql.sh
./scripts/setup-mysql.sh
```

This script will:
- ✅ Check/install MySQL
- ✅ Start MySQL service
- ✅ Create database and user
- ✅ Generate .env configuration
- ✅ Install dependencies
- ✅ Test database connection

### 3. Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Install dependencies
bun install

# Create MySQL database
mysql -u root -p
CREATE DATABASE portfolio;
EXIT;

# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=portfolio
DB_PORT=3306
PORT=3000
EOF

# Start the application
bun examples/portfolio.ts
```

### 4. Start the Portfolio

```bash
# Using npm script
bun run portfolio

# Or directly
bun examples/portfolio.ts
```

## Access Points

Once running, access these URLs:

- **Portfolio Website**: http://localhost:3000
- **Projects API**: http://localhost:3000/api/projects
- **Health Check**: http://localhost:3000/health

## API Documentation

### GET /api/projects
Get all projects with full details.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "EFW - Efficient Framework for Web",
      "description": "A comprehensive TypeScript web framework...",
      "image_url": "https://images.unsplash.com/...",
      "demo_url": "https://github.com/C17H19NO3-SS/efw",
      "github_url": "https://github.com/C17H19NO3-SS/efw",
      "technologies": "TypeScript, Bun, Node.js, MySQL, JWT",
      "status": "active",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Projects retrieved successfully"
}
```

### GET /api/projects/:id
Get a specific project by ID.

### POST /api/admin/projects
Create a new project.

**Request Body:**
```json
{
  "title": "Project Title",
  "description": "Project description",
  "image_url": "https://example.com/image.jpg",
  "demo_url": "https://demo.example.com",
  "github_url": "https://github.com/user/repo",
  "technologies": "React, Node.js, MongoDB",
  "status": "active"
}
```

### PUT /api/admin/projects/:id
Update an existing project.

### DELETE /api/admin/projects/:id
Delete a project.

## Database Schema

### projects table
```sql
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(500),
  demo_url VARCHAR(500),
  github_url VARCHAR(500),
  technologies VARCHAR(500) NOT NULL,
  status ENUM('active', 'completed', 'archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Sample Data

The application automatically seeds sample projects on first run:

1. **EFW Framework** - The web framework itself
2. **Portfolio Website** - This portfolio application
3. **Task Management API** - RESTful API example
4. **E-commerce Platform** - Full-stack example
5. **Data Visualization Dashboard** - Analytics example

## Customization

### Environment Variables

Create/edit `.env` file:

```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=portfolio
DB_PORT=3306

# Application Configuration
PORT=3000
NODE_ENV=development

# Optional: Additional Configuration
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

### Adding Your Projects

1. **Via API**: Use the admin endpoints to add projects programmatically
2. **Via Database**: Insert directly into the MySQL database
3. **Via Code**: Modify the seed data in `src/utils/database.ts`

### Styling Customization

The portfolio uses inline CSS for simplicity. Key customization areas:

- **Colors**: Modify the gradient and accent colors
- **Layout**: Adjust grid columns and spacing
- **Animations**: Customize keyframe animations
- **Typography**: Change fonts and text styles

### Adding New Features

The EFW framework makes it easy to extend:

```typescript
// Add new API endpoint
app.get('/api/skills', async (req, res) => {
  const skills = await db.getSkills();
  res.json(ResponseBuilder.success(skills));
});

// Add new page
app.get('/about', (req, res) => {
  res.html(generateAboutPage());
});
```

## Deployment

### Production Setup

1. **Environment Configuration**:
```bash
NODE_ENV=production
DB_HOST=your-production-host
DB_USER=your-production-user
DB_PASSWORD=your-strong-password
```

2. **Build and Start**:
```bash
bun build examples/portfolio.ts --outdir dist
bun dist/portfolio.js
```

3. **Process Management**:
```bash
# Using PM2
pm2 start dist/portfolio.js --name portfolio

# Using systemd
sudo systemctl enable portfolio
sudo systemctl start portfolio
```

### Docker Deployment

```dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY . .
RUN bun install

EXPOSE 3000
CMD ["bun", "examples/portfolio.ts"]
```

## Troubleshooting

### Common Issues

1. **MySQL Connection Failed**
   - Check MySQL service is running: `sudo systemctl status mysql`
   - Verify credentials in `.env` file
   - Test connection: `mysql -u username -p`

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill process using port: `lsof -ti:3000 | xargs kill`

3. **Dependencies Issues**
   - Clear cache: `bun cache clean`
   - Reinstall: `rm -rf node_modules && bun install`

### Database Issues

1. **Table Not Created**
   - Check database permissions
   - Manually run: `mysql -u root -p portfolio < schema.sql`

2. **Sample Data Not Seeded**
   - Delete existing data: `TRUNCATE TABLE projects;`
   - Restart application to trigger re-seeding

### Performance Optimization

1. **Database Indexing**:
```sql
CREATE INDEX idx_status ON projects(status);
CREATE INDEX idx_created_at ON projects(created_at);
```

2. **Connection Pooling**:
```typescript
// Adjust in database.ts
connectionLimit: 50,  // Increase for high traffic
acquireTimeout: 60000,
timeout: 60000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your improvements
4. Test thoroughly
5. Submit a pull request

## License

MIT License - Feel free to use this portfolio template for your own projects!

---

Built with ❤️ using EFW (Efficient Framework for Web)