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

export interface PersonalInfo {
  id: number;
  name: string;
  title: string;
  bio: string;
  location: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  resume_url?: string;
  linkedin_url?: string;
  github_url?: string;
  twitter_url?: string;
  website_url?: string;
  years_experience: number;
  availability_status: 'available' | 'busy' | 'unavailable';
  created_at: Date;
  updated_at: Date;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  level: number; // 1-5
  years_experience: number;
  is_featured: boolean;
  created_at: Date;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'json';
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
    // Projects table
    const createProjectsTableSQL = `
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

    // Personal info table
    const createPersonalInfoTableSQL = `
      CREATE TABLE IF NOT EXISTS personal_info (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        bio TEXT NOT NULL,
        location VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        avatar_url VARCHAR(500),
        resume_url VARCHAR(500),
        linkedin_url VARCHAR(500),
        github_url VARCHAR(500),
        twitter_url VARCHAR(500),
        website_url VARCHAR(500),
        years_experience INT DEFAULT 0,
        availability_status ENUM('available', 'busy', 'unavailable') DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    // Skills table
    const createSkillsTableSQL = `
      CREATE TABLE IF NOT EXISTS skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        level INT NOT NULL CHECK (level >= 1 AND level <= 5),
        years_experience INT DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Contact messages table
    const createContactMessagesTableSQL = `
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        company VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('new', 'read', 'replied', 'archived') DEFAULT 'new',
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    // Settings table
    const createSettingsTableSQL = `
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await this.query(createProjectsTableSQL);
    await this.query(createPersonalInfoTableSQL);
    await this.query(createSkillsTableSQL);
    await this.query(createContactMessagesTableSQL);
    await this.query(createSettingsTableSQL);
    
    console.log('✅ Database tables created/verified');
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

  // Personal Info methods
  public async getPersonalInfo(): Promise<PersonalInfo | null> {
    const sql = 'SELECT * FROM personal_info ORDER BY id DESC LIMIT 1';
    const results = await this.query<PersonalInfo>(sql);
    return results.length > 0 ? results[0] : null;
  }

  public async updatePersonalInfo(info: Partial<Omit<PersonalInfo, 'id' | 'created_at'>>): Promise<boolean> {
    const existing = await this.getPersonalInfo();
    
    if (existing) {
      const fields = [];
      const values = [];
      
      Object.entries(info).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at' && value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (fields.length === 0) return false;
      
      fields.push('updated_at = NOW()');
      values.push(existing.id);
      
      const sql = `UPDATE personal_info SET ${fields.join(', ')} WHERE id = ?`;
      const result = await this.query(sql, values);
      return (result as any).affectedRows > 0;
    } else {
      // Create new record
      const sql = `
        INSERT INTO personal_info (name, title, bio, location, email, phone, avatar_url, resume_url, 
        linkedin_url, github_url, twitter_url, website_url, years_experience, availability_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await this.query(sql, [
        info.name || '',
        info.title || '',
        info.bio || '',
        info.location || '',
        info.email || '',
        info.phone,
        info.avatar_url,
        info.resume_url,
        info.linkedin_url,
        info.github_url,
        info.twitter_url,
        info.website_url,
        info.years_experience || 0,
        info.availability_status || 'available'
      ]);
      return (result as any).insertId > 0;
    }
  }

  // Skills methods
  public async getAllSkills(): Promise<Skill[]> {
    const sql = 'SELECT * FROM skills ORDER BY is_featured DESC, level DESC, name ASC';
    return await this.query<Skill>(sql);
  }

  public async getFeaturedSkills(): Promise<Skill[]> {
    const sql = 'SELECT * FROM skills WHERE is_featured = true ORDER BY level DESC, name ASC';
    return await this.query<Skill>(sql);
  }

  public async getSkillsByCategory(): Promise<Record<string, Skill[]>> {
    const skills = await this.getAllSkills();
    const categories: Record<string, Skill[]> = {};
    
    skills.forEach(skill => {
      if (!categories[skill.category]) {
        categories[skill.category] = [];
      }
      categories[skill.category].push(skill);
    });
    
    return categories;
  }

  public async createSkill(skill: Omit<Skill, 'id' | 'created_at'>): Promise<number> {
    const sql = `
      INSERT INTO skills (name, category, level, years_experience, is_featured)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await this.query(sql, [
      skill.name,
      skill.category,
      skill.level,
      skill.years_experience,
      skill.is_featured
    ]);
    return (result as any).insertId;
  }

  // Contact Messages methods
  public async createContactMessage(message: Omit<ContactMessage, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const sql = `
      INSERT INTO contact_messages (name, email, phone, company, subject, message, status, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await this.query(sql, [
      message.name,
      message.email,
      message.phone,
      message.company,
      message.subject,
      message.message,
      message.status || 'new',
      message.ip_address,
      message.user_agent
    ]);
    return (result as any).insertId;
  }

  public async getAllContactMessages(): Promise<ContactMessage[]> {
    const sql = 'SELECT * FROM contact_messages ORDER BY created_at DESC';
    return await this.query<ContactMessage>(sql);
  }

  public async getContactMessageById(id: number): Promise<ContactMessage | null> {
    const sql = 'SELECT * FROM contact_messages WHERE id = ?';
    const results = await this.query<ContactMessage>(sql, [id]);
    return results.length > 0 ? results[0] : null;
  }

  public async updateContactMessageStatus(id: number, status: ContactMessage['status']): Promise<boolean> {
    const sql = 'UPDATE contact_messages SET status = ?, updated_at = NOW() WHERE id = ?';
    const result = await this.query(sql, [status, id]);
    return (result as any).affectedRows > 0;
  }

  // Settings methods
  public async getSetting(key: string): Promise<string | null> {
    const sql = 'SELECT value FROM settings WHERE `key` = ?';
    const results = await this.query<{value: string}>(sql, [key]);
    return results.length > 0 ? results[0].value : null;
  }

  public async setSetting(key: string, value: string, description?: string, type: Settings['type'] = 'string'): Promise<boolean> {
    const sql = `
      INSERT INTO settings (\`key\`, value, description, type) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      value = VALUES(value), 
      description = VALUES(description), 
      type = VALUES(type),
      updated_at = NOW()
    `;
    const result = await this.query(sql, [key, value, description, type]);
    return (result as any).affectedRows > 0;
  }

  public async getAllSettings(): Promise<Settings[]> {
    const sql = 'SELECT * FROM settings ORDER BY `key`';
    return await this.query<Settings>(sql);
  }

  public async deleteSetting(key: string): Promise<boolean> {
    const sql = 'DELETE FROM settings WHERE `key` = ?';
    const result = await this.query(sql, [key]);
    return (result as any).affectedRows > 0;
  }

  // Convenience method to get email settings
  public async getEmailSettings(): Promise<{recipient_email: string; smtp_host?: string; smtp_port?: string; smtp_user?: string; smtp_password?: string}> {
    const settings = await this.getAllSettings();
    const emailSettings: any = {};
    
    settings.forEach(setting => {
      if (setting.key.startsWith('email_') || setting.key.startsWith('smtp_')) {
        emailSettings[setting.key] = setting.value;
      }
    });
    
    return {
      recipient_email: emailSettings.email_recipient || 'admin@portfolio.dev',
      smtp_host: emailSettings.smtp_host,
      smtp_port: emailSettings.smtp_port,
      smtp_user: emailSettings.smtp_user,
      smtp_password: emailSettings.smtp_password
    };
  }

  public async seedPortfolioData(): Promise<void> {
    // Check if personal info exists
    const personalInfo = await this.getPersonalInfo();
    if (!personalInfo) {
      await this.updatePersonalInfo({
        name: 'John Doe',
        title: 'Full Stack Developer & Software Engineer',
        bio: `Passionate full-stack developer with ${new Date().getFullYear() - 2018}+ years of experience building modern web applications. I specialize in React, Node.js, and cloud technologies. I love creating efficient, scalable solutions that make a real impact.

        I'm always excited to work on challenging projects that push the boundaries of what's possible with web technology. My goal is to write clean, maintainable code that delivers exceptional user experiences.`,
        location: 'San Francisco, CA',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        resume_url: '/assets/resume.pdf',
        linkedin_url: 'https://linkedin.com/in/johndoe',
        github_url: 'https://github.com/johndoe',
        twitter_url: 'https://twitter.com/johndoe',
        website_url: 'https://johndoe.dev',
        years_experience: new Date().getFullYear() - 2018,
        availability_status: 'available'
      });
    }

    // Check if skills exist
    const skills = await this.getAllSkills();
    if (skills.length === 0) {
      const sampleSkills = [
        { name: 'JavaScript', category: 'Programming Languages', level: 5, years_experience: 6, is_featured: true },
        { name: 'TypeScript', category: 'Programming Languages', level: 5, years_experience: 4, is_featured: true },
        { name: 'Python', category: 'Programming Languages', level: 4, years_experience: 3, is_featured: true },
        { name: 'React', category: 'Frontend Frameworks', level: 5, years_experience: 5, is_featured: true },
        { name: 'Node.js', category: 'Backend Technologies', level: 5, years_experience: 5, is_featured: true },
        { name: 'Express.js', category: 'Backend Technologies', level: 4, years_experience: 4, is_featured: false },
        { name: 'MySQL', category: 'Databases', level: 4, years_experience: 4, is_featured: true },
        { name: 'MongoDB', category: 'Databases', level: 4, years_experience: 3, is_featured: false },
        { name: 'AWS', category: 'Cloud & DevOps', level: 4, years_experience: 3, is_featured: true },
        { name: 'Docker', category: 'Cloud & DevOps', level: 3, years_experience: 2, is_featured: false },
        { name: 'Git', category: 'Tools & Workflow', level: 5, years_experience: 6, is_featured: false },
        { name: 'VS Code', category: 'Tools & Workflow', level: 5, years_experience: 5, is_featured: false }
      ];

      for (const skill of sampleSkills) {
        await this.createSkill(skill);
      }
    }

    // Set default email settings
    await this.setSetting('email_recipient', 'admin@portfolio.dev', 'Email address to receive contact form submissions', 'string');
    await this.setSetting('email_from_name', 'Portfolio Contact Form', 'Name shown in email from field', 'string');
    await this.setSetting('email_auto_reply', 'true', 'Send automatic reply to contact form submissions', 'boolean');
    await this.setSetting('site_title', 'John Doe - Full Stack Developer', 'Main site title', 'string');
    await this.setSetting('site_description', 'Full Stack Developer specializing in React, Node.js, and modern web technologies', 'Site meta description', 'string');
    
    console.log('🌱 Portfolio data seeded successfully');
  }
}