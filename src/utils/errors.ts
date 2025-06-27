export class FrameworkError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = 'FrameworkError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends FrameworkError {
  public field?: string;
  public value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message, 400);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class AuthenticationError extends FrameworkError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends FrameworkError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends FrameworkError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends FrameworkError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends FrameworkError {
  public retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class DatabaseError extends FrameworkError {
  public query?: string;

  constructor(message: string, query?: string) {
    super(message, 500);
    this.name = 'DatabaseError';
    this.query = query;
  }
}

export class ExternalServiceError extends FrameworkError {
  public service?: string;
  public originalError?: Error;

  constructor(message: string, service?: string, originalError?: Error) {
    super(message, 503);
    this.name = 'ExternalServiceError';
    this.service = service;
    this.originalError = originalError;
  }
}

export interface ErrorResponse {
  error: {
    name: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    field?: string;
    value?: any;
    retryAfter?: number;
    service?: string;
  };
  stack?: string;
}

export function formatError(error: Error, path?: string, includeStack: boolean = false): ErrorResponse {
  const timestamp = new Date().toISOString();
  
  if (error instanceof FrameworkError) {
    const response: ErrorResponse = {
      error: {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        timestamp,
        path
      }
    };

    if (error instanceof ValidationError) {
      response.error.field = error.field;
      response.error.value = error.value;
    }

    if (error instanceof RateLimitError && error.retryAfter) {
      response.error.retryAfter = error.retryAfter;
    }

    if (error instanceof ExternalServiceError && error.service) {
      response.error.service = error.service;
    }

    if (includeStack && error.stack) {
      response.stack = error.stack;
    }

    return response;
  }

  return {
    error: {
      name: 'InternalServerError',
      message: 'An unexpected error occurred',
      statusCode: 500,
      timestamp,
      path
    },
    ...(includeStack && error.stack && { stack: error.stack })
  };
}

export function isOperationalError(error: Error): boolean {
  if (error instanceof FrameworkError) {
    return error.isOperational;
  }
  return false;
}

export class ErrorHandler {
  private includeStack: boolean;

  constructor(includeStack: boolean = false) {
    this.includeStack = includeStack;
  }

  public handle(error: Error, path?: string): ErrorResponse {
    if (!isOperationalError(error)) {
      console.error('Non-operational error:', error);
    }

    return formatError(error, path, this.includeStack);
  }

  public handleAsync(fn: Function) {
    return async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        throw error;
      }
    };
  }
}