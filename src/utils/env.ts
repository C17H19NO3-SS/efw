export class EnvHelper {
  private static cache = new Map<string, any>();

  static get<T = string>(key: string, defaultValue?: T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const value = process.env[key];
    
    if (value === undefined) {
      if (defaultValue !== undefined) {
        this.cache.set(key, defaultValue);
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is not defined`);
    }

    const parsed = this.parseValue(value);
    this.cache.set(key, parsed);
    return parsed;
  }

  static getString(key: string, defaultValue?: string): string {
    return this.get<string>(key, defaultValue);
  }

  static getNumber(key: string, defaultValue?: number): number {
    if (defaultValue !== undefined && !this.has(key)) {
      return defaultValue;
    }
    const value = this.get(key);
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
    }
    return parsed;
  }

  static getBoolean(key: string, defaultValue?: boolean): boolean {
    if (defaultValue !== undefined && !this.has(key)) {
      return defaultValue;
    }
    const value = this.get(key);
    if (typeof value === 'boolean') return value;
    return value?.toLowerCase() === 'true';
  }

  static getArray(key: string, defaultValue?: string[]): string[] {
    // Always check process.env directly, don't rely on cache
    const envValue = process.env[key];
    if (envValue === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    
    if (typeof envValue === 'string' && envValue.length > 0) {
      return envValue.split(',').map(s => s.trim());
    }
    
    return defaultValue !== undefined ? defaultValue : [];
  }

  static has(key: string): boolean {
    return process.env[key] !== undefined;
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static isDevelopment(): boolean {
    this.clearCache(); // Clear cache to get fresh NODE_ENV
    return this.getString('NODE_ENV', 'development') === 'development';
  }

  static isProduction(): boolean {
    this.clearCache(); // Clear cache to get fresh NODE_ENV
    return this.getString('NODE_ENV', 'development') === 'production';
  }

  static isTest(): boolean {
    this.clearCache(); // Clear cache to get fresh NODE_ENV
    return this.getString('NODE_ENV', 'development') === 'test';
  }

  private static parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    return value;
  }
}