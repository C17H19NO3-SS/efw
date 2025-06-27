import type { CorsOptions, Middleware, FrameworkRequest, FrameworkResponse, NextFunction } from '../types';

export interface ExtendedCorsOptions extends CorsOptions {
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export class CorsMiddleware {
  private options: ExtendedCorsOptions;

  constructor(options: ExtendedCorsOptions = {}) {
    this.options = {
      origin: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
      credentials: false,
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204,
      ...options
    };
  }

  private isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return true;

    if (this.options.origin === true) {
      return true;
    }

    if (this.options.origin === false) {
      return false;
    }

    if (typeof this.options.origin === 'string') {
      return this.options.origin === origin;
    }

    if (Array.isArray(this.options.origin)) {
      return this.options.origin.includes(origin);
    }

    if (typeof this.options.origin === 'function') {
      return this.options.origin(origin);
    }

    return false;
  }

  private setHeaders(res: FrameworkResponse, origin: string | undefined): void {
    if (this.isOriginAllowed(origin)) {
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }

    if (this.options.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (this.options.methods && this.options.methods.length > 0) {
      res.setHeader('Access-Control-Allow-Methods', this.options.methods.join(', '));
    }

    if (this.options.allowedHeaders && this.options.allowedHeaders.length > 0) {
      res.setHeader('Access-Control-Allow-Headers', this.options.allowedHeaders.join(', '));
    }

    if (this.options.maxAge) {
      res.setHeader('Access-Control-Max-Age', String(this.options.maxAge));
    }
  }

  public middleware(): Middleware {
    return (req: FrameworkRequest, res: FrameworkResponse, next: NextFunction) => {
      const origin = req.headers.origin;

      this.setHeaders(res, origin);

      if (req.method === 'OPTIONS') {
        if (this.options.preflightContinue) {
          next();
        } else {
          res.status(this.options.optionsSuccessStatus || 204).send('');
        }
      } else {
        next();
      }
    };
  }
}

export function createCorsMiddleware(options: ExtendedCorsOptions = {}): Middleware {
  const corsMiddleware = new CorsMiddleware(options);
  return corsMiddleware.middleware();
}

export const cors = createCorsMiddleware;