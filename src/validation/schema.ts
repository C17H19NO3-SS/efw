import type { ValidationSchema, Middleware, EfwRequest, EfwResponse, NextFunction } from '../types';
import { ValidationError } from '../utils/errors';

export interface ValidateOptions {
  body?: ValidationSchema;
  query?: ValidationSchema;
  params?: ValidationSchema;
  headers?: ValidationSchema;
  abortEarly?: boolean;
  stripUnknown?: boolean;
}

export class SchemaValidator {
  private schema: ValidationSchema;
  private options: { abortEarly: boolean; stripUnknown: boolean };

  constructor(schema: ValidationSchema, options: { abortEarly?: boolean; stripUnknown?: boolean } = {}) {
    this.schema = schema;
    this.options = {
      abortEarly: options.abortEarly ?? true,
      stripUnknown: options.stripUnknown ?? false
    };
  }

  public validate(data: any): { value: any; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const result: any = this.options.stripUnknown ? {} : { ...data };

    for (const [field, rules] of Object.entries(this.schema)) {
      const value = data[field];
      const fieldErrors = this.validateField(field, value, rules);
      
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
        if (this.options.abortEarly) {
          break;
        }
      } else if (this.options.stripUnknown) {
        result[field] = value;
      }
    }

    return { value: result, errors };
  }

  private validateField(field: string, value: any, rules: ValidationSchema[string]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(new ValidationError(`${field} is required`, field, value));
      return errors;
    }

    // Skip other validations if value is not provided and not required
    if (value === undefined || value === null) {
      return errors;
    }

    // Type validation
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push(new ValidationError(`${field} must be of type ${rules.type}`, field, value));
        return errors;
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.min !== undefined && value.length < rules.min) {
        errors.push(new ValidationError(`${field} must be at least ${rules.min} characters long`, field, value));
      }
      
      if (rules.max !== undefined && value.length > rules.max) {
        errors.push(new ValidationError(`${field} must be at most ${rules.max} characters long`, field, value));
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(new ValidationError(`${field} format is invalid`, field, value));
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(new ValidationError(`${field} must be at least ${rules.min}`, field, value));
      }
      
      if (rules.max !== undefined && value > rules.max) {
        errors.push(new ValidationError(`${field} must be at most ${rules.max}`, field, value));
      }
    }

    // Array validations
    if (Array.isArray(value)) {
      if (rules.min !== undefined && value.length < rules.min) {
        errors.push(new ValidationError(`${field} must have at least ${rules.min} items`, field, value));
      }
      
      if (rules.max !== undefined && value.length > rules.max) {
        errors.push(new ValidationError(`${field} must have at most ${rules.max} items`, field, value));
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(new ValidationError(`${field} must be one of: ${rules.enum.join(', ')}`, field, value));
    }

    return errors;
  }
}

export function validate(options: ValidateOptions): Middleware {
  return (req: EfwRequest, res: EfwResponse, next: NextFunction) => {
    try {
      const errors: ValidationError[] = [];

      // Validate body
      if (options.body && req.body) {
        const validator = new SchemaValidator(options.body, options);
        const { errors: bodyErrors, value } = validator.validate(req.body);
        errors.push(...bodyErrors);
        if (bodyErrors.length === 0) {
          req.body = value;
        }
      }

    // Validate query parameters
    if (options.query && req.query) {
      const validator = new SchemaValidator(options.query, options);
      const { errors: queryErrors, value } = validator.validate(req.query);
      errors.push(...queryErrors);
      if (queryErrors.length === 0) {
        req.query = value;
      }
    }

    // Validate route parameters
    if (options.params && req.params) {
      const validator = new SchemaValidator(options.params, options);
      const { errors: paramsErrors, value } = validator.validate(req.params);
      errors.push(...paramsErrors);
      if (paramsErrors.length === 0) {
        req.params = value;
      }
    }

    // Validate headers
    if (options.headers && req.headers) {
      const validator = new SchemaValidator(options.headers, options);
      const { errors: headersErrors, value } = validator.validate(req.headers);
      errors.push(...headersErrors);
      if (headersErrors.length === 0) {
        req.headers = value;
      }
    }

      if (errors.length > 0) {
        const error = new ValidationError('Validation failed');
        (error as any).details = errors;
        return next(error);
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      next(error);
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  email: {
    type: 'string' as const,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required: true
  },
  
  password: {
    type: 'string' as const,
    min: 8,
    max: 128,
    required: true
  },
  
  strongPassword: {
    type: 'string' as const,
    min: 8,
    max: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    required: true
  },
  
  url: {
    type: 'string' as const,
    pattern: /^https?:\/\/.+/,
    required: true
  },
  
  mongoId: {
    type: 'string' as const,
    pattern: /^[0-9a-fA-F]{24}$/,
    required: true
  },
  
  uuid: {
    type: 'string' as const,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    required: true
  },
  
  phone: {
    type: 'string' as const,
    pattern: /^\+?[1-9]\d{1,14}$/,
    required: true
  },
  
  positiveNumber: {
    type: 'number' as const,
    min: 0,
    required: true
  },
  
  positiveInteger: {
    type: 'number' as const,
    min: 1,
    required: true
  }
};

// Helper functions for creating validation schemas
export function createSchema(fields: Record<string, Partial<ValidationSchema[string]>>): ValidationSchema {
  return fields as ValidationSchema;
}

export function optional(rules: ValidationSchema[string]): ValidationSchema[string] {
  return { ...rules, required: false };
}

export function required(rules: Omit<ValidationSchema[string], 'required'>): ValidationSchema[string] {
  return { ...rules, required: true };
}