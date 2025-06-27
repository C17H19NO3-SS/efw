export interface CookieOptions {
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number; // in seconds
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  priority?: 'low' | 'medium' | 'high';
}

export interface ParsedCookie {
  name: string;
  value: string;
  options?: CookieOptions;
}

export class CookieHelper {
  static serialize(name: string, value: string, options: CookieOptions = {}): string {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (options.domain) {
      cookie += `; Domain=${options.domain}`;
    }

    if (options.path) {
      cookie += `; Path=${options.path}`;
    }

    if (options.expires) {
      cookie += `; Expires=${options.expires.toUTCString()}`;
    }

    if (options.maxAge !== undefined) {
      cookie += `; Max-Age=${options.maxAge}`;
    }

    if (options.secure) {
      cookie += '; Secure';
    }

    if (options.httpOnly) {
      cookie += '; HttpOnly';
    }

    if (options.sameSite) {
      cookie += `; SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`;
    }

    if (options.priority) {
      cookie += `; Priority=${options.priority}`;
    }

    return cookie;
  }

  static parse(cookieHeader: string): Record<string, any> {
    const cookies: Record<string, any> = {};

    if (!cookieHeader) {
      return cookies;
    }

    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        const name = decodeURIComponent(parts[0].trim());
        const value = decodeURIComponent(parts[1].trim());
        // Convert numeric values
        if (/^\d+$/.test(value)) {
          cookies[name] = parseInt(value, 10);
        } else {
          cookies[name] = value;
        }
      } else if (parts.length === 1) {
        // Handle boolean attributes like httpOnly, secure
        const attribute = parts[0].trim();
        if (['httpOnly', 'secure', 'sameSite'].includes(attribute)) {
          cookies[attribute] = true;
        }
      }
    });

    return cookies;
  }

  static parseDetailed(cookieHeader: string): ParsedCookie[] {
    const cookies: ParsedCookie[] = [];

    if (!cookieHeader) {
      return cookies;
    }

    const cookieStrings = cookieHeader.split(';');
    
    for (const cookieString of cookieStrings) {
      const trimmed = cookieString.trim();
      const equalIndex = trimmed.indexOf('=');
      
      if (equalIndex === -1) continue;
      
      const name = decodeURIComponent(trimmed.substring(0, equalIndex).trim());
      const value = decodeURIComponent(trimmed.substring(equalIndex + 1).trim());
      
      cookies.push({ name, value });
    }

    return cookies;
  }

  static createSecure(name: string, value: string, options: Omit<CookieOptions, 'secure' | 'httpOnly' | 'sameSite'> = {}): string {
    return this.serialize(name, value, {
      ...options,
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    });
  }

  static createSession(name: string, value: string, options: Omit<CookieOptions, 'expires' | 'maxAge'> = {}): string {
    return this.serialize(name, value, options);
  }

  static createPersistent(name: string, value: string, days: number = 30, options: CookieOptions = {}): string {
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    
    return this.serialize(name, value, {
      ...options,
      expires
    });
  }

  static createExpired(name: string, options: Omit<CookieOptions, 'expires' | 'maxAge'> = {}): string {
    const expires = new Date(0); // January 1, 1970
    
    return this.serialize(name, '', {
      ...options,
      expires
    });
  }

  static isExpired(cookie: ParsedCookie): boolean {
    if (!cookie.options?.expires) {
      return false;
    }
    
    return new Date() > cookie.options.expires;
  }

  static getValue(cookies: Record<string, string>, name: string, defaultValue?: string): string | undefined {
    return cookies[name] ?? defaultValue;
  }

  static getNumber(cookies: Record<string, string>, name: string, defaultValue?: number): number | undefined {
    const value = cookies[name];
    if (value === undefined) return defaultValue;
    
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  static getBoolean(cookies: Record<string, string>, name: string, defaultValue?: boolean): boolean | undefined {
    const value = cookies[name];
    if (value === undefined) return defaultValue;
    
    return value.toLowerCase() === 'true';
  }

  static getJSON<T>(cookies: Record<string, string>, name: string, defaultValue?: T): T | undefined {
    const value = cookies[name];
    if (value === undefined) return defaultValue;
    
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }

  static setJSON(name: string, value: any, options: CookieOptions = {}): string {
    return this.serialize(name, JSON.stringify(value), options);
  }

  static buildCookieJar(cookies: Array<{ name: string; value: string; options?: CookieOptions }>): string[] {
    return cookies.map(cookie => this.serialize(cookie.name, cookie.value, cookie.options));
  }

  static validateCookieName(name: string): boolean {
    // Cookie names cannot contain certain characters
    const invalidChars = /[()<>@,;:\\"\/\[\]?={}\s\t]/;
    return !invalidChars.test(name) && name.length > 0;
  }

  static validateCookieValue(value: string): boolean {
    // Cookie values cannot contain certain characters (unless quoted)
    const invalidChars = /[,;\\"]/;
    return !invalidChars.test(value);
  }

  static estimateSize(name: string, value: string, options: CookieOptions = {}): number {
    const cookieString = this.serialize(name, value, options);
    return new Blob([cookieString]).size;
  }

  static isSecure(cookie: ParsedCookie): boolean {
    return cookie.options?.secure === true;
  }

  static isHttpOnly(cookie: ParsedCookie): boolean {
    return cookie.options?.httpOnly === true;
  }

  static getSameSite(cookie: ParsedCookie): string | undefined {
    return cookie.options?.sameSite;
  }
}