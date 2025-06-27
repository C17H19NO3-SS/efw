import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { 
  TestServer, 
  createTestApp, 
  setupTestEnv, 
  cleanupTestEnv,
  delay,
  performanceTest
} from './test-helpers';

describe('Performance Tests', () => {
  let testServer: TestServer;
  
  beforeEach(async () => {
    setupTestEnv();
    const app = createTestApp();
    
    // Add performance monitoring middleware
    app.use((req: any, res: any, next: any) => {
      const startTime = performance.now();
      
      const originalSend = res.send;
      const originalJson = res.json;
      
      res.send = function(data: any) {
        const responseTime = performance.now() - startTime;
        res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
        return originalSend.call(this, data);
      };
      
      res.json = function(data: any) {
        const responseTime = performance.now() - startTime;
        res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
        return originalJson.call(this, data);
      };
      
      next();
    });
    
    // Fast endpoint
    app.get('/api/fast', (req: any, res: any) => {
      res.json({ message: 'Fast response', timestamp: Date.now() });
    });
    
    // Slow endpoint (simulated database operation)
    app.get('/api/slow', async (req: any, res: any) => {
      await delay(100); // Simulate 100ms database query
      res.json({ message: 'Slow response', timestamp: Date.now() });
    });
    
    // CPU intensive endpoint
    app.get('/api/cpu-intensive', (req: any, res: any) => {
      const start = performance.now();
      let result = 0;
      
      // Simulate CPU-intensive task
      for (let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i);
      }
      
      const duration = performance.now() - start;
      res.json({ 
        message: 'CPU intensive response', 
        result: Math.floor(result),
        duration: `${duration.toFixed(2)}ms`
      });
    });
    
    // Memory intensive endpoint
    app.get('/api/memory-intensive', (req: any, res: any) => {
      const arrays = [];
      
      // Create large arrays to test memory usage
      for (let i = 0; i < 1000; i++) {
        arrays.push(new Array(1000).fill(Math.random()));
      }
      
      res.json({ 
        message: 'Memory intensive response',
        arrays: arrays.length,
        memoryUsage: process.memoryUsage()
      });
    });
    
    // Endpoint with large response
    app.get('/api/large-response', (req: any, res: any) => {
      const largeData = {
        message: 'Large response',
        data: new Array(10000).fill(0).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `This is item number ${i} with some additional text to make it larger`,
          metadata: {
            created: new Date().toISOString(),
            index: i,
            random: Math.random()
          }
        }))
      };
      
      res.json(largeData);
    });
    
    // Concurrent requests endpoint
    app.get('/api/concurrent/:id', async (req: any, res: any) => {
      const id = req.params.id;
      const delay_time = Math.random() * 50; // Random delay 0-50ms
      
      await delay(delay_time);
      
      res.json({
        id,
        processed_at: new Date().toISOString(),
        delay: `${delay_time.toFixed(2)}ms`
      });
    });
    
    testServer = new TestServer(app);
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
    cleanupTestEnv();
  });

  describe('Response Time Performance', () => {
    test('should respond to fast endpoints quickly', async () => {
      const response = await testServer.request({
        method: 'GET',
        url: '/api/fast'
      });
      
      expect(response.status).toBe(200);
      
      const responseTime = parseFloat(response.headers['x-response-time']);
      expect(responseTime).toBeLessThan(50); // Should be under 50ms
    });

    test('should handle slow endpoints within acceptable time', async () => {
      const response = await testServer.request({
        method: 'GET',
        url: '/api/slow'
      });
      
      expect(response.status).toBe(200);
      
      const responseTime = parseFloat(response.headers['x-response-time']);
      expect(responseTime).toBeGreaterThan(100); // Should be over 100ms due to delay
      expect(responseTime).toBeLessThan(200); // But not too much overhead
    });

    test('should maintain performance under load', async () => {
      const results = await performanceTest(async () => {
        const response = await testServer.request({
          method: 'GET',
          url: '/api/fast'
        });
        expect(response.status).toBe(200);
      }, 50);
      
      expect(results.averageTime).toBeLessThan(100); // Average under 100ms
      expect(results.opsPerSecond).toBeGreaterThan(10); // At least 10 ops/sec
    });
  });

  describe('Throughput Performance', () => {
    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const promises = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          testServer.request({
            method: 'GET',
            url: `/api/concurrent/${i}`
          })
        );
      }
      
      const responses = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Total time should be less than sequential execution
      expect(totalTime).toBeLessThan(concurrentRequests * 50); // Much faster than sequential
      
      console.log(`Concurrent requests completed in ${totalTime.toFixed(2)}ms`);
    });

    test('should handle burst traffic', async () => {
      const burstSize = 20;
      const batches = 3;
      
      for (let batch = 0; batch < batches; batch++) {
        const promises = [];
        
        for (let i = 0; i < burstSize; i++) {
          promises.push(
            testServer.request({
              method: 'GET',
              url: '/api/fast'
            })
          );
        }
        
        const responses = await Promise.all(promises);
        
        // All requests in burst should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
        
        // Small delay between batches
        await delay(100);
      }
    });
  });

  describe('Resource Usage Performance', () => {
    test('should handle CPU intensive operations efficiently', async () => {
      const response = await testServer.request({
        method: 'GET',
        url: '/api/cpu-intensive'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.result).toBeGreaterThan(0);
      
      const duration = parseFloat(response.body.duration);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle memory intensive operations', async () => {
      const initialMemory = process.memoryUsage();
      
      const response = await testServer.request({
        method: 'GET',
        url: '/api/memory-intensive'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.arrays).toBe(1000);
      expect(response.body.memoryUsage).toBeDefined();
      
      // Memory should be cleaned up after response
      await delay(100); // Give time for GC
      const finalMemory = process.memoryUsage();
      
      // Memory usage should not grow excessively
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
    });

    test('should handle large responses efficiently', async () => {
      const startTime = performance.now();
      
      const response = await testServer.request({
        method: 'GET',
        url: '/api/large-response'
      });
      
      const responseTime = performance.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10000);
      
      // Should handle large response in reasonable time
      expect(responseTime).toBeLessThan(1000); // Under 1 second
      
      // Response size should be as expected
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).toBeGreaterThan(1000000); // Over 1MB
    });
  });

  describe('Stress Testing', () => {
    test('should maintain stability under heavy load', async () => {
      const heavyLoadRequests = 100;
      const maxConcurrency = 10;
      const results = [];
      
      // Process requests in batches to avoid overwhelming the server
      for (let i = 0; i < heavyLoadRequests; i += maxConcurrency) {
        const batch = [];
        const batchSize = Math.min(maxConcurrency, heavyLoadRequests - i);
        
        for (let j = 0; j < batchSize; j++) {
          batch.push(
            testServer.request({
              method: 'GET',
              url: '/api/fast'
            })
          );
        }
        
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
        
        // Small delay between batches
        await delay(10);
      }
      
      // All requests should succeed
      const successCount = results.filter(r => r.status === 200).length;
      const successRate = (successCount / heavyLoadRequests) * 100;
      
      expect(successRate).toBeGreaterThan(95); // 95% success rate minimum
      
      console.log(`Heavy load test: ${successCount}/${heavyLoadRequests} requests succeeded (${successRate.toFixed(1)}%)`);
    });

    test('should recover from temporary overload', async () => {
      // Create temporary overload
      const overloadPromises = [];
      for (let i = 0; i < 50; i++) {
        overloadPromises.push(
          testServer.request({
            method: 'GET',
            url: '/api/slow'
          })
        );
      }
      
      // Don't wait for overload to complete, test immediate recovery
      await delay(50);
      
      // Test that new requests still work
      const recoveryResponse = await testServer.request({
        method: 'GET',
        url: '/api/fast'
      });
      
      expect(recoveryResponse.status).toBe(200);
      
      // Wait for overload to complete
      const overloadResults = await Promise.all(overloadPromises);
      const overloadSuccessRate = overloadResults.filter(r => r.status === 200).length / overloadResults.length;
      
      expect(overloadSuccessRate).toBeGreaterThan(0.8); // 80% should still succeed
    });
  });

  describe('Memory Leak Detection', () => {
    test('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        await testServer.request({
          method: 'GET',
          url: '/api/fast'
        });
        
        // Check memory every 10 iterations
        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage();
          const memoryGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
          
          // Memory growth should be reasonable
          expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      await delay(100);
      
      const finalMemory = process.memoryUsage();
      const totalMemoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Final memory should not have grown significantly
      expect(totalMemoryGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB final growth
      
      console.log(`Memory test: Initial ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Growth ${(totalMemoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet basic performance benchmarks', async () => {
      const benchmarks = {
        fastEndpoint: { maxTime: 50, minOpsPerSec: 100 },
        slowEndpoint: { maxTime: 200, minOpsPerSec: 5 },
        concurrentRequests: { maxTime: 500, requests: 20 }
      };
      
      // Test fast endpoint benchmark
      const fastResults = await performanceTest(async () => {
        const response = await testServer.request({
          method: 'GET',
          url: '/api/fast'
        });
        expect(response.status).toBe(200);
      }, 10);
      
      expect(fastResults.averageTime).toBeLessThan(benchmarks.fastEndpoint.maxTime);
      expect(fastResults.opsPerSecond).toBeGreaterThan(benchmarks.fastEndpoint.minOpsPerSec);
      
      // Test concurrent requests benchmark
      const concurrentStart = performance.now();
      const concurrentPromises = Array.from({ length: benchmarks.concurrentRequests.requests }, (_, i) =>
        testServer.request({
          method: 'GET',
          url: `/api/concurrent/${i}`
        })
      );
      
      const concurrentResults = await Promise.all(concurrentPromises);
      const concurrentTime = performance.now() - concurrentStart;
      
      expect(concurrentTime).toBeLessThan(benchmarks.concurrentRequests.maxTime);
      expect(concurrentResults.every(r => r.status === 200)).toBe(true);
      
      console.log(`Performance benchmarks passed:
        - Fast endpoint: ${fastResults.averageTime.toFixed(2)}ms avg, ${fastResults.opsPerSecond.toFixed(2)} ops/sec
        - Concurrent requests: ${concurrentTime.toFixed(2)}ms for ${benchmarks.concurrentRequests.requests} requests`);
    });
  });
});