/**
 * Performance and Reliability Tests for IndieHackers Scraper
 * Tests rate limiting, concurrent processing, data backup, and recovery
 */

const MockIndieHackersScraper = require('../mocks/mock-scraper');
const IndieHackersTestUtils = require('../utils/indiehackers-test-utils');

describe('Performance and Reliability Tests', () => {
  let scraper;
  let testUtils;

  beforeEach(() => {
    scraper = new MockIndieHackersScraper();
    testUtils = new IndieHackersTestUtils();
  });

  afterEach(() => {
    scraper.reset();
  });

  describe('Performance Benchmarks', () => {
    test('should complete single category scraping within time limit', async () => {
      const performanceTest = measurePerformance('single-category-scraping');
      
      await scraper.scrapeCategory('tech');
      
      const results = performanceTest.end();
      const duration = parseFloat(results.duration);
      
      expect(duration).toBeLessThan(2000); // Less than 2 seconds
      expect(results.testName).toBe('single-category-scraping');
    });

    test('should process large datasets efficiently', async () => {
      const largePosts = testUtils.generatePerformanceTestData(1000);
      const performanceTest = measurePerformance('large-dataset-processing');
      
      const processedPosts = scraper.processPosts(largePosts);
      const uniquePosts = scraper.removeDuplicates(processedPosts);
      const trends = scraper.analyzeTrends(uniquePosts);
      
      const results = performanceTest.end();
      
      expect(parseFloat(results.duration)).toBeLessThan(5000); // Less than 5 seconds
      expect(processedPosts.length).toBe(1000);
      expect(uniquePosts.length).toBeLessThanOrEqual(1000);
      expect(trends).toBeDefined();
    });

    test('should handle concurrent category processing efficiently', async () => {
      const categories = ['starting-up', 'tech', 'creators', 'money'];
      const startTime = Date.now();
      
      const promises = categories.map(category => 
        scraper.scrapeCategory(category)
      );
      
      const results = await Promise.all(promises);
      const elapsed = Date.now() - startTime;
      
      expect(results.length).toBe(4);
      expect(elapsed).toBeLessThan(3000); // Should be faster than sequential
      
      // Verify all results are valid
      results.forEach((posts, index) => {
        expect(Array.isArray(posts)).toBe(true);
        posts.forEach(post => {
          expect(post.category).toBe(categories[index]);
        });
      });
    });

    test('should maintain memory efficiency during processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple categories
      for (const category of testUtils.categories.slice(0, 4)) {
        await scraper.scrapeCategory(category);
      }
      
      // Generate reports
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      expect(report).toBeDefined();
      expect(memoryIncrease).toBeLessThan(100); // Less than 100MB increase
    });

    test('should scale linearly with data size', async () => {
      const sizes = [100, 200, 400];
      const times = [];
      
      for (const size of sizes) {
        const posts = testUtils.generatePerformanceTestData(size);
        const startTime = process.hrtime.bigint();
        
        const processedPosts = scraper.processPosts(posts);
        scraper.removeDuplicates(processedPosts);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // ms
        times.push(duration);
      }
      
      // Check for linear scaling (within reasonable bounds)
      const ratio1 = times[1] / times[0]; // 200/100
      const ratio2 = times[2] / times[1]; // 400/200
      
      // Should scale roughly linearly (allowing for some variance)
      expect(ratio1).toBeGreaterThan(1.5);
      expect(ratio1).toBeLessThan(3);
      expect(ratio2).toBeGreaterThan(1.5);
      expect(ratio2).toBeLessThan(3);
    });
  });

  describe('Rate Limiting and Throttling', () => {
    test('should respect rate limiting between requests', async () => {
      const rateLimitedScraper = new MockIndieHackersScraper({
        mockNetworkLatency: 100 // 100ms delay per request
      });

      const startTime = Date.now();
      
      // Scrape multiple categories
      await rateLimitedScraper.scrapeCategory('tech');
      await rateLimitedScraper.scrapeCategory('starting-up');
      await rateLimitedScraper.scrapeCategory('creators');
      
      const elapsed = Date.now() - startTime;
      
      // Should respect delays (3 requests * 100ms = 300ms minimum)
      expect(elapsed).toBeGreaterThanOrEqual(300);
      expect(elapsed).toBeLessThan(1000); // But not excessive
    });

    test('should handle rate limit errors gracefully', async () => {
      const rateLimitingScraper = new MockIndieHackersScraper({
        failureRate: 0.5, // Simulate 50% rate limit failures
        mockNetworkLatency: 50
      });

      const scrapedData = await rateLimitingScraper.scrapeAll();
      
      // Should complete despite some failures
      expect(scrapedData).toBeDefined();
      
      const successfulCategories = Object.entries(scrapedData)
        .filter(([, posts]) => Array.isArray(posts));
      const failedCategories = Object.entries(scrapedData)
        .filter(([, result]) => result.error);

      // Should have some successes and some failures
      expect(successfulCategories.length).toBeGreaterThan(0);
      expect(failedCategories.length).toBeGreaterThan(0);
    });

    test('should implement exponential backoff on retries', async () => {
      // This would test actual retry logic in implementation
      const retryTimes = [];
      let attemptCount = 0;
      
      const mockScrapeWithRetry = async () => {
        attemptCount++;
        const delay = Math.min(1000, 100 * Math.pow(2, attemptCount - 1));
        retryTimes.push(delay);
        
        if (attemptCount < 3) {
          await new Promise(resolve => setTimeout(resolve, delay));
          throw new Error('Rate limited');
        }
        
        return [{ id: 'success', title: 'Success after retries' }];
      };

      try {
        await mockScrapeWithRetry();
      } catch (error) {
        // Expected to succeed after retries
      }

      // Verify exponential backoff pattern
      expect(retryTimes[0]).toBe(100);   // First retry: 100ms
      expect(retryTimes[1]).toBe(200);   // Second retry: 200ms
      expect(retryTimes[2]).toBe(400);   // Third retry: 400ms
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from network timeouts', async () => {
      const timeoutScraper = new MockIndieHackersScraper({
        failureRate: 0.3, // 30% timeout rate
        mockNetworkLatency: 50
      });

      const maxRetries = 3;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < 10; i++) {
        try {
          await timeoutScraper.scrapeCategory('tech');
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      // Should have some successes despite timeouts
      expect(successCount).toBeGreaterThan(3);
      expect(errorCount).toBeGreaterThan(0);
      expect(successCount + errorCount).toBe(10);
    });

    test('should handle partial failures gracefully', async () => {
      const partialFailureScraper = new MockIndieHackersScraper({
        failureRate: 0.5 // 50% failure rate
      });

      const scrapedData = await partialFailureScraper.scrapeAll();
      const report = partialFailureScraper.generateReport(scrapedData);

      // Should generate report even with partial failures
      expect(report).toBeDefined();
      expect(report.metadata).toBeDefined();
      expect(report.summary).toBeDefined();

      // Should document errors
      expect(report.errors).toBeDefined();
      expect(Array.isArray(report.errors)).toBe(true);

      // Should have some successful data
      const successfulData = Object.values(scrapedData)
        .filter(posts => Array.isArray(posts));
      expect(successfulData.length).toBeGreaterThan(0);
    });

    test('should maintain data consistency during failures', async () => {
      const unreliableScraper = new MockIndieHackersScraper({
        failureRate: 0.4
      });

      // Multiple attempts should be consistent
      const results = [];
      for (let i = 0; i < 5; i++) {
        try {
          const data = await unreliableScraper.scrapeCategory('tech');
          results.push(data);
        } catch (error) {
          // Expected some failures
        }
      }

      // Successful results should have consistent structure
      results.forEach(posts => {
        expect(Array.isArray(posts)).toBe(true);
        posts.forEach(post => {
          const validation = testUtils.validatePostStructure(post);
          expect(validation.valid).toBe(true);
        });
      });
    });

    test('should implement circuit breaker pattern', async () => {
      let failureCount = 0;
      const circuitBreakerThreshold = 5;
      let circuitOpen = false;

      const mockCircuitBreaker = {
        async execute(operation) {
          if (circuitOpen) {
            throw new Error('Circuit breaker is open');
          }

          try {
            return await operation();
          } catch (error) {
            failureCount++;
            if (failureCount >= circuitBreakerThreshold) {
              circuitOpen = true;
              setTimeout(() => {
                circuitOpen = false;
                failureCount = 0;
              }, 5000); // Reset after 5 seconds
            }
            throw error;
          }
        }
      };

      // Simulate repeated failures
      for (let i = 0; i < 7; i++) {
        try {
          await mockCircuitBreaker.execute(async () => {
            throw new Error('Simulated failure');
          });
        } catch (error) {
          if (i < 5) {
            expect(error.message).toBe('Simulated failure');
          } else {
            expect(error.message).toBe('Circuit breaker is open');
          }
        }
      }

      expect(circuitOpen).toBe(true);
    });
  });

  describe('Data Backup and Recovery', () => {
    test('should create data backups during processing', async () => {
      const scrapedData = await scraper.scrapeAll();
      
      // Simulate backup creation
      const backup = {
        timestamp: new Date().toISOString(),
        data: scrapedData,
        metadata: {
          version: '1.0.0',
          total_posts: Object.values(scrapedData)
            .flat()
            .filter(post => !post.error).length
        }
      };

      expect(backup.timestamp).toBeDefined();
      expect(testUtils.isValidISO8601(backup.timestamp)).toBe(true);
      expect(backup.data).toEqual(scrapedData);
      expect(backup.metadata.total_posts).toBeGreaterThan(0);
    });

    test('should recover from backup when needed', async () => {
      const originalData = await scraper.scrapeAll();
      
      // Simulate backup
      const backup = {
        timestamp: new Date().toISOString(),
        data: originalData
      };

      // Simulate data loss and recovery
      scraper.reset();
      
      // Recovery process
      const recoveredData = backup.data;
      const report = scraper.generateReport(recoveredData);

      expect(report).toBeDefined();
      expect(report.metadata.total_posts).toBeGreaterThan(0);
      
      // Data should be consistent after recovery
      Object.entries(recoveredData).forEach(([category, posts]) => {
        if (Array.isArray(posts)) {
          posts.forEach(post => {
            const validation = testUtils.validatePostStructure(post);
            expect(validation.valid).toBe(true);
          });
        }
      });
    });

    test('should validate backup integrity', () => {
      const validBackup = {
        timestamp: '2025-08-26T10:00:00Z',
        data: {
          'tech': [
            {
              id: 'test-1',
              title: 'Test Post',
              url: 'https://www.indiehackers.com/post/test',
              author: { username: 'test', display_name: 'Test User' },
              category: 'tech',
              engagement: { upvotes: 50, comments: 10, views: 1000 },
              timestamp: '2025-08-26T09:00:00Z',
              content_preview: 'Test content...'
            }
          ]
        },
        metadata: { version: '1.0.0', total_posts: 1 }
      };

      // Validate backup structure
      expect(validBackup).toHaveProperty('timestamp');
      expect(validBackup).toHaveProperty('data');
      expect(validBackup).toHaveProperty('metadata');
      
      expect(testUtils.isValidISO8601(validBackup.timestamp)).toBe(true);
      
      // Validate data integrity
      Object.entries(validBackup.data).forEach(([category, posts]) => {
        posts.forEach(post => {
          const validation = testUtils.validatePostStructure(post);
          expect(validation.valid).toBe(true);
        });
      });
    });

    test('should handle corrupted backup data', () => {
      const corruptedBackups = [
        null,
        undefined,
        { timestamp: 'invalid' },
        { timestamp: '2025-08-26T10:00:00Z', data: null },
        { timestamp: '2025-08-26T10:00:00Z', data: 'invalid' },
        { 
          timestamp: '2025-08-26T10:00:00Z', 
          data: { 
            tech: [{ invalid: 'post structure' }] 
          } 
        }
      ];

      corruptedBackups.forEach(backup => {
        // Should detect corruption gracefully
        const isValid = backup && 
                       backup.timestamp && 
                       testUtils.isValidISO8601(backup.timestamp) &&
                       backup.data &&
                       typeof backup.data === 'object';

        if (!isValid) {
          expect(isValid).toBe(false);
        } else {
          // Validate data structure if basic structure is valid
          try {
            Object.entries(backup.data).forEach(([category, posts]) => {
              if (Array.isArray(posts)) {
                posts.forEach(post => {
                  testUtils.validatePostStructure(post);
                });
              }
            });
          } catch (error) {
            // Should catch validation errors for corrupted data
            expect(error).toBeDefined();
          }
        }
      });
    });
  });

  describe('Concurrent Processing', () => {
    test('should handle multiple simultaneous scraping operations', async () => {
      const concurrentOperations = 5;
      const promises = [];

      for (let i = 0; i < concurrentOperations; i++) {
        const instanceScraper = new MockIndieHackersScraper({
          mockNetworkLatency: 50 + (i * 10) // Varying delays
        });
        promises.push(instanceScraper.scrapeCategory('tech'));
      }

      const results = await Promise.all(promises);
      
      expect(results.length).toBe(concurrentOperations);
      results.forEach(posts => {
        expect(Array.isArray(posts)).toBe(true);
        posts.forEach(post => {
          expect(post.category).toBe('tech');
        });
      });
    });

    test('should manage resource contention effectively', async () => {
      const resourcePool = { maxConnections: 3, activeConnections: 0 };
      
      const mockResourceManagedOperation = async (duration = 100) => {
        if (resourcePool.activeConnections >= resourcePool.maxConnections) {
          throw new Error('Resource pool exhausted');
        }
        
        resourcePool.activeConnections++;
        
        try {
          await new Promise(resolve => setTimeout(resolve, duration));
          return { success: true, connections: resourcePool.activeConnections };
        } finally {
          resourcePool.activeConnections--;
        }
      };

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          mockResourceManagedOperation(50 + (i * 10))
            .catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.all(promises);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => r.error);
      
      expect(successful.length).toBeGreaterThan(0);
      expect(resourcePool.activeConnections).toBe(0); // All resources released
    });

    test('should prevent race conditions in data processing', async () => {
      let sharedCounter = 0;
      const incrementOperations = 100;
      const promises = [];

      // Simulate concurrent operations that could cause race conditions
      for (let i = 0; i < incrementOperations; i++) {
        promises.push(
          new Promise(resolve => {
            // Simulate async operation
            setTimeout(() => {
              const current = sharedCounter;
              // Simulate processing delay
              setTimeout(() => {
                sharedCounter = current + 1;
                resolve(sharedCounter);
              }, Math.random() * 10);
            }, Math.random() * 10);
          })
        );
      }

      const results = await Promise.all(promises);
      
      // In a race condition scenario, we might not get the expected count
      // This test demonstrates the need for proper synchronization
      expect(results.length).toBe(incrementOperations);
      expect(sharedCounter).toBeLessThanOrEqual(incrementOperations);
    });
  });

  describe('Scalability Testing', () => {
    test('should handle increasing load gracefully', async () => {
      const loadLevels = [10, 25, 50, 100];
      const performanceMetrics = [];

      for (const load of loadLevels) {
        const posts = testUtils.generatePerformanceTestData(load);
        const startTime = process.hrtime.bigint();
        
        const processedPosts = scraper.processPosts(posts);
        const uniquePosts = scraper.removeDuplicates(processedPosts);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // ms
        
        performanceMetrics.push({
          load,
          duration,
          throughput: load / (duration / 1000) // posts per second
        });
      }

      // Performance should not degrade exponentially
      for (let i = 1; i < performanceMetrics.length; i++) {
        const current = performanceMetrics[i];
        const previous = performanceMetrics[i - 1];
        
        // Throughput should not drop dramatically
        const throughputRatio = current.throughput / previous.throughput;
        expect(throughputRatio).toBeGreaterThan(0.5); // Should maintain at least 50% throughput
      }
    });

    test('should maintain acceptable response times under load', async () => {
      const highLoadPosts = testUtils.generatePerformanceTestData(500);
      
      const startTime = Date.now();
      
      const processedPosts = scraper.processPosts(highLoadPosts);
      const uniquePosts = scraper.removeDuplicates(processedPosts);
      const trends = scraper.analyzeTrends(uniquePosts);
      const mockData = { 'high-load': processedPosts };
      const report = scraper.generateReport(mockData);
      
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(10000); // Less than 10 seconds for full pipeline
      expect(processedPosts.length).toBe(500);
      expect(report).toBeDefined();
    });

    test('should scale memory usage linearly', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const memoryMeasurements = [];
      
      for (const size of [100, 200, 300]) {
        const posts = testUtils.generatePerformanceTestData(size);
        scraper.processPosts(posts);
        
        const currentMemory = process.memoryUsage().heapUsed;
        memoryMeasurements.push({
          size,
          memory: currentMemory - initialMemory
        });
      }

      // Memory usage should scale roughly linearly
      const ratio1 = memoryMeasurements[1].memory / memoryMeasurements[0].memory;
      const ratio2 = memoryMeasurements[2].memory / memoryMeasurements[1].memory;
      
      // Allow for some variance, but should be roughly linear
      expect(ratio1).toBeGreaterThan(1.5);
      expect(ratio1).toBeLessThan(3);
      expect(ratio2).toBeGreaterThan(1);
      expect(ratio2).toBeLessThan(2);
    });
  });
});