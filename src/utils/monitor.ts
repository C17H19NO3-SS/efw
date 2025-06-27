import type { FrameworkRequest, FrameworkResponse } from '../types';

export interface RequestMetrics {
  path: string;
  method: string;
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  lastAccessed: Date;
  statusCodes: Record<number, number>;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
}

export class Monitor {
  private static instance: Monitor;
  private requestMetrics = new Map<string, RequestMetrics>();
  private startTime = Date.now();
  private totalRequests = 0;
  private totalErrors = 0;
  private totalResponseTime = 0;
  private cpuStart = process.cpuUsage();

  private constructor() {}

  static getInstance(): Monitor {
    if (!Monitor.instance) {
      Monitor.instance = new Monitor();
    }
    return Monitor.instance;
  }

  trackRequest(req: FrameworkRequest, res: FrameworkResponse, responseTime: number): void {
    const key = `${req.method}:${req.path}`;
    const statusCode = res.statusCode || 200;
    
    this.totalRequests++;
    this.totalResponseTime += responseTime;
    
    if (statusCode >= 400) {
      this.totalErrors++;
    }

    let metrics = this.requestMetrics.get(key);
    if (!metrics) {
      metrics = {
        path: req.path,
        method: req.method,
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastAccessed: new Date(),
        statusCodes: {}
      };
      this.requestMetrics.set(key, metrics);
    }

    metrics.count++;
    metrics.totalTime += responseTime;
    metrics.averageTime = metrics.totalTime / metrics.count;
    metrics.minTime = Math.min(metrics.minTime, responseTime);
    metrics.maxTime = Math.max(metrics.maxTime, responseTime);
    metrics.lastAccessed = new Date();
    metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;
  }

  getRequestMetrics(): RequestMetrics[] {
    return Array.from(this.requestMetrics.values()).sort((a, b) => b.count - a.count);
  }

  getSystemMetrics(): SystemMetrics {
    return {
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(this.cpuStart),
      requestCount: this.totalRequests,
      errorCount: this.totalErrors,
      averageResponseTime: this.totalRequests > 0 ? this.totalResponseTime / this.totalRequests : 0
    };
  }

  getTopEndpoints(limit: number = 10): RequestMetrics[] {
    return this.getRequestMetrics().slice(0, limit);
  }

  getSlowestEndpoints(limit: number = 10): RequestMetrics[] {
    return Array.from(this.requestMetrics.values())
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit);
  }

  getErrorRate(): number {
    return this.totalRequests > 0 ? (this.totalErrors / this.totalRequests) * 100 : 0;
  }

  reset(): void {
    this.requestMetrics.clear();
    this.startTime = Date.now();
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.totalResponseTime = 0;
    this.cpuStart = process.cpuUsage();
  }

  export(): {
    requests: RequestMetrics[];
    system: SystemMetrics;
    summary: {
      totalRequests: number;
      totalErrors: number;
      errorRate: number;
      uptime: number;
    };
  } {
    return {
      requests: this.getRequestMetrics(),
      system: this.getSystemMetrics(),
      summary: {
        totalRequests: this.totalRequests,
        totalErrors: this.totalErrors,
        errorRate: this.getErrorRate(),
        uptime: Date.now() - this.startTime
      }
    };
  }
}

export function createMonitoringMiddleware() {
  const monitor = Monitor.getInstance();
  
  return async (req: FrameworkRequest, res: FrameworkResponse, next: () => Promise<void>) => {
    const startTime = Date.now();
    
    await next();
    
    const responseTime = Date.now() - startTime;
    monitor.trackRequest(req, res, responseTime);
  };
}