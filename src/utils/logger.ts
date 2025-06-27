export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, any>;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerOptions {
  level?: LogLevel;
  format?: 'json' | 'text';
  colors?: boolean;
  timestamp?: boolean;
  requestId?: boolean;
  transports?: LogTransport[];
}

export interface LogTransport {
  name: string;
  level?: LogLevel;
  write(entry: LogEntry): Promise<void>;
}

export class ConsoleTransport implements LogTransport {
  public name = 'console';
  public level?: LogLevel;
  private colors: boolean;

  constructor(options?: { level?: LogLevel; colors?: boolean }) {
    this.level = options?.level;
    this.colors = options?.colors ?? true;
  }

  async write(entry: LogEntry): Promise<void> {
    const levelName = LogLevel[entry.level];
    const color = this.colors ? this.getColor(entry.level) : '';
    const reset = this.colors ? '\x1b[0m' : '';
    
    const timestamp = entry.timestamp;
    const message = entry.message;
    const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
    
    console.log(`${color}[${timestamp}] ${levelName}: ${message}${meta}${reset}`);
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '\x1b[36m'; // Cyan
      case LogLevel.INFO: return '\x1b[32m';  // Green
      case LogLevel.WARN: return '\x1b[33m';  // Yellow
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      case LogLevel.FATAL: return '\x1b[35m'; // Magenta
      default: return '';
    }
  }
}

export class FileTransport implements LogTransport {
  public name = 'file';
  public level?: LogLevel;
  private filePath: string;
  private maxSize: number;
  private maxFiles: number;

  constructor(options: { 
    filePath: string; 
    level?: LogLevel; 
    maxSize?: number; 
    maxFiles?: number;
  }) {
    this.filePath = options.filePath;
    this.level = options.level;
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      await this.rotateIfNeeded();
      const logLine = JSON.stringify(entry) + '\n';
      await Bun.write(this.filePath, logLine, { createPath: true });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async rotateIfNeeded(): Promise<void> {
    try {
      const file = Bun.file(this.filePath);
      if (await file.exists() && file.size > this.maxSize) {
        await this.rotateFiles();
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private async rotateFiles(): Promise<void> {
    const basePath = this.filePath.replace(/\.[^/.]+$/, '');
    const extension = this.filePath.split('.').pop();

    // Rotate existing files
    for (let i = this.maxFiles - 1; i > 0; i--) {
      const currentFile = `${basePath}.${i}.${extension}`;
      const nextFile = `${basePath}.${i + 1}.${extension}`;
      
      try {
        const current = Bun.file(currentFile);
        if (await current.exists()) {
          await Bun.$`mv ${currentFile} ${nextFile}`;
        }
      } catch (error) {
        console.error(`Failed to rotate ${currentFile}:`, error);
      }
    }

    // Move current file to .1
    try {
      await Bun.$`mv ${this.filePath} ${basePath}.1.${extension}`;
    } catch (error) {
      console.error(`Failed to rotate current log file:`, error);
    }
  }
}

export class Logger {
  private level: LogLevel;
  private format: 'json' | 'text';
  private timestamp: boolean;
  private requestId: boolean;
  private transports: LogTransport[];
  private requestIdCounter = 0;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.format = options.format ?? 'text';
    this.timestamp = options.timestamp ?? true;
    this.requestId = options.requestId ?? false;
    this.transports = options.transports ?? [new ConsoleTransport()];
  }

  private async log(level: LogLevel, message: string, meta?: Record<string, any>): Promise<void> {
    if (level < this.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta
    };

    for (const transport of this.transports) {
      if (!transport.level || level >= transport.level) {
        await transport.write(entry);
      }
    }
  }

  public debug(message: string, meta?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.DEBUG, message, meta);
  }

  public info(message: string, meta?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.INFO, message, meta);
  }

  public warn(message: string, meta?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.WARN, message, meta);
  }

  public error(message: string, meta?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.ERROR, message, meta);
  }

  public fatal(message: string, meta?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.FATAL, message, meta);
  }

  public generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  public requestLogger() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      req.requestId = requestId;
      req.logger = this;

      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        const responseTime = Date.now() - startTime;
        
        this.info('Request completed', {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
          userAgent: req.headers['user-agent']
        });

        return originalEnd.apply(res, args);
      };

      this.info('Request started', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
        userAgent: req.headers['user-agent']
      });

      next();
    };
  }

  public errorLogger() {
    return (error: Error, req: any, res: any, next: any) => {
      this.error('Request error', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
        userAgent: req.headers['user-agent']
      });

      next(error);
    };
  }

  public child(meta: Record<string, any>): Logger {
    const childLogger = new Logger({
      level: this.level,
      format: this.format,
      timestamp: this.timestamp,
      requestId: this.requestId,
      transports: this.transports
    });

    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = async (level: LogLevel, message: string, childMeta?: Record<string, any>) => {
      return originalLog(level, message, { ...meta, ...childMeta });
    };

    return childLogger;
  }
}

export const logger = new Logger();

export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}