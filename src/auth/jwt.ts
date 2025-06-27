import jwt from 'jsonwebtoken';
import type { JwtOptions, Middleware, FrameworkRequest, FrameworkResponse, NextFunction } from '../types';
import { AuthenticationError, AuthorizationError } from '../utils/errors';

export interface JwtPayload {
  [key: string]: any;
  exp?: number;
  iat?: number;
  sub?: string;
}

export class JwtAuth {
  private secret: string;
  private options: Omit<JwtOptions, 'secret'>;

  constructor(options: JwtOptions) {
    this.secret = options.secret;
    this.options = {
      expiresIn: options.expiresIn || '1h',
      algorithm: options.algorithm || 'HS256'
    };
  }

  public sign(payload: Record<string, any>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.options.expiresIn,
      algorithm: this.options.algorithm as jwt.Algorithm
    });
  }

  public verify(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.secret, {
        algorithms: [this.options.algorithm as jwt.Algorithm]
      }) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      } else {
        throw new AuthenticationError('Token verification failed');
      }
    }
  }

  public decode(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  public middleware(): Middleware {
    return (req: FrameworkRequest, res: FrameworkResponse, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          throw new AuthenticationError('No token provided');
        }

        const payload = this.verify(token);
        req.user = payload;
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  public optionalMiddleware(): Middleware {
    return (req: FrameworkRequest, res: FrameworkResponse, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        
        if (token) {
          const payload = this.verify(token);
          req.user = payload;
        }
        
        next();
      } catch (error) {
        next();
      }
    };
  }

  private extractToken(req: FrameworkRequest): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    const tokenFromQuery = req.query.token;
    if (tokenFromQuery) {
      return tokenFromQuery;
    }
    
    const tokenFromCookie = req.cookies.token;
    if (tokenFromCookie) {
      return tokenFromCookie;
    }
    
    return null;
  }
}

export function createJwtMiddleware(options: JwtOptions): Middleware {
  const jwtAuth = new JwtAuth(options);
  return jwtAuth.middleware();
}

export function createOptionalJwtMiddleware(options: JwtOptions): Middleware {
  const jwtAuth = new JwtAuth(options);
  return jwtAuth.optionalMiddleware();
}

export function requireAuth(): Middleware {
  return (req: FrameworkRequest, res: FrameworkResponse, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    next();
  };
}

export function requireRole(role: string): Middleware {
  return (req: FrameworkRequest, res: FrameworkResponse, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!req.user.role || req.user.role !== role) {
      throw new AuthorizationError(`Role '${role}' required`);
    }

    next();
  };
}

export function requireRoles(roles: string[]): Middleware {
  return (req: FrameworkRequest, res: FrameworkResponse, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      throw new AuthorizationError(`One of the following roles required: ${roles.join(', ')}`);
    }

    next();
  };
}

export function requirePermission(permission: string): Middleware {
  return (req: FrameworkRequest, res: FrameworkResponse, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      throw new AuthorizationError(`Permission '${permission}' required`);
    }

    next();
  };
}