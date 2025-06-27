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
    const value = this.get(key, defaultValue?.toString());
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
    }
    return parsed;
  }

  static getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.get(key, defaultValue?.toString());
    if (typeof value === 'boolean') return value;
    return value?.toLowerCase() === 'true';
  }

  static getArray(key: string, separator = ',', defaultValue?: string[]): string[] {
    const value = this.get(key, defaultValue?.join(separator));
    if (Array.isArray(value)) return value;
    return value.split(separator).map(s => s.trim());
  }

  static has(key: string): boolean {
    return process.env[key] !== undefined;
  }

  static clearCache(): void {
    this.cache.clear();
  }

  private static parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    return value;
  }
}