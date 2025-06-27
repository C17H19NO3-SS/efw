import type { 
  EfwOptions, 
  EfwRequest, 
  EfwResponse, 
  Handler, 
  Middleware,
  ErrorMiddleware,
  CookieOptions 
} from './types';
import { Router } from './router';
import { 
  MiddlewareStack, 
  createBodyParser, 
  createQueryParser, 
  createCookieParser, 
  createStaticMiddleware 
} from './middleware';

export class Efw {
  private router: Router;
  private middlewareStack: MiddlewareStack;
  private options: EfwOptions;
  private server?: any;
  private templateEngine?: 'handlebars' | 'ejs';
  private templateDir: string = './views';

  constructor(options: EfwOptions = {}) {
    this.options = options;
    this.router = new Router();
    this.middlewareStack = new MiddlewareStack();
    
    this.middlewareStack.use(createQueryParser());
    this.middlewareStack.use(createCookieParser());
    
    if (options.staticPath) {
      this.middlewareStack.use(createStaticMiddleware(options.staticPath));
    }
    
    if (options.templateEngine) {
      this.templateEngine = options.templateEngine;
    }
    
    if (options.templateDir) {
      this.templateDir = options.templateDir;
    }
  }

  public get(path: string, ...handlers: Handler[]): void {
    this.router.get(path, ...handlers);
  }

  public post(path: string, ...handlers: Handler[]): void {
    this.router.post(path, ...handlers);
  }

  public put(path: string, ...handlers: Handler[]): void {
    this.router.put(path, ...handlers);
  }

  public delete(path: string, ...handlers: Handler[]): void {
    this.router.delete(path, ...handlers);
  }

  public patch(path: string, ...handlers: Handler[]): void {
    this.router.patch(path, ...handlers);
  }

  public options(path: string, ...handlers: Handler[]): void {
    this.router.options(path, ...handlers);
  }

  public head(path: string, ...handlers: Handler[]): void {
    this.router.head(path, ...handlers);
  }

  public use(pathOrMiddleware: string | Middleware | ErrorMiddleware, middleware?: Middleware | ErrorMiddleware): void {
    this.middlewareStack.use(pathOrMiddleware, middleware);
  }

  public setTemplateEngine(engine: 'handlebars' | 'ejs', options?: { viewsDir?: string }): void {
    this.templateEngine = engine;
    if (options?.viewsDir) {
      this.templateDir = options.viewsDir;
    }
  }

  private createRequest(request: Request): EfwRequest {
    const url = new URL(request.url);
    
    return {
      method: request.method,
      url: request.url,
      path: url.pathname,
      query: {},
      params: {},
      headers: Object.fromEntries(request.headers.entries()),
      body: request.body,
      cookies: {},
      session: undefined,
      user: undefined,
      requestId: Math.random().toString(36).substr(2, 9)
    };
  }

  private createResponse(): EfwResponse {
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let responseBody: any;
    let isResponseSent = false;

    const response: EfwResponse = {
      statusCode,
      headers,
      templateEngine: this.templateEngine,
      templateDir: this.templateDir,
      
      json(data: any): void {
        if (isResponseSent) return;
        headers['Content-Type'] = 'application/json';
        responseBody = JSON.stringify(data);
        isResponseSent = true;
      },

      text(data: string): void {
        if (isResponseSent) return;
        headers['Content-Type'] = 'text/plain';
        responseBody = data;
        isResponseSent = true;
      },

      html(data: string): void {
        if (isResponseSent) return;
        headers['Content-Type'] = 'text/html';
        responseBody = data;
        isResponseSent = true;
      },

      status(code: number): EfwResponse {
        statusCode = code;
        response.statusCode = code;
        return response;
      },

      setHeader(name: string, value: string): void {
        headers[name] = value;
      },

      cookie(name: string, value: string, options?: CookieOptions): void {
        let cookieString = `${name}=${encodeURIComponent(value)}`;
        
        if (options?.maxAge) {
          cookieString += `; Max-Age=${options.maxAge}`;
        }
        if (options?.httpOnly) {
          cookieString += '; HttpOnly';
        }
        if (options?.secure) {
          cookieString += '; Secure';
        }
        if (options?.sameSite) {
          cookieString += `; SameSite=${options.sameSite}`;
        }
        if (options?.path) {
          cookieString += `; Path=${options.path}`;
        }
        if (options?.domain) {
          cookieString += `; Domain=${options.domain}`;
        }
        
        headers['Set-Cookie'] = cookieString;
      },

      redirect(url: string, code: number = 302): void {
        if (isResponseSent) return;
        statusCode = code;
        response.statusCode = code;
        headers['Location'] = url;
        responseBody = '';
        isResponseSent = true;
      },

      async render(template: string, data: any = {}): Promise<void> {
        if (isResponseSent) return;
        
        try {
          let rendered = '';
          
          if (response.templateEngine === 'handlebars') {
            const Handlebars = await import('handlebars');
            const templatePath = `${response.templateDir}/${template}.hbs`;
            const templateFile = Bun.file(templatePath);
            const templateSource = await templateFile.text();
            const compiledTemplate = Handlebars.compile(templateSource);
            rendered = compiledTemplate(data);
          } else if (response.templateEngine === 'ejs') {
            const ejs = await import('ejs');
            const templatePath = `${response.templateDir}/${template}.ejs`;
            rendered = await ejs.renderFile(templatePath, data);
          } else {
            throw new Error('No template engine configured');
          }
          
          response.html(rendered);
        } catch (error) {
          throw new Error(`Template rendering failed: ${error}`);
        }
      },

      send(data: any): void {
        if (isResponseSent) return;
        
        if (typeof data === 'string') {
          response.text(data);
        } else if (typeof data === 'object') {
          response.json(data);
        } else if (data instanceof Uint8Array) {
          responseBody = data;
          isResponseSent = true;
        } else {
          response.text(String(data));
        }
      },

      isSent(): boolean {
        return isResponseSent;
      }
    };

    (response as any).templateEngine = this.templateEngine;
    (response as any).templateDir = this.templateDir;
    (response as any).getBody = () => responseBody;

    return response;
  }

  private async handleRequest(request: Request): Promise<Response> {
    const req = this.createRequest(request);
    const res = this.createResponse();

    try {
      // Parse body first if it's a POST/PUT/PATCH request
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        try {
          const contentType = req.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            const bodyText = await request.text();
            req.body = bodyText ? JSON.parse(bodyText) : {};
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const bodyText = await request.text();
            req.body = Object.fromEntries(new URLSearchParams(bodyText));
          }
        } catch (e) {
          req.body = {};
        }
      }

      await this.middlewareStack.execute(req, res);
      
      const routeMatch = this.router.findRoute(req.method, req.path);
      
      if (routeMatch) {
        req.params = routeMatch.params;
        await this.router.executeHandlers(routeMatch.route.handlers, req, res);
      } else if (!res.isSent()) {
        res.status(404).json({ error: 'Not Found' });
      }
    } catch (error) {
      console.error('Request handling error:', error);
      if (!res.isSent()) {
        res.status(500).json({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response((res as any).getBody(), {
      status: res.statusCode,
      headers: res.headers
    });
  }

  public listen(port: number = 3000, callback?: () => void): any {
    this.server = Bun.serve({
      port,
      hostname: this.options.host || 'localhost',
      fetch: (request) => this.handleRequest(request),
    });

    if (callback) {
      callback();
    }

    return this.server;
  }

  public close(): void {
    if (this.server) {
      this.server.stop();
    }
  }
}