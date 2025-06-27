import { EnvHelper } from './env';

export interface ConfigOptions {
  env?: string;
  port?: number;
  host?: string;
  cors?: {
    origin: string[];
    credentials: boolean;
  };
  jwt?: {
    secret: string;
    expiresIn: string;
  };
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'simple';
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ConfigOptions;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): ConfigOptions {
    return {
      env: EnvHelper.getString('NODE_ENV', 'development'),
      port: EnvHelper.getNumber('PORT', 3000),
      host: EnvHelper.getString('HOST', 'localhost'),
      cors: {
        origin: EnvHelper.getArray('CORS_ORIGIN', ',', ['*']),
        credentials: EnvHelper.getBoolean('CORS_CREDENTIALS', true)
      },
      jwt: {
        secret: EnvHelper.getString('JWT_SECRET', 'your-secret-key'),
        expiresIn: EnvHelper.getString('JWT_EXPIRES_IN', '1h')
      },
      rateLimit: {
        windowMs: EnvHelper.getNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
        max: EnvHelper.getNumber('RATE_LIMIT_MAX', 100)
      },
      logging: {
        level: EnvHelper.get('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
        format: EnvHelper.get('LOG_FORMAT', 'simple') as 'json' | 'simple'
      }
    };
  }

  get<K extends keyof ConfigOptions>(key: K): ConfigOptions[K] {
    return this.config[key];
  }

  set<K extends keyof ConfigOptions>(key: K, value: ConfigOptions[K]): void {
    this.config[key] = value;
  }

  getAll(): ConfigOptions {
    return { ...this.config };
  }

  reload(): void {
    EnvHelper.clearCache();
    this.config = this.loadConfig();
  }

  isDevelopment(): boolean {
    return this.config.env === 'development';
  }

  isProduction(): boolean {
    return this.config.env === 'production';
  }

  isTest(): boolean {
    return this.config.env === 'test';
  }
}