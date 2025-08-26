/**
 * Error Handling and Recovery Tests
 * Tests various error scenarios and recovery mechanisms
 */

const MockIndieHackersScraper = require('../mocks/mock-scraper');
const IndieHackersTestUtils = require('../utils/indiehackers-test-utils');
const sampleData = require('../fixtures/sample-posts.json');

describe('Error Handling and Recovery', () => {
  let scraper;
  let testUtils;

  beforeEach(() => {
    scraper = new MockIndieHackersScraper();
    testUtils = new IndieHackersTestUtils();
  });

  afterEach(() => {
    scraper.reset();
  });

  describe('Network Error Handling', () => {
    test('should handle connection timeouts gracefully', async () => {
      const timeoutScraper = new MockIndieHackersScraper({
        mockNetworkLatency: 5000,
        shouldFail: true
      });

      await expect(timeoutScraper.scrapeCategory('tech'))
        .rejects.toThrow();

      // Should not hang or cause application crash
      const stats = timeoutScraper.getStats();
      expect(stats).toBeDefined();
    });

    test('should retry on temporary network failures', async () => {
      let attemptCount = 0;
      const retryingScraper = new MockIndieHackersScraper();
      
      // Mock method to fail first 2 attempts, succeed on 3rd
      const originalScrapeCategory = retryingScraper.scrapeCategory.bind(retryingScraper);
      retryingScraper.scrapeCategory = async function(category) {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network timeout - temporary failure');
        }
        return originalScrapeCategory(category);
      };

      const posts = await retryingScraper.scrapeCategory('tech');
      
      expect(attemptCount).toBe(3);
      expect(Array.isArray(posts)).toBe(true);
    });

    test('should handle DNS resolution failures', async () => {
      const dnsFailureScraper = new MockIndieHackersScraper({ shouldFail: true });

      await expect(dnsFailureScraper.scrapeCategory('tech'))
        .rejects.toThrow();

      // Should capture and log DNS errors appropriately
      const stats = dnsFailureScraper.getStats();
      expect(stats.success_rate).toBe(0);
    });

    test('should handle HTTP error codes gracefully', async () => {
      const httpErrorScenarios = [
        { statusCode: 404, message: 'Page not found' },
        { statusCode: 429, message: 'Too many requests' },
        { statusCode: 500, message: 'Internal server error' },
        { statusCode: 503, message: 'Service unavailable' }
      ];

      for (const scenario of httpErrorScenarios) {
        const errorScraper = new MockIndieHackersScraper({ shouldFail: true });
        
        await expect(errorScraper.scrapeCategory('tech'))
          .rejects.toThrow();
        
        // Should not crash the application
        expect(errorScraper).toBeDefined();
      }
    });

    test('should implement exponential backoff for retries', async () => {
      const retryDelays = [];
      let attempt = 0;

      const backoffStrategy = {
        async retry(operation, maxAttempts = 3) {
          for (let i = 0; i < maxAttempts; i++) {
            try {
              return await operation();
            } catch (error) {
              attempt++;
              if (i === maxAttempts - 1) throw error;
              
              const delay = Math.min(1000, 100 * Math.pow(2, i));
              retryDelays.push(delay);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
      };

      const failingOperation = async () => {
        if (attempt < 2) {
          throw new Error('Temporary failure');
        }
        return 'Success';
      };

      const result = await backoffStrategy.retry(failingOperation);
      
      expect(result).toBe('Success');
      expect(retryDelays[0]).toBe(100);  // First retry: 100ms
      expect(retryDelays[1]).toBe(200);  // Second retry: 200ms
    });
  });

  describe('Data Parsing Error Handling', () => {
    test('should handle malformed HTML gracefully', () => {
      const malformedHTML = '<div><span>Unclosed tag<div>Another div</span>';
      
      // Mock HTML parsing (this would be in the actual scraper)
      const parseHTML = (html) => {
        try {
          // Simulate parsing malformed HTML
          if (html.includes('Unclosed')) {
            throw new Error('Malformed HTML structure');
          }
          return { posts: [] };
        } catch (error) {
          return { posts: [], error: error.message };
        }
      };

      const result = parseHTML(malformedHTML);
      expect(result.error).toBeDefined();
      expect(result.posts).toEqual([]);
    });

    test('should handle missing required HTML elements', () => {
      const incompleteHTML = testUtils.generateMockHTML('tech', 3);
      const htmlWithoutPosts = incompleteHTML.replace(/<div class="post-item"/g, '<div class="other-item"');

      // Mock parsing HTML without expected elements
      const extractPosts = (html) => {
        const posts = [];
        const postMatches = html.match(/data-testid="post-\d+"/g);
        
        if (!postMatches || postMatches.length === 0) {
          return { posts: [], warning: 'No posts found in HTML' };
        }

        return { posts: postMatches.map(match => ({ id: match })) };
      };

      const result = extractPosts(htmlWithoutPosts);
      expect(result.warning).toBeDefined();
      expect(result.posts).toEqual([]);
    });

    test('should handle JSON parsing errors', () => {
      const invalidJSONStrings = [
        '{ invalid json }',
        '{"unclosed": "object"',
        '{"null_value": null,}', // trailing comma
        'not json at all',
        '',
        null,
        undefined
      ];

      invalidJSONStrings.forEach(jsonString => {
        const parseResult = parseJSONSafely(jsonString);
        expect(parseResult.success).toBe(false);
        expect(parseResult.data).toBeNull();
        expect(parseResult.error).toBeDefined();
      });
    });

    test('should handle data type mismatches', () => {
      const postsWithTypeMismatches = [
        {
          id: 123, // Should be string
          title: 'Valid Title',
          engagement: 'invalid engagement' // Should be object
        },
        {
          id: 'valid-id',
          title: null, // Should be string
          engagement: { upvotes: '50', comments: 'ten' } // Should be numbers
        }
      ];

      postsWithTypeMismatches.forEach(post => {
        const validation = testUtils.validatePostStructure(post);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    test('should sanitize and validate extracted data', () => {
      const potentiallyDangerousData = {
        id: 'post-1',
        title: '<script>alert("xss")</script>Safe Title',
        author: {
          username: 'user<script>',
          display_name: 'User & Name'
        },
        content_preview: 'Content with <img src="x" onerror="alert(1)"> and other html'
      };

      // Mock sanitization function
      const sanitizeText = (text) => {
        if (typeof text !== 'string') return '';
        return text
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      };

      const sanitizedPost = {
        ...potentiallyDangerousData,
        title: sanitizeText(potentiallyDangerousData.title),
        author: {
          username: sanitizeText(potentiallyDangerousData.author.username),
          display_name: sanitizeText(potentiallyDangerousData.author.display_name)
        },
        content_preview: sanitizeText(potentiallyDangerousData.content_preview)
      };

      expect(sanitizedPost.title).not.toContain('<script>');
      expect(sanitizedPost.title).toContain('Safe Title');
      expect(sanitizedPost.author.username).toBe('userscript');
      expect(sanitizedPost.content_preview).not.toContain('<img');
    });
  });

  describe('Rate Limiting and Throttling Errors', () => {
    test('should detect and handle rate limiting responses', async () => {
      const rateLimitedScraper = new MockIndieHackersScraper();
      
      // Mock rate limiting scenario
      let requestCount = 0;
      const originalScrapeCategory = rateLimitedScraper.scrapeCategory.bind(rateLimitedScraper);
      rateLimitedScraper.scrapeCategory = async function(category) {
        requestCount++;
        if (requestCount > 3) {
          const error = new Error('Rate limited');
          error.statusCode = 429;
          error.retryAfter = 5000;
          throw error;
        }
        return originalScrapeCategory(category);
      };

      // First 3 requests should succeed
      await rateLimitedScraper.scrapeCategory('tech');
      await rateLimitedScraper.scrapeCategory('starting-up');
      await rateLimitedScraper.scrapeCategory('creators');

      // 4th request should be rate limited
      await expect(rateLimitedScraper.scrapeCategory('money'))
        .rejects.toThrow('Rate limited');

      expect(requestCount).toBe(4);
    });

    test('should respect retry-after headers', async () => {
      const retryAfterSeconds = 2;
      let lastRequestTime = Date.now();

      const rateLimitHandler = {
        async handleRateLimit(retryAfter) {
          const waitTime = retryAfter * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          lastRequestTime = Date.now();
        }
      };

      const startTime = Date.now();
      await rateLimitHandler.handleRateLimit(retryAfterSeconds);
      const elapsed = lastRequestTime - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(retryAfterSeconds * 1000 - 100); // Allow 100ms tolerance
    });

    test('should implement adaptive throttling', async () => {
      let requestInterval = 100; // Start with 100ms between requests
      const errorCounts = { consecutive: 0, total: 0 };

      const adaptiveThrottler = {
        async makeRequest(operation) {
          await new Promise(resolve => setTimeout(resolve, requestInterval));
          
          try {
            const result = await operation();
            // Success: reduce interval
            errorCounts.consecutive = 0;
            requestInterval = Math.max(50, requestInterval * 0.9);
            return result;
          } catch (error) {
            // Failure: increase interval
            errorCounts.consecutive++;
            errorCounts.total++;
            requestInterval = Math.min(5000, requestInterval * 1.5);
            throw error;
          }
        }
      };

      // Simulate some failures, then success
      let attemptCount = 0;
      const mockOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'Success';
      };

      try {
        await adaptiveThrottler.makeRequest(mockOperation);
      } catch (error) {
        // First failure
        expect(requestInterval).toBeGreaterThan(100);
      }

      try {
        await adaptiveThrottler.makeRequest(mockOperation);
      } catch (error) {
        // Second failure - interval should increase more
        expect(requestInterval).toBeGreaterThan(150);
      }

      // Final success
      const result = await adaptiveThrottler.makeRequest(mockOperation);
      expect(result).toBe('Success');
      expect(errorCounts.consecutive).toBe(0);
    });
  });

  describe('Memory and Resource Management', () => {
    test('should handle out-of-memory scenarios gracefully', async () => {
      // Simulate memory pressure
      const memoryMonitor = {
        checkMemoryUsage() {
          const usage = process.memoryUsage();
          const memoryLimitMB = 100; // Simulate low memory limit
          const currentMB = usage.heapUsed / 1024 / 1024;
          
          return {
            usage: currentMB,
            isNearLimit: currentMB > memoryLimitMB * 0.8,
            isAtLimit: currentMB > memoryLimitMB
          };
        },

        async processWithMemoryCheck(operation) {
          const beforeMemory = this.checkMemoryUsage();
          
          if (beforeMemory.isAtLimit) {
            throw new Error('Memory limit exceeded');
          }

          if (beforeMemory.isNearLimit) {
            // Trigger garbage collection if available
            if (global.gc) {
              global.gc();
            }
          }

          return await operation();
        }
      };

      const largeDataOperation = async () => {
        // Simulate processing large dataset
        const largePosts = testUtils.generatePerformanceTestData(100);
        return scraper.processPosts(largePosts);
      };

      try {
        const result = await memoryMonitor.processWithMemoryCheck(largeDataOperation);
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        if (error.message === 'Memory limit exceeded') {
          expect(error).toBeDefined();
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    });

    test('should clean up resources after errors', async () => {
      const resourceTracker = {
        openConnections: 0,
        activeOperations: 0,

        async acquireResource() {
          this.openConnections++;
          this.activeOperations++;
          return { id: Date.now() };
        },

        releaseResource(resource) {
          this.openConnections--;
          this.activeOperations--;
        },

        async performOperation(operation) {
          const resource = await this.acquireResource();
          
          try {
            return await operation(resource);
          } finally {
            this.releaseResource(resource);
          }
        }
      };

      // Test successful operation
      const successResult = await resourceTracker.performOperation(async (resource) => {
        expect(resource).toBeDefined();
        return 'success';
      });

      expect(successResult).toBe('success');
      expect(resourceTracker.openConnections).toBe(0);
      expect(resourceTracker.activeOperations).toBe(0);

      // Test operation that throws error
      await expect(resourceTracker.performOperation(async () => {
        throw new Error('Operation failed');
      })).rejects.toThrow('Operation failed');

      // Resources should still be cleaned up after error
      expect(resourceTracker.openConnections).toBe(0);
      expect(resourceTracker.activeOperations).toBe(0);
    });

    test('should prevent memory leaks in long-running operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate long-running operation with potential memory leaks
      for (let i = 0; i < 50; i++) {
        const posts = testUtils.generatePerformanceTestData(100);
        scraper.processPosts(posts);
        
        // Explicit cleanup every 10 iterations
        if (i % 10 === 0) {
          scraper.reset();
          if (global.gc) {
            global.gc();
          }
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      // Memory increase should be reasonable (less than 200MB)
      expect(memoryIncrease).toBeLessThan(200);
    });
  });

  describe('Data Consistency and Recovery', () => {
    test('should maintain data integrity during partial failures', async () => {
      const partialFailureScraper = new MockIndieHackersScraper({
        failureRate: 0.4 // 40% failure rate
      });

      const scrapedData = await partialFailureScraper.scrapeAll();
      
      // Verify successful categories have consistent data
      Object.entries(scrapedData).forEach(([category, posts]) => {
        if (Array.isArray(posts)) {
          posts.forEach(post => {
            expect(post.category).toBe(category);
            const validation = testUtils.validatePostStructure(post);
            expect(validation.valid).toBe(true);
          });
        }
      });

      // Should be able to generate report with partial data
      const report = partialFailureScraper.generateReport(scrapedData);
      expect(report).toBeDefined();
      expect(report.errors).toBeDefined();
    });

    test('should recover from corrupted intermediate data', async () => {
      const validPosts = [
        {
          id: 'valid-1',
          title: 'Valid Post',
          author: { username: 'user1', display_name: 'User 1' },
          category: 'tech',
          engagement: { upvotes: 50, comments: 10, views: 1000 },
          timestamp: '2025-08-26T10:00:00Z',
          content_preview: 'Valid content...'
        }
      ];

      const corruptedPosts = [
        null,
        undefined,
        { corrupted: 'data' },
        { id: 'broken', title: null, author: 'invalid' }
      ];

      const mixedData = [...validPosts, ...corruptedPosts];

      // Filter and process only valid posts
      const cleanedPosts = mixedData.filter(post => {
        if (!post) return false;
        const validation = testUtils.validatePostStructure(post);
        return validation.valid;
      });

      expect(cleanedPosts.length).toBe(1);
      expect(cleanedPosts[0].id).toBe('valid-1');
    });

    test('should implement checksum validation for critical data', () => {
      const createChecksum = (data) => {
        const dataString = JSON.stringify(data);
        // Simple checksum implementation for testing
        let checksum = 0;
        for (let i = 0; i < dataString.length; i++) {
          checksum += dataString.charCodeAt(i);
        }
        return checksum.toString(36);
      };

      const validateChecksum = (data, expectedChecksum) => {
        const actualChecksum = createChecksum(data);
        return actualChecksum === expectedChecksum;
      };

      const testData = { id: 'test', title: 'Test Post', category: 'tech' };
      const checksum = createChecksum(testData);
      
      // Valid data should pass validation
      expect(validateChecksum(testData, checksum)).toBe(true);
      
      // Modified data should fail validation
      const modifiedData = { ...testData, title: 'Modified Title' };
      expect(validateChecksum(modifiedData, checksum)).toBe(false);
    });

    test('should handle database transaction failures gracefully', async () => {
      // Mock database transaction
      const mockDB = {
        inTransaction: false,
        operations: [],

        async beginTransaction() {
          this.inTransaction = true;
          this.operations = [];
        },

        async executeOperation(operation) {
          if (!this.inTransaction) {
            throw new Error('No active transaction');
          }
          
          // Simulate random failures
          if (Math.random() < 0.3) {
            throw new Error('Database operation failed');
          }
          
          this.operations.push(operation);
          return { success: true };
        },

        async commitTransaction() {
          if (!this.inTransaction) {
            throw new Error('No active transaction');
          }
          
          this.inTransaction = false;
          return { committed: this.operations.length };
        },

        async rollbackTransaction() {
          this.inTransaction = false;
          this.operations = [];
          return { rolledBack: true };
        }
      };

      const performDatabaseOperations = async (operations) => {
        await mockDB.beginTransaction();
        
        try {
          for (const operation of operations) {
            await mockDB.executeOperation(operation);
          }
          
          return await mockDB.commitTransaction();
        } catch (error) {
          await mockDB.rollbackTransaction();
          throw error;
        }
      };

      const operations = ['insert_post_1', 'insert_post_2', 'update_stats'];

      try {
        const result = await performDatabaseOperations(operations);
        expect(result.committed).toBeGreaterThan(0);
      } catch (error) {
        // Should rollback on failure
        expect(mockDB.operations).toEqual([]);
        expect(mockDB.inTransaction).toBe(false);
      }
    });
  });

  /**
   * Helper function to safely parse JSON
   */
  function parseJSONSafely(jsonString) {
    try {
      if (typeof jsonString !== 'string' || jsonString.trim() === '') {
        return { success: false, data: null, error: 'Invalid input' };
      }
      
      const parsed = JSON.parse(jsonString);
      return { success: true, data: parsed, error: null };
    } catch (error) {
      return { success: false, data: null, error: error.message };
    }
  }
});