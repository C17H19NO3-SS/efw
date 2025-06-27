import type { Middleware, ErrorMiddleware, EfwRequest, EfwResponse, NextFunction } from './types';

export class MiddlewareStack {
  private middlewares: Array<{ path?: string; middleware: Middleware }> = [];
  private errorMiddlewares: Array<{ path?: string; middleware: ErrorMiddleware }> = [];

  public use(pathOrMiddleware: string | Middleware | ErrorMiddleware, middleware?: Middleware | ErrorMiddleware): void {
    if (typeof pathOrMiddleware === 'string' && middleware) {
      if (middleware.length === 4) {
        this.errorMiddlewares.push({ path: pathOrMiddleware, middleware: middleware as ErrorMiddleware });
      } else {
        this.middlewares.push({ path: pathOrMiddleware, middleware: middleware as Middleware });
      }
    } else if (typeof pathOrMiddleware === 'function') {
      if (pathOrMiddleware.length === 4) {
        this.errorMiddlewares.push({ middleware: pathOrMiddleware as ErrorMiddleware });
      } else {
        this.middlewares.push({ middleware: pathOrMiddleware as Middleware });
      }
    }
  }

  public async execute(req: EfwRequest, res: EfwResponse): Promise<void> {
    let currentIndex = 0;
    
    const next: NextFunction = (error?: Error) => {
      if (error) {
        this.handleError(error, req, res);
        return;
      }
      
      currentIndex++;
      executeNext();
    };

    const executeNext = async () => {
      if (currentIndex >= this.middlewares.length) {
        return;
      }

      const { path, middleware } = this.middlewares[currentIndex];
      
      if (path && !req.path.startsWith(path)) {
        currentIndex++;
        return executeNext();
      }

      try {
        const result = middleware(req, res, next);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        this.handleError(error as Error, req, res);
      }
    };

    await executeNext();
  }

  private async handleError(error: Error, req: EfwRequest, res: EfwResponse): Promise<void> {
    for (const { path, middleware } of this.errorMiddlewares) {
      if (path && !req.path.startsWith(path)) {
        continue;
      }

      try {
        const result = middleware(error, req, res, () => {});
        if (result instanceof Promise) {
          await result;
        }
        break;
      } catch (err) {
        console.error('Error in error middleware:', err);
      }
    }
  }
}

export function createBodyParser(): Middleware {
  return async (req: EfwRequest, res: EfwResponse, next: NextFunction) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      try {
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('application/json') && req.body) {
          if (req.body instanceof ReadableStream) {
            const body = await Bun.readableStreamToText(req.body);
            req.body = body ? JSON.parse(body) : {};
          } else if (typeof req.body === 'string') {
            req.body = JSON.parse(req.body);
          }
        } else if (contentType.includes('application/x-www-form-urlencoded') && req.body) {
          if (req.body instanceof ReadableStream) {
            const body = await Bun.readableStreamToText(req.body);
            req.body = Object.fromEntries(new URLSearchParams(body));
          } else if (typeof req.body === 'string') {
            req.body = Object.fromEntries(new URLSearchParams(req.body));
          }
        }
      } catch (error) {
        console.error('Body parsing error:', error);
        req.body = {};
      }
    } else {
      req.body = {};
    }
    
    next();
  };
}

export function createQueryParser(): Middleware {
  return (req: EfwRequest, res: EfwResponse, next: NextFunction) => {
    const url = new URL(req.url, 'http://localhost');
    req.query = Object.fromEntries(url.searchParams);
    req.path = url.pathname;
    next();
  };
}

export function createCookieParser(): Middleware {
  return (req: EfwRequest, res: EfwResponse, next: NextFunction) => {
    const cookies: Record<string, string> = {};
    const cookieHeader = req.headers.cookie;
    
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          cookies[name] = decodeURIComponent(value);
        }
      });
    }
    
    req.cookies = cookies;
    next();
  };
}

export function createStaticMiddleware(staticPath: string): Middleware {
  return async (req: EfwRequest, res: EfwResponse, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const filePath = `${staticPath}${req.path}`;
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        const mimeType = getMimeType(filePath);
        res.setHeader('Content-Type', mimeType);
        
        const arrayBuffer = await file.arrayBuffer();
        res.send(new Uint8Array(arrayBuffer));
        return;
      }
    } catch (error) {
      // File not found, continue to next middleware
    }
    
    next();
  };
}

export function createRequestIdMiddleware(): Middleware {
  return (req: EfwRequest, res: EfwResponse, next: NextFunction) => {
    if (!req.requestId) {
      req.requestId = Math.random().toString(36).substr(2, 9);
    }
    res.setHeader('X-Request-ID', req.requestId);
    next();
  };
}

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'txt': 'text/plain',
    'pdf': 'application/pdf'
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}