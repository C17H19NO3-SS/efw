import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
  connectionLimit?: number;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  image_url: string;
  demo_url?: string;
  github_url?: string;
  technologies: string;
  status: 'active' | 'completed' | 'archived';
  created_at: Date;
  updated_at: Date;
}

export class Database {
  private static instance: Database;
  private pool: mysql.Pool;

  private constructor(config: DatabaseConfig) {
    this.pool = mysql.createPool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port || 3306,
      connectionLimit: config.connectionLimit || 10,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    });
  }

  public static getInstance(config?: DatabaseConfig): Database {
    if (!Database.instance) {
      if (!config) {
        throw new Error('Database configuration required for first initialization');
      }
      Database.instance = new Database(config);
    }
    return Database.instance;
  }

  public async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows as T[];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  public async getConnection() {
    return await this.pool.getConnection();
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  // Portfolio specific methods
  public async getAllProjects(): Promise<Project[]> {
    const sql = `
      SELECT 
        id, title, description, image_url, demo_url, github_url, 
        technologies, status, created_at, updated_at
      FROM projects 
      ORDER BY created_at DESC
    `;
    return await this.query<Project>(sql);
  }

  public async getProjectById(id: number): Promise<Project | null> {
    const sql = `
      SELECT 
        id, title, description, image_url, demo_url, github_url, 
        technologies, status, created_at, updated_at
      FROM projects 
      WHERE id = ?
    `;
    const results = await this.query<Project>(sql, [id]);
    return results.length > 0 ? results[0] : null;
  }

  public async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const sql = `
      INSERT INTO projects (title, description, image_url, demo_url, github_url, technologies, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await this.query(sql, [
      project.title,
      project.description,
      project.image_url,
      project.demo_url,
      project.github_url,
      project.technologies,
      project.status
    ]);
    return (result as any).insertId;
  }

  public async updateProject(id: number, project: Partial<Omit<Project, 'id' | 'created_at'>>): Promise<boolean> {
    const fields = [];
    const values = [];
    
    Object.entries(project).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = NOW()');
    values.push(id);
    
    const sql = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.query(sql, values);
    return (result as any).affectedRows > 0;
  }

  public async deleteProject(id: number): Promise<boolean> {
    const sql = 'DELETE FROM projects WHERE id = ?';
    const result = await this.query(sql, [id]);
    return (result as any).affectedRows > 0;
  }

  public async initializeDatabase(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS projects (
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
      )
    `;
    
    await this.query(createTableSQL);
    console.log('✅ Database table created/verified');
  }

  public async seedSampleData(): Promise<void> {
    const checkData = await this.query('SELECT COUNT(*) as count FROM projects');
    if ((checkData[0] as any).count > 0) {
      console.log('📊 Sample data already exists');
      return;
    }

    const sampleProjects = [
      {
        title: 'EFW - Efficient Framework for Web',
        description: 'A comprehensive TypeScript web framework built with Bun, featuring advanced routing, authentication, monitoring, and extensive utility libraries.',
        image_url: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=800&h=400&fit=crop',
        demo_url: 'https://github.com/C17H19NO3-SS/efw',
        github_url: 'https://github.com/C17H19NO3-SS/efw',
        technologies: 'TypeScript, Bun, Node.js, MySQL, JWT, Handlebars',
        status: 'active' as const
      },
      {
        title: 'Portfolio Website',
        description: 'A dynamic portfolio website showcasing projects with MySQL backend integration, responsive design, and modern UI components.',
        image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
        demo_url: 'http://localhost:3000',
        github_url: 'https://github.com/C17H19NO3-SS/efw',
        technologies: 'TypeScript, EFW, MySQL, HTML5, CSS3, JavaScript',
        status: 'completed' as const
      },
      {
        title: 'Task Management API',
        description: 'RESTful API for task management with user authentication, real-time updates, and comprehensive task organization features.',
        image_url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=400&fit=crop',
        demo_url: null,
        github_url: 'https://github.com/example/task-api',
        technologies: 'Node.js, Express, PostgreSQL, JWT, Socket.io',
        status: 'completed' as const
      },
      {
        title: 'E-commerce Platform',
        description: 'Full-stack e-commerce solution with payment integration, inventory management, and admin dashboard.',
        image_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop',
        demo_url: 'https://demo-ecommerce.example.com',
        github_url: 'https://github.com/example/ecommerce',
        technologies: 'React, Node.js, MongoDB, Stripe, Redis',
        status: 'active' as const
      },
      {
        title: 'Data Visualization Dashboard',
        description: 'Interactive dashboard for data analytics with real-time charts, filters, and export capabilities.',
        image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
        demo_url: null,
        github_url: 'https://github.com/example/dashboard',
        technologies: 'Vue.js, D3.js, Python, Flask, MySQL',
        status: 'archived' as const
      }
    ];

    for (const project of sampleProjects) {
      await this.createProject(project);
    }
    
    console.log('🌱 Sample data seeded successfully');
  }
}