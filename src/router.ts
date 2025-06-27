import type { Route, Handler, FrameworkRequest, FrameworkResponse, NextFunction } from './types';

export class Router {
  private routes: Route[] = [];

  private pathToRegex(path: string): { pattern: RegExp; keys: string[] } {
    const keys: string[] = [];
    const pattern = path
      .replace(/\/:([^\/]+)/g, (match, key) => {
        keys.push(key);
        return '/([^/]+)';
      })
      .replace(/\//g, '\\/');
    
    return {
      pattern: new RegExp(`^${pattern}$`),
      keys
    };
  }

  public addRoute(method: string, path: string, ...handlers: Handler[]): void {
    const { pattern, keys } = this.pathToRegex(path);
    
    this.routes.push({
      method: method.toUpperCase(),
      path,
      pattern,
      keys,
      handlers
    });
  }

  public get(path: string, ...handlers: Handler[]): void {
    this.addRoute('GET', path, ...handlers);
  }

  public post(path: string, ...handlers: Handler[]): void {
    this.addRoute('POST', path, ...handlers);
  }

  public put(path: string, ...handlers: Handler[]): void {
    this.addRoute('PUT', path, ...handlers);
  }

  public delete(path: string, ...handlers: Handler[]): void {
    this.addRoute('DELETE', path, ...handlers);
  }

  public patch(path: string, ...handlers: Handler[]): void {
    this.addRoute('PATCH', path, ...handlers);
  }

  public options(path: string, ...handlers: Handler[]): void {
    this.addRoute('OPTIONS', path, ...handlers);
  }

  public head(path: string, ...handlers: Handler[]): void {
    this.addRoute('HEAD', path, ...handlers);
  }

  public findRoute(method: string, path: string): { route: Route; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      
      const match = path.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.keys.forEach((key, index) => {
          params[key] = match[index + 1];
        });
        
        return { route, params };
      }
    }
    
    return null;
  }

  public async executeHandlers(
    handlers: Handler[],
    req: FrameworkRequest,
    res: FrameworkResponse
  ): Promise<void> {
    let currentIndex = 0;

    const next: NextFunction = (error?: Error) => {
      if (error) {
        throw error;
      }
      
      currentIndex++;
      if (currentIndex < handlers.length) {
        const handler = handlers[currentIndex];
        try {
          const result = handler(req, res, next);
          if (result instanceof Promise) {
            result.catch(next);
          }
        } catch (err) {
          next(err as Error);
        }
      }
    };

    if (handlers.length > 0) {
      try {
        const result = handlers[0](req, res, next);
        if (result instanceof Promise) {
          await result.catch((err) => {
            throw err;
          });
        }
      } catch (error) {
        throw error;
      }
    }
  }

  public getRoutes(): Route[] {
    return [...this.routes];
  }
}