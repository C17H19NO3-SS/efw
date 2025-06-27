export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string | number;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    [key: string]: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ErrorDetails {
  field?: string;
  code: string;
  message: string;
  value?: any;
}

export class ResponseBuilder {
  private static defaultMeta = {
    version: '1.0.0'
  };

  static success<T>(data: T, meta?: Record<string, any>): ApiResponse<T> {
    const timestamp = new Date().toISOString();
    return {
      success: true,
      data,
      timestamp,
      meta: {
        timestamp,
        ...this.defaultMeta,
        ...meta
      }
    };
  }

  static error(
    message: string,
    code: string | number = 'GENERIC_ERROR', 
    details?: any, 
    meta?: Record<string, any>
  ): ApiResponse<never> {
    const timestamp = new Date().toISOString();
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp,
      meta: {
        timestamp,
        ...this.defaultMeta,
        ...meta
      }
    };
  }

  static paginated<T>(
    data: T[], 
    pagination: PaginationOptions,
    meta?: Record<string, any>
  ): ApiResponse<T[]> {
    const timestamp = new Date().toISOString();

    return {
      success: true,
      data,
      timestamp,
      pagination: pagination as any,
      meta: {
        timestamp,
        ...this.defaultMeta,
        ...meta
      }
    };
  }

  static created<T>(data: T, meta?: Record<string, any>): ApiResponse<T> {
    return this.success(data, { status: 'created', ...meta });
  }

  static updated<T>(data: T, meta?: Record<string, any>): ApiResponse<T> {
    return this.success(data, { status: 'updated', ...meta });
  }

  static deleted(meta?: Record<string, any>): ApiResponse<null> {
    return this.success(null, { status: 'deleted', ...meta });
  }

  static notFound(resource: string = 'Resource', meta?: Record<string, any>): ApiResponse<never> {
    return this.error(
      'NOT_FOUND',
      `${resource} not found`,
      undefined,
      meta
    );
  }

  static unauthorized(message: string = 'Unauthorized access', meta?: Record<string, any>): ApiResponse<never> {
    return this.error(
      'UNAUTHORIZED',
      message,
      undefined,
      meta
    );
  }

  static forbidden(message: string = 'Access forbidden', meta?: Record<string, any>): ApiResponse<never> {
    return this.error(
      'FORBIDDEN',
      message,
      undefined,
      meta
    );
  }

  static validationError(errors: ErrorDetails[], meta?: Record<string, any>): ApiResponse<never> {
    return this.error(
      'Validation failed',
      400,
      errors,
      meta
    );
  }

  static serverError(message: string = 'Internal server error', meta?: Record<string, any>): ApiResponse<never> {
    return this.error(
      'INTERNAL_ERROR',
      message,
      undefined,
      meta
    );
  }

  static badRequest(message: string = 'Bad request', details?: any, meta?: Record<string, any>): ApiResponse<never> {
    return this.error(
      'BAD_REQUEST',
      message,
      details,
      meta
    );
  }

  static conflict(message: string = 'Conflict', details?: any, meta?: Record<string, any>): ApiResponse<never> {
    return this.error(
      'CONFLICT',
      message,
      details,
      meta
    );
  }

  static tooManyRequests(
    message: string = 'Too many requests', 
    retryAfter?: number,
    meta?: Record<string, any>
  ): ApiResponse<never> {
    return this.error(
      'TOO_MANY_REQUESTS',
      message,
      retryAfter ? { retryAfter } : undefined,
      meta
    );
  }

  static custom<T>(
    success: boolean,
    data?: T,
    error?: { code: string; message: string; details?: any },
    pagination?: ApiResponse<T>['pagination'],
    meta?: Record<string, any>
  ): ApiResponse<T> {
    const response: ApiResponse<T> = {
      success,
      meta: {
        timestamp: new Date().toISOString(),
        ...this.defaultMeta,
        ...meta
      }
    };

    if (success && data !== undefined) {
      response.data = data;
    }

    if (!success && error) {
      response.error = error;
    }

    if (pagination) {
      response.pagination = pagination;
    }

    return response;
  }

  // Utility methods for working with responses
  static isSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
    return response.success === true;
  }

  static isError<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: false; error: NonNullable<ApiResponse<T>['error']> } {
    return response.success === false;
  }

  static getData<T>(response: ApiResponse<T>): T | undefined {
    return this.isSuccess(response) ? response.data : undefined;
  }

  static getError<T>(response: ApiResponse<T>): ApiResponse<T>['error'] | undefined {
    return this.isError(response) ? response.error : undefined;
  }

  static transformResponse<T, U>(
    response: ApiResponse<T>,
    transformer: (data: T) => U
  ): ApiResponse<U> {
    if (this.isSuccess(response)) {
      return {
        ...response,
        data: transformer(response.data)
      };
    }
    return response as ApiResponse<U>;
  }

  // Chain multiple responses
  static chain<T, U>(
    response: ApiResponse<T>,
    next: (data: T) => ApiResponse<U>
  ): ApiResponse<U> {
    if (this.isSuccess(response)) {
      return next(response.data);
    }
    return response as ApiResponse<U>;
  }

  // Merge multiple successful responses
  static merge<T extends Record<string, any>>(
    ...responses: ApiResponse<Partial<T>>[]
  ): ApiResponse<T> {
    const errors = responses.filter(r => !r.success);
    
    if (errors.length > 0) {
      return errors[0] as ApiResponse<T>;
    }

    const data = responses.reduce((acc, response) => {
      if (this.isSuccess(response) && response.data) {
        return { ...acc, ...response.data };
      }
      return acc;
    }, {} as T);

    return this.success(data);
  }

  // Set default meta values
  static setDefaults(meta: Record<string, any>): void {
    this.defaultMeta = { ...this.defaultMeta, ...meta };
  }

  // Get response status code based on response type
  static getStatusCode<T>(response: ApiResponse<T>): number {
    if (response.success) {
      if (response.meta?.status === 'created') return 201;
      if (response.meta?.status === 'deleted') return 204;
      return 200;
    }

    switch (response.error?.code) {
      case 'NOT_FOUND': return 404;
      case 'UNAUTHORIZED': return 401;
      case 'FORBIDDEN': return 403;
      case 'VALIDATION_ERROR': return 422;
      case 'BAD_REQUEST': return 400;
      case 'CONFLICT': return 409;
      case 'TOO_MANY_REQUESTS': return 429;
      case 'INTERNAL_ERROR': return 500;
      default: return 500;
    }
  }
}

// Convenience functions
export const success = ResponseBuilder.success.bind(ResponseBuilder);
export const error = ResponseBuilder.error.bind(ResponseBuilder);
export const paginated = ResponseBuilder.paginated.bind(ResponseBuilder);
export const created = ResponseBuilder.created.bind(ResponseBuilder);
export const updated = ResponseBuilder.updated.bind(ResponseBuilder);
export const deleted = ResponseBuilder.deleted.bind(ResponseBuilder);
export const notFound = ResponseBuilder.notFound.bind(ResponseBuilder);
export const unauthorized = ResponseBuilder.unauthorized.bind(ResponseBuilder);
export const forbidden = ResponseBuilder.forbidden.bind(ResponseBuilder);
export const validationError = ResponseBuilder.validationError.bind(ResponseBuilder);
export const serverError = ResponseBuilder.serverError.bind(ResponseBuilder);
export const badRequest = ResponseBuilder.badRequest.bind(ResponseBuilder);
export const conflict = ResponseBuilder.conflict.bind(ResponseBuilder);
export const tooManyRequests = ResponseBuilder.tooManyRequests.bind(ResponseBuilder);