export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  onEvict?: (key: string, value: any) => void;
}

export interface CacheEntry<T> {
  value: T;
  expiry: number;
  accessed: number;
  created: number;
}

export class InMemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private options: Required<CacheOptions>;
  private timers = new Map<string, NodeJS.Timeout>();
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 300000, // 5 minutes default
      maxSize: options.maxSize || 1000,
      onEvict: options.onEvict || (() => {})
    };
  }

  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiry = now + (ttl || this.options.ttl);

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Check if we need to evict entries due to size limit
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiry,
      accessed: now,
      created: now
    };

    this.cache.set(key, entry);

    // Set up expiry timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl || this.options.ttl);

    this.timers.set(key, timer);
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }

    const now = Date.now();
    
    // Check if expired
    if (now > entry.expiry) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access time
    entry.accessed = now;
    this.hits++;
    
    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (entry) {
      this.options.onEvict(key, entry.value);
    }

    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    return this.cache.delete(key);
  }

  clear(): void {
    for (const [key, entry] of this.cache) {
      this.options.onEvict(key, entry.value);
    }

    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.timers.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now <= entry.expiry) {
        validKeys.push(key);
      } else {
        this.delete(key);
      }
    }

    return validKeys;
  }

  values(): T[] {
    const now = Date.now();
    const validValues: T[] = [];

    for (const [key, entry] of this.cache) {
      if (now <= entry.expiry) {
        validValues.push(entry.value);
      } else {
        this.delete(key);
      }
    }

    return validValues;
  }

  entries(): Array<[string, T]> {
    const now = Date.now();
    const validEntries: Array<[string, T]> = [];

    for (const [key, entry] of this.cache) {
      if (now <= entry.expiry) {
        validEntries.push([key, entry.value]);
      } else {
        this.delete(key);
      }
    }

    return validEntries;
  }

  stats(): {
    size: number;
    maxSize: number;
    ttl: number;
    entries: Array<{
      key: string;
      created: Date;
      accessed: Date;
      expiry: Date;
      age: number;
      ttl: number;
    }>;
  } {
    const now = Date.now();
    const entries = [];

    for (const [key, entry] of this.cache) {
      entries.push({
        key,
        created: new Date(entry.created),
        accessed: new Date(entry.accessed),
        expiry: new Date(entry.expiry),
        age: now - entry.created,
        ttl: entry.expiry - now
      });
    }

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
      entries
    };
  }

  getStats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessed < oldestAccess) {
        oldestAccess = entry.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
}

// Global cache instance
export const globalCache = new InMemoryCache();

// Utility functions
export function cache<T>(
  key: string, 
  factory: () => T | Promise<T>, 
  ttl?: number
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try to get from cache first
      const cached = globalCache.get(key);
      if (cached !== undefined) {
        resolve(cached);
        return;
      }

      // Generate new value
      const value = await factory();
      globalCache.set(key, value, ttl);
      resolve(value);
    } catch (error) {
      reject(error);
    }
  });
}

export function memoize<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn | Promise<TReturn>,
  keyGeneratorOrTtl?: ((...args: TArgs) => string) | number,
  ttl?: number
): (...args: TArgs) => Promise<TReturn> {
  let keyGenerator: ((...args: TArgs) => string) | undefined;
  let actualTtl: number | undefined;
  
  if (typeof keyGeneratorOrTtl === 'number') {
    actualTtl = keyGeneratorOrTtl;
  } else {
    keyGenerator = keyGeneratorOrTtl;
    actualTtl = ttl;
  }
  
  const fnCache = new InMemoryCache<TReturn>({ ttl: actualTtl });
  
  return async (...args: TArgs): Promise<TReturn> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    const cached = fnCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn(...args);
    fnCache.set(key, result);
    return result;
  };
}