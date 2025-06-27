export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  baseURL?: string;
  credentials?: 'omit' | 'same-origin' | 'include';
  cache?: 'default' | 'no-cache' | 'reload' | 'force-cache' | 'only-if-cached';
  redirect?: 'follow' | 'error' | 'manual';
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  signal?: AbortSignal;
}

export interface ClientResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
  url: string;
  redirected: boolean;
}

export interface ClientError extends Error {
  response?: ClientResponse;
  request?: RequestOptions;
  status?: number;
  code?: string;
}

export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;
  private interceptors: {
    request: Array<(options: RequestOptions) => RequestOptions | Promise<RequestOptions>>;
    response: Array<(response: ClientResponse) => ClientResponse | Promise<ClientResponse>>;
    error: Array<(error: ClientError) => ClientError | Promise<ClientError>>;
  };

  constructor(baseURL: string = '', options: Partial<RequestOptions> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    this.defaultTimeout = options.timeout || 10000;
    this.defaultRetries = options.retries || 0;
    this.defaultRetryDelay = options.retryDelay || 1000;
    this.interceptors = {
      request: [],
      response: [],
      error: []
    };
  }

  // Interceptors
  addRequestInterceptor(
    interceptor: (options: RequestOptions) => RequestOptions | Promise<RequestOptions>
  ): void {
    this.interceptors.request.push(interceptor);
  }

  addResponseInterceptor(
    interceptor: (response: ClientResponse) => ClientResponse | Promise<ClientResponse>
  ): void {
    this.interceptors.response.push(interceptor);
  }

  addErrorInterceptor(
    interceptor: (error: ClientError) => ClientError | Promise<ClientError>
  ): void {
    this.interceptors.error.push(interceptor);
  }

  private async applyRequestInterceptors(options: RequestOptions): Promise<RequestOptions> {
    let result = options;
    for (const interceptor of this.interceptors.request) {
      result = await interceptor(result);
    }
    return result;
  }

  private async applyResponseInterceptors(response: ClientResponse): Promise<ClientResponse> {
    let result = response;
    for (const interceptor of this.interceptors.response) {
      result = await interceptor(result);
    }
    return result;
  }

  private async applyErrorInterceptors(error: ClientError): Promise<ClientError> {
    let result = error;
    for (const interceptor of this.interceptors.error) {
      result = await interceptor(result);
    }
    return result;
  }

  private buildURL(url: string, baseURL?: string): string {
    const base = baseURL || this.baseURL;
    if (!base) return url;
    if (url.startsWith('http')) return url;
    return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }

  private async makeRequest<T>(url: string, options: RequestOptions = {}): Promise<ClientResponse<T>> {
    const mergedOptions: RequestOptions = {
      method: 'GET',
      headers: { ...this.defaultHeaders, ...options.headers },
      timeout: this.defaultTimeout,
      retries: this.defaultRetries,
      retryDelay: this.defaultRetryDelay,
      credentials: 'same-origin',
      cache: 'default',
      redirect: 'follow',
      ...options
    };

    const processedOptions = await this.applyRequestInterceptors(mergedOptions);
    const fullURL = this.buildURL(url, processedOptions.baseURL);

    let lastError: ClientError | null = null;
    const maxAttempts = (processedOptions.retries || 0) + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), processedOptions.timeout);

        const signal = processedOptions.signal 
          ? AbortSignal.any([processedOptions.signal, controller.signal])
          : controller.signal;

        const fetchOptions: RequestInit = {
          method: processedOptions.method,
          headers: processedOptions.headers,
          credentials: processedOptions.credentials,
          cache: processedOptions.cache,
          redirect: processedOptions.redirect,
          referrer: processedOptions.referrer,
          referrerPolicy: processedOptions.referrerPolicy,
          signal
        };

        if (processedOptions.body !== undefined) {
          if (typeof processedOptions.body === 'string') {
            fetchOptions.body = processedOptions.body;
          } else if (processedOptions.body instanceof FormData || processedOptions.body instanceof URLSearchParams) {
            fetchOptions.body = processedOptions.body;
          } else {
            fetchOptions.body = JSON.stringify(processedOptions.body);
          }
        }

        const response = await fetch(fullURL, fetchOptions);
        clearTimeout(timeoutId);

        let data: T;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else if (contentType.includes('text/')) {
          data = await response.text() as T;
        } else {
          data = await response.blob() as T;
        }

        const clientResponse: ClientResponse<T> = {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          ok: response.ok,
          url: response.url,
          redirected: response.redirected
        };

        if (!response.ok) {
          const error: ClientError = new Error(`HTTP ${response.status}: ${response.statusText}`) as ClientError;
          error.response = clientResponse;
          error.request = processedOptions;
          error.status = response.status;
          error.code = 'HTTP_ERROR';
          throw error;
        }

        return await this.applyResponseInterceptors(clientResponse);

      } catch (error) {
        const clientError = error as ClientError;
        clientError.request = processedOptions;

        if (error instanceof Error && error.name === 'AbortError') {
          clientError.code = 'TIMEOUT';
          clientError.message = 'Request timeout';
        } else if (error instanceof TypeError) {
          clientError.code = 'NETWORK_ERROR';
          clientError.message = 'Network error';
        }

        lastError = await this.applyErrorInterceptors(clientError);

        // Don't retry on certain errors
        if (clientError.code === 'TIMEOUT' || 
            (clientError.status && clientError.status >= 400 && clientError.status < 500)) {
          break;
        }

        // Wait before retrying
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, processedOptions.retryDelay));
        }
      }
    }

    throw lastError;
  }

  // HTTP Methods
  async get<T = any>(url: string, options: Omit<RequestOptions, 'method'> = {}): Promise<ClientResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'GET' });
  }

  async post<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ClientResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'POST', body: data });
  }

  async put<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ClientResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'PUT', body: data });
  }

  async patch<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ClientResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'PATCH', body: data });
  }

  async delete<T = any>(url: string, options: Omit<RequestOptions, 'method'> = {}): Promise<ClientResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'DELETE' });
  }

  async head<T = any>(url: string, options: Omit<RequestOptions, 'method'> = {}): Promise<ClientResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'HEAD' });
  }

  async options<T = any>(url: string, options: Omit<RequestOptions, 'method'> = {}): Promise<ClientResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'OPTIONS' });
  }

  // Convenience methods
  async download(url: string, filename?: string): Promise<Blob> {
    const response = await this.get<Blob>(url, {
      headers: { Accept: '*/*' }
    });

    if (filename && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(response.data);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }

    return response.data;
  }

  async upload(url: string, file: File | FormData, onProgress?: (progress: number) => void): Promise<ClientResponse> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    }

    if (onProgress && typeof XMLHttpRequest !== 'undefined') {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            let data;
            try {
              data = JSON.parse(xhr.responseText);
            } catch {
              data = xhr.responseText;
            }

            resolve({
              data,
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers(),
              ok: true,
              url: xhr.responseURL || url,
              redirected: false
            });
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', this.buildURL(url));
        Object.entries(this.defaultHeaders).forEach(([key, value]) => {
          if (key !== 'Content-Type') { // Let browser set Content-Type for FormData
            xhr.setRequestHeader(key, value);
          }
        });
        xhr.send(formData);
      });
    }

    return this.post(url, formData, {
      headers: { ...this.defaultHeaders, 'Content-Type': undefined } // Remove Content-Type to let browser set it
    });
  }

  // Utility methods
  setDefaultHeader(name: string, value: string): void {
    this.defaultHeaders[name] = value;
  }

  removeDefaultHeader(name: string): void {
    delete this.defaultHeaders[name];
  }

  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  setRetries(retries: number, delay?: number): void {
    this.defaultRetries = retries;
    if (delay !== undefined) {
      this.defaultRetryDelay = delay;
    }
  }
}

// Create a default instance
export const apiClient = new ApiClient();

// Utility functions
export function createClient(baseURL: string, options?: Partial<RequestOptions>): ApiClient {
  return new ApiClient(baseURL, options);
}

export function isClientError(error: any): error is ClientError {
  return error && typeof error === 'object' && 'request' in error;
}