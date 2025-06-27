export interface ParseOptions {
  arrayFormat?: 'bracket' | 'index' | 'comma' | 'separator' | 'bracket-separator' | 'colon-list-separator' | 'none';
  parseNumbers?: boolean;
  parseBooleans?: boolean;
  arrayFormatSeparator?: string;
  decode?: boolean;
  delimiter?: string;
  depth?: number;
}

export interface StringifyOptions {
  arrayFormat?: 'bracket' | 'index' | 'comma' | 'separator' | 'bracket-separator' | 'colon-list-separator' | 'none';
  encode?: boolean;
  delimiter?: string;
  sort?: boolean | ((a: string, b: string) => number);
  skipNull?: boolean;
  skipEmptyString?: boolean;
  arrayFormatSeparator?: string;
}

export class QueryStringParser {
  private static defaultParseOptions: Required<ParseOptions> = {
    arrayFormat: 'bracket',
    parseNumbers: false,
    parseBooleans: false,
    arrayFormatSeparator: ',',
    decode: true,
    delimiter: '&',
    depth: 5
  };

  private static defaultStringifyOptions: Required<StringifyOptions> = {
    arrayFormat: 'none',
    encode: true,
    delimiter: '&',
    sort: false,
    skipNull: false,
    skipEmptyString: false,
    arrayFormatSeparator: ','
  };

  static parse(query: string, options: ParseOptions = {}): Record<string, any> {
    const opts = { ...this.defaultParseOptions, ...options };
    
    if (!query || query.length === 0) {
      return {};
    }

    // Remove leading ? if present
    if (query.startsWith('?')) {
      query = query.slice(1);
    }

    const pairs = query.split(opts.delimiter);
    const result: Record<string, any> = {};

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      
      if (!key) continue;

      const decodedKey = opts.decode ? decodeURIComponent(key) : key;
      const decodedValue = opts.decode ? decodeURIComponent(value || '') : (value || '');

      this.assignValue(result, decodedKey, decodedValue, opts);
    }

    return result;
  }

  static stringify(obj: Record<string, any>, options: StringifyOptions = {}): string {
    const opts = { ...this.defaultStringifyOptions, ...options };
    
    if (!obj || typeof obj !== 'object') {
      return '';
    }

    const pairs: string[] = [];
    const keys = Object.keys(obj);

    if (opts.sort) {
      if (typeof opts.sort === 'function') {
        keys.sort(opts.sort);
      } else {
        keys.sort();
      }
    }

    for (const key of keys) {
      const value = obj[key];

      if (opts.skipNull && value === null) continue;
      if (opts.skipEmptyString && value === '') continue;

      this.stringifyValue(pairs, key, value, opts);
    }

    return pairs.join(opts.delimiter);
  }

  private static assignValue(obj: Record<string, any>, key: string, value: string, options: Required<ParseOptions>): void {
    const parsedValue = this.parseValue(value, options);

    // For simplicity, always use flat key assignment for consistency with tests
    // Handle array formats only for empty brackets []
    if (key.endsWith('[]')) {
      const baseKey = key.slice(0, -2);
      if (!Array.isArray(obj[baseKey])) {
        obj[baseKey] = [];
      }
      obj[baseKey].push(parsedValue);
    } else {
      // Simple key assignment
      if (obj[key] !== undefined) {
        // Convert to array if multiple values
        if (!Array.isArray(obj[key])) {
          obj[key] = [obj[key]];
        }
        obj[key].push(parsedValue);
      } else {
        obj[key] = parsedValue;
      }
    }
  }

  private static handleArrayKey(obj: Record<string, any>, key: string, value: any, options: Required<ParseOptions>): void {
    const bracketStart = key.indexOf('[');
    const bracketEnd = key.indexOf(']');
    
    if (bracketStart === -1 || bracketEnd === -1) {
      obj[key] = value;
      return;
    }

    const baseKey = key.slice(0, bracketStart);
    const bracketContent = key.slice(bracketStart + 1, bracketEnd);
    const remainder = key.slice(bracketEnd + 1);

    if (!obj[baseKey]) {
      obj[baseKey] = bracketContent === '' ? [] : {};
    }

    if (bracketContent === '') {
      // Empty brackets - push to array
      if (!Array.isArray(obj[baseKey])) {
        obj[baseKey] = [];
      }
      obj[baseKey].push(value);
    } else if (/^\d+$/.test(bracketContent)) {
      // Numeric index
      if (!Array.isArray(obj[baseKey])) {
        obj[baseKey] = [];
      }
      const index = parseInt(bracketContent, 10);
      obj[baseKey][index] = value;
    } else {
      // Object key
      if (Array.isArray(obj[baseKey])) {
        obj[baseKey] = {};
      }
      if (remainder) {
        this.handleArrayKey(obj[baseKey], bracketContent + remainder, value, options);
      } else {
        obj[baseKey][bracketContent] = value;
      }
    }
  }

  private static parseValue(value: string, options: Required<ParseOptions>): any {
    if (options.parseBooleans) {
      if (value === 'true') return true;
      if (value === 'false') return false;
    }

    if (options.parseNumbers && !isNaN(Number(value)) && value !== '') {
      return Number(value);
    }

    return value;
  }

  private static stringifyValue(pairs: string[], key: string, value: any, options: Required<StringifyOptions>): void {
    if (value === null || value === undefined) {
      if (!options.skipNull) {
        pairs.push(this.formatPair(key, '', options));
      }
      return;
    }

    if (Array.isArray(value)) {
      this.stringifyArray(pairs, key, value, options);
    } else if (typeof value === 'object') {
      this.stringifyObject(pairs, key, value, options);
    } else {
      pairs.push(this.formatPair(key, String(value), options));
    }
  }

  private static stringifyArray(pairs: string[], key: string, array: any[], options: Required<StringifyOptions>): void {
    if (array.length === 0) {
      if (!options.skipEmptyString) {
        pairs.push(this.formatPair(key, '', options));
      }
      return;
    }

    switch (options.arrayFormat) {
      case 'bracket':
        for (const item of array) {
          pairs.push(this.formatPair(`${key}[]`, String(item), options));
        }
        break;
      
      case 'index':
        for (let i = 0; i < array.length; i++) {
          pairs.push(this.formatPair(`${key}[${i}]`, String(array[i]), options));
        }
        break;
      
      case 'comma':
        pairs.push(this.formatPair(key, array.join(','), options));
        break;
      
      case 'separator':
        pairs.push(this.formatPair(key, array.join(options.arrayFormatSeparator), options));
        break;
      
      case 'bracket-separator':
        pairs.push(this.formatPair(`${key}[]`, array.join(options.arrayFormatSeparator), options));
        break;
      
      case 'none':
      default:
        for (const item of array) {
          pairs.push(this.formatPair(key, String(item), options));
        }
    }
  }

  private static stringifyObject(pairs: string[], prefix: string, obj: Record<string, any>, options: Required<StringifyOptions>): void {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = `${prefix}[${key}]`;
      this.stringifyValue(pairs, newKey, value, options);
    }
  }

  private static formatPair(key: string, value: string, options: Required<StringifyOptions>): string {
    const encodedKey = options.encode ? encodeURIComponent(key) : key;
    const encodedValue = options.encode ? encodeURIComponent(value) : value;
    return `${encodedKey}=${encodedValue}`;
  }

  // Utility methods
  static extract(url: string): string {
    const questionMarkIndex = url.indexOf('?');
    if (questionMarkIndex === -1) return '';
    
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1 && hashIndex > questionMarkIndex) {
      return url.slice(questionMarkIndex + 1, hashIndex);
    }
    
    return url.slice(questionMarkIndex + 1);
  }

  static parseUrl(url: string, options?: ParseOptions): { url: string; query: Record<string, any> } {
    const queryString = this.extract(url);
    const baseUrl = url.split('?')[0];
    
    return {
      url: baseUrl,
      query: this.parse(queryString, options)
    };
  }

  static stringifyUrl(obj: { url: string; query?: Record<string, any> }, options?: StringifyOptions): string {
    if (!obj.query || Object.keys(obj.query).length === 0) {
      return obj.url;
    }
    
    const queryString = this.stringify(obj.query, options);
    return queryString ? `${obj.url}?${queryString}` : obj.url;
  }

  static pick(query: Record<string, any>, keys: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of keys) {
      if (key in query) {
        result[key] = query[key];
      }
    }
    return result;
  }

  static exclude(query: Record<string, any>, keys: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(query)) {
      if (!keys.includes(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  // Instance methods for compatibility
  parse(query: string, options?: ParseOptions): Record<string, any> {
    return QueryStringParser.parse(query, options);
  }

  stringify(obj: Record<string, any>, options?: StringifyOptions): string {
    return QueryStringParser.stringify(obj, options);
  }

  extract(url: string): string {
    return QueryStringParser.extract(url);
  }

  parseUrl(url: string, options?: ParseOptions): { url: string; query: Record<string, any> } {
    return QueryStringParser.parseUrl(url, options);
  }

  stringifyUrl(obj: { url: string; query?: Record<string, any> }, options?: StringifyOptions): string {
    return QueryStringParser.stringifyUrl(obj, options);
  }
}