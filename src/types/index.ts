export interface EfwRequest {
  method: string;
  url: string;
  path: string;
  query: Record<string, string>;
  params: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  cookies: Record<string, string>;
  session?: any;
  user?: any;
  requestId?: string;
}

export interface EfwResponse {
  statusCode: number;
  headers: Record<string, string>;
  json(data: any): void;
  text(data: string): void;
  html(data: string): void;
  status(code: number): EfwResponse;
  setHeader(name: string, value: string): void;
  cookie(name: string, value: string, options?: CookieOptions): void;
  redirect(url: string, code?: number): void;
  render(template: string, data?: any): void;
  send(data: any): void;
  isSent(): boolean;
}

export interface CookieOptions {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  domain?: string;
}

export interface Handler {
  (req: EfwRequest, res: EfwResponse, next?: NextFunction): void | Promise<void>;
}

export interface NextFunction {
  (error?: Error): void;
}

export interface Middleware {
  (req: EfwRequest, res: EfwResponse, next: NextFunction): void | Promise<void>;
}

export interface ErrorMiddleware {
  (error: Error, req: EfwRequest, res: EfwResponse, next: NextFunction): void | Promise<void>;
}

export interface Route {
  method: string;
  path: string;
  pattern: RegExp;
  keys: string[];
  handlers: Handler[];
}

export interface EfwOptions {
  port?: number;
  host?: string;
  cors?: CorsOptions;
  staticPath?: string;
  templateEngine?: 'handlebars' | 'ejs';
  templateDir?: string;
}

export interface CorsOptions {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
}

export interface JwtOptions {
  secret: string;
  expiresIn?: string;
  algorithm?: string;
}

export interface SessionOptions {
  secret: string;
  maxAge?: number;
  store?: SessionStore;
  cookie?: CookieOptions;
}

export interface SessionStore {
  get(id: string): Promise<any>;
  set(id: string, data: any): Promise<void>;
  destroy(id: string): Promise<void>;
}

export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
  };
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
}

export class EfwError extends Error {
  public statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'EfwError';
    this.statusCode = statusCode;
  }
}