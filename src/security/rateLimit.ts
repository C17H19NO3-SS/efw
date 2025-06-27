import type { RateLimitOptions, Middleware, EfwRequest, EfwResponse, NextFunction } from '../types';
import { RateLimitError } from '../utils/errors';

export interface ExtendedRateLimitOptions extends RateLimitOptions {
  keyGenerator?: (req: EfwRequest) => string;
  handler?: (req: EfwRequest, res: EfwResponse, next: NextFunction) => void;
  onLimitReached?: (req: EfwRequest, res: EfwResponse) => void;
  skip?: (req: EfwRequest) => boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  requestWasSuccessful?: (req: EfwRequest, res: EfwResponse) => boolean;
  headers?: boolean;
  draft_polli_ratelimit_headers?: boolean;
}

export interface RateLimitStore {
  incr(key: string): Promise<{ totalHits: number; timeToExpire: number }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  resetAll(): Promise<void>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private hits: Map<string, { count: number; resetTime: number }> = new Map();

  async incr(key: string): Promise<{ totalHits: number; timeToExpire: number }> {
    const now = Date.now();
    const existing = this.hits.get(key);
    
    if (!existing || now > existing.resetTime) {
      this.hits.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute default
      return { totalHits: 1, timeToExpire: 60000 };
    }
    
    existing.count++;
    this.hits.set(key, existing);
    
    return {
      totalHits: existing.count,
      timeToExpire: existing.resetTime - now
    };
  }

  async decrement(key: string): Promise<void> {
    const existing = this.hits.get(key);
    if (existing && existing.count > 0) {
      existing.count--;
      if (existing.count <= 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, existing);
      }
    }
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }

  async resetAll(): Promise<void> {
    this.hits.clear();
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.hits.entries()) {
      if (now > value.resetTime) {
        this.hits.delete(key);
      }
    }
  }
}

export class RateLimitMiddleware {
  private store: RateLimitStore;
  private options: Required<ExtendedRateLimitOptions>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: ExtendedRateLimitOptions) {
    this.store = new MemoryRateLimitStore();
    
    this.options = {
      windowMs: options.windowMs,
      max: options.max,
      message: options.message || 'Too many requests from this IP, please try again later.',
      statusCode: options.statusCode || 429,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
      handler: options.handler || this.defaultHandler,
      onLimitReached: options.onLimitReached || (() => {}),
      skip: options.skip || (() => false),
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      requestWasSuccessful: options.requestWasSuccessful || this.defaultRequestWasSuccessful,
      headers: options.headers !== false,
      draft_polli_ratelimit_headers: options.draft_polli_ratelimit_headers || false
    };

    // Start cleanup interval for memory store
    if (this.store instanceof MemoryRateLimitStore) {
      this.cleanupInterval = setInterval(() => {
        (this.store as MemoryRateLimitStore).cleanup();
      }, this.options.windowMs);
    }
  }

  private defaultKeyGenerator(req: EfwRequest): string {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.headers['cf-connecting-ip'] || 
           'unknown';
  }

  private defaultHandler(req: EfwRequest, res: EfwResponse, next: NextFunction): void {
    throw new RateLimitError(this.options.message, this.options.windowMs / 1000);
  }

  private defaultRequestWasSuccessful(req: EfwRequest, res: EfwResponse): boolean {
    return res.statusCode < 400;
  }

  private setHeaders(res: EfwResponse, totalHits: number, timeToExpire: number): void {
    if (!this.options.headers) return;

    const windowMs = this.options.windowMs;
    const max = this.options.max;
    const remaining = Math.max(0, max - totalHits);
    const resetTime = new Date(Date.now() + timeToExpire);

    // Standard rate limit headers
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetTime.getTime() / 1000)));

    if (this.options.draft_polli_ratelimit_headers) {
      // Draft IETF RateLimit headers
      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(Math.ceil(timeToExpire / 1000)));
    }

    if (totalHits >= max) {
      res.setHeader('Retry-After', String(Math.ceil(timeToExpire / 1000)));
    }
  }

  public middleware(): Middleware {
    return async (req: EfwRequest, res: EfwResponse, next: NextFunction) => {
      if (this.options.skip(req)) {
        return next();
      }

      const key = this.options.keyGenerator(req);
      
      try {
        const { totalHits, timeToExpire } = await this.store.incr(key);
        
        this.setHeaders(res, totalHits, timeToExpire);

        if (totalHits > this.options.max) {
          this.options.onLimitReached(req, res);
          return this.options.handler(req, res, next);
        }

        // Store original end function to handle successful/failed requests
        const originalEnd = (res as any).end;
        (res as any).end = (...args: any[]) => {
          const wasSuccessful = this.options.requestWasSuccessful(req, res);
          
          if (this.options.skipSuccessfulRequests && wasSuccessful) {
            this.store.decrement(key);
          } else if (this.options.skipFailedRequests && !wasSuccessful) {
            this.store.decrement(key);
          }
          
          return originalEnd.apply(res, args);
        };

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  public resetKey(key: string): Promise<void> {
    return this.store.resetKey(key);
  }

  public resetAll(): Promise<void> {
    return this.store.resetAll();
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export function createRateLimitMiddleware(options: ExtendedRateLimitOptions): Middleware {
  const rateLimitMiddleware = new RateLimitMiddleware(options);
  return rateLimitMiddleware.middleware();
}

export function createBasicRateLimit(requestsPerMinute: number = 100): Middleware {
  return createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: requestsPerMinute,
    message: `Too many requests, maximum ${requestsPerMinute} requests per minute allowed.`
  });
}

export function createStrictRateLimit(requestsPerMinute: number = 10): Middleware {
  return createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: requestsPerMinute,
    message: `Rate limit exceeded, maximum ${requestsPerMinute} requests per minute allowed.`,
    statusCode: 429
  });
}

export const rateLimit = createRateLimitMiddleware;