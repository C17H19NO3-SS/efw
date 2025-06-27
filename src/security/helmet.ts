import type { Middleware, EfwRequest, EfwResponse, NextFunction } from '../types';

export interface HelmetOptions {
  contentSecurityPolicy?: ContentSecurityPolicyOptions | boolean;
  crossOriginEmbedderPolicy?: boolean;
  crossOriginOpenerPolicy?: CrossOriginOpenerPolicyOptions | boolean;
  crossOriginResourcePolicy?: CrossOriginResourcePolicyOptions | boolean;
  dnsPrefetchControl?: DnsPrefetchControlOptions | boolean;
  frameguard?: FrameguardOptions | boolean;
  hidePoweredBy?: boolean;
  hsts?: HstsOptions | boolean;
  ieNoOpen?: boolean;
  noSniff?: boolean;
  originAgentCluster?: boolean;
  permittedCrossDomainPolicies?: PermittedCrossDomainPoliciesOptions | boolean;
  referrerPolicy?: ReferrerPolicyOptions | boolean;
  xssFilter?: boolean;
}

export interface ContentSecurityPolicyOptions {
  directives?: Record<string, string[]>;
  reportOnly?: boolean;
  useDefaults?: boolean;
}

export interface CrossOriginOpenerPolicyOptions {
  policy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
}

export interface CrossOriginResourcePolicyOptions {
  policy?: 'same-origin' | 'same-site' | 'cross-origin';
}

export interface DnsPrefetchControlOptions {
  allow?: boolean;
}

export interface FrameguardOptions {
  action?: 'deny' | 'sameorigin';
  domain?: string;
}

export interface HstsOptions {
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}

export interface PermittedCrossDomainPoliciesOptions {
  permittedPolicies?: 'none' | 'master-only' | 'by-content-type' | 'all';
}

export interface ReferrerPolicyOptions {
  policy?: string | string[];
}

export class HelmetMiddleware {
  private options: HelmetOptions;

  constructor(options: HelmetOptions = {}) {
    this.options = {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'base-uri': ["'self'"],
          'block-all-mixed-content': [],
          'font-src': ["'self'", 'https:', 'data:'],
          'frame-ancestors': ["'self'"],
          'img-src': ["'self'", 'data:'],
          'object-src': ["'none'"],
          'script-src': ["'self'"],
          'script-src-attr': ["'none'"],
          'style-src': ["'self'", 'https:', "'unsafe-inline'"],
          'upgrade-insecure-requests': []
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'sameorigin' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 15552000, // 180 days
        includeSubDomains: true,
        preload: false
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true,
      ...options
    };
  }

  private setContentSecurityPolicy(res: EfwResponse): void {
    const csp = this.options.contentSecurityPolicy;
    if (!csp) return;

    if (typeof csp === 'boolean' && !csp) return;

    const cspOptions = typeof csp === 'object' ? csp : {};
    const directives = cspOptions.directives || {};

    const cspValue = Object.entries(directives)
      .map(([key, values]) => {
        if (values.length === 0) return key;
        return `${key} ${values.join(' ')}`;
      })
      .join('; ');

    const headerName = cspOptions.reportOnly 
      ? 'Content-Security-Policy-Report-Only' 
      : 'Content-Security-Policy';

    res.setHeader(headerName, cspValue);
  }

  private setCrossOriginEmbedderPolicy(res: EfwResponse): void {
    if (this.options.crossOriginEmbedderPolicy) {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }
  }

  private setCrossOriginOpenerPolicy(res: EfwResponse): void {
    const coep = this.options.crossOriginOpenerPolicy;
    if (!coep) return;

    if (typeof coep === 'boolean' && !coep) return;

    const policy = typeof coep === 'object' ? coep.policy : 'same-origin';
    res.setHeader('Cross-Origin-Opener-Policy', policy);
  }

  private setCrossOriginResourcePolicy(res: EfwResponse): void {
    const corp = this.options.crossOriginResourcePolicy;
    if (!corp) return;

    if (typeof corp === 'boolean' && !corp) return;

    const policy = typeof corp === 'object' ? corp.policy : 'same-origin';
    res.setHeader('Cross-Origin-Resource-Policy', policy);
  }

  private setDnsPrefetchControl(res: EfwResponse): void {
    const dns = this.options.dnsPrefetchControl;
    if (!dns) return;

    if (typeof dns === 'boolean' && !dns) return;

    const allow = typeof dns === 'object' ? dns.allow : false;
    res.setHeader('X-DNS-Prefetch-Control', allow ? 'on' : 'off');
  }

  private setFrameguard(res: EfwResponse): void {
    const frameguard = this.options.frameguard;
    if (!frameguard) return;

    if (typeof frameguard === 'boolean' && !frameguard) return;

    const options = typeof frameguard === 'object' ? frameguard : { action: 'sameorigin' };
    
    if (options.action === 'deny') {
      res.setHeader('X-Frame-Options', 'DENY');
    } else if (options.action === 'sameorigin') {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    } else if (options.domain) {
      res.setHeader('X-Frame-Options', `ALLOW-FROM ${options.domain}`);
    }
  }

  private setHidePoweredBy(res: EfwResponse): void {
    if (this.options.hidePoweredBy) {
      res.setHeader('X-Powered-By', '');
    }
  }

  private setHsts(res: EfwResponse): void {
    const hsts = this.options.hsts;
    if (!hsts) return;

    if (typeof hsts === 'boolean' && !hsts) return;

    const options = typeof hsts === 'object' ? hsts : { maxAge: 15552000 };
    let value = `max-age=${options.maxAge}`;

    if (options.includeSubDomains) {
      value += '; includeSubDomains';
    }

    if (options.preload) {
      value += '; preload';
    }

    res.setHeader('Strict-Transport-Security', value);
  }

  private setIeNoOpen(res: EfwResponse): void {
    if (this.options.ieNoOpen) {
      res.setHeader('X-Download-Options', 'noopen');
    }
  }

  private setNoSniff(res: EfwResponse): void {
    if (this.options.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }

  private setOriginAgentCluster(res: EfwResponse): void {
    if (this.options.originAgentCluster) {
      res.setHeader('Origin-Agent-Cluster', '?1');
    }
  }

  private setPermittedCrossDomainPolicies(res: EfwResponse): void {
    const pcdp = this.options.permittedCrossDomainPolicies;
    if (!pcdp) return;

    if (typeof pcdp === 'boolean' && !pcdp) return;

    const policy = typeof pcdp === 'object' ? pcdp.permittedPolicies : 'none';
    res.setHeader('X-Permitted-Cross-Domain-Policies', policy);
  }

  private setReferrerPolicy(res: EfwResponse): void {
    const rp = this.options.referrerPolicy;
    if (!rp) return;

    if (typeof rp === 'boolean' && !rp) return;

    const policy = typeof rp === 'object' ? rp.policy : 'no-referrer';
    const policyValue = Array.isArray(policy) ? policy.join(', ') : policy;
    res.setHeader('Referrer-Policy', policyValue);
  }

  private setXssFilter(res: EfwResponse): void {
    if (this.options.xssFilter) {
      res.setHeader('X-XSS-Protection', '0');
    }
  }

  public middleware(): Middleware {
    return (req: EfwRequest, res: EfwResponse, next: NextFunction) => {
      this.setContentSecurityPolicy(res);
      this.setCrossOriginEmbedderPolicy(res);
      this.setCrossOriginOpenerPolicy(res);
      this.setCrossOriginResourcePolicy(res);
      this.setDnsPrefetchControl(res);
      this.setFrameguard(res);
      this.setHidePoweredBy(res);
      this.setHsts(res);
      this.setIeNoOpen(res);
      this.setNoSniff(res);
      this.setOriginAgentCluster(res);
      this.setPermittedCrossDomainPolicies(res);
      this.setReferrerPolicy(res);
      this.setXssFilter(res);

      next();
    };
  }
}

export function createHelmetMiddleware(options: HelmetOptions = {}): Middleware {
  const helmetMiddleware = new HelmetMiddleware(options);
  return helmetMiddleware.middleware();
}

export const helmet = createHelmetMiddleware;