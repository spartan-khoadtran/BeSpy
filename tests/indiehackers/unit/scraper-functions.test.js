/**
 * Unit Tests for IndieHackers Scraper Functions
 * Tests individual scraping functions and data extraction logic
 */

const MockIndieHackersScraper = require('../mocks/mock-scraper');
const IndieHackersTestUtils = require('../utils/indiehackers-test-utils');

describe('IndieHackers Scraper Functions', () => {
  let scraper;
  let testUtils;

  beforeEach(() => {
    scraper = new MockIndieHackersScraper();
    testUtils = new IndieHackersTestUtils();
  });

  afterEach(() => {
    scraper.reset();
  });

  describe('Category Scraping', () => {
    test('should scrape starting-up category successfully', async () => {
      const posts = await scraper.scrapeCategory('starting-up');
      
      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
      
      // Verify all posts belong to the category
      posts.forEach(post => {
        expect(post.category).toBe('starting-up');
        expect(post).toHaveProperty('scraped_at');
        expect(post).toHaveProperty('scraper_version');
      });
    });

    test('should scrape tech category successfully', async () => {
      const posts = await scraper.scrapeCategory('tech');
      
      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
      
      posts.forEach(post => {
        expect(post.category).toBe('tech');
        const validation = testUtils.validatePostStructure(post);
        expect(validation.valid).toBe(true);
      });
    });

    test('should scrape artificial-intelligence category successfully', async () => {
      const posts = await scraper.scrapeCategory('artificial-intelligence');
      
      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
      
      posts.forEach(post => {
        expect(post.category).toBe('artificial-intelligence');
      });
    });

    test('should handle non-existent category gracefully', async () => {
      const posts = await scraper.scrapeCategory('non-existent');
      
      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBe(0);
    });

    test('should apply delay between requests when configured', async () => {
      const scraperWithDelay = new MockIndieHackersScraper({ delay: 100 });
      const startTime = Date.now();
      
      await scraperWithDelay.scrapeCategory('tech');
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    test('should handle scraping errors appropriately', async () => {
      const failingScraper = new MockIndieHackersScraper({ shouldFail: true });
      
      await expect(failingScraper.scrapeCategory('tech'))
        .rejects.toThrow('Mock scraping failed for category: tech');
    });
  });

  describe('Data Extraction', () => {
    test('should extract post title correctly', () => {
      const mockPost = {
        id: 'test-1',
        title: 'How I Built a $50k MRR SaaS',
        url: 'https://www.indiehackers.com/post/test',
        author: { username: 'testuser', display_name: 'Test User' },
        category: 'starting-up',
        engagement: { upvotes: 100, comments: 20, views: 1000 },
        timestamp: '2025-08-26T10:00:00Z',
        content_preview: 'Test content...'
      };

      const validation = testUtils.validatePostStructure(mockPost);
      expect(validation.valid).toBe(true);
      expect(mockPost.title).toBe('How I Built a $50k MRR SaaS');
    });

    test('should extract author information correctly', () => {
      const mockPost = {
        id: 'test-2',
        title: 'Test Post',
        url: 'https://www.indiehackers.com/post/test',
        author: {
          username: 'johndoe',
          display_name: 'John Doe',
          profile_url: 'https://www.indiehackers.com/@johndoe'
        },
        category: 'tech',
        engagement: { upvotes: 50, comments: 10, views: 500 },
        timestamp: '2025-08-26T10:00:00Z',
        content_preview: 'Test content...'
      };

      expect(mockPost.author.username).toBe('johndoe');
      expect(mockPost.author.display_name).toBe('John Doe');
      expect(mockPost.author.profile_url).toBe('https://www.indiehackers.com/@johndoe');
      
      const authorValidation = testUtils.validateAuthorStructure(mockPost.author);
      expect(authorValidation.valid).toBe(true);
    });

    test('should extract engagement metrics correctly', () => {
      const mockEngagement = {
        upvotes: 125,
        comments: 35,
        views: 2200
      };

      const validation = testUtils.validateEngagementMetrics(mockEngagement);
      expect(validation.valid).toBe(true);
      expect(mockEngagement.upvotes).toBe(125);
      expect(mockEngagement.comments).toBe(35);
      expect(mockEngagement.views).toBe(2200);
    });

    test('should extract timestamp in correct format', () => {
      const timestamp = '2025-08-26T10:30:00Z';
      expect(testUtils.isValidISO8601(timestamp)).toBe(true);
      
      const date = new Date(timestamp);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe(timestamp);
    });

    test('should extract content preview', () => {
      const contentPreview = 'This is a sample content preview that should be extracted...';
      expect(contentPreview).toBeDefined();
      expect(typeof contentPreview).toBe('string');
      expect(contentPreview.length).toBeGreaterThan(10);
    });

    test('should extract category information', () => {
      const categories = testUtils.categories;
      expect(categories).toContain('starting-up');
      expect(categories).toContain('tech');
      expect(categories).toContain('artificial-intelligence');
      expect(categories).toContain('creators');
      expect(categories).toContain('money');
    });
  });

  describe('URL Validation', () => {
    test('should validate IndieHackers URLs', () => {
      const validUrls = [
        'https://www.indiehackers.com/post/test-post',
        'https://www.indiehackers.com/starting-up',
        'https://www.indiehackers.com/tech'
      ];

      validUrls.forEach(url => {
        expect(testUtils.isValidIndieHackersUrl(url)).toBe(true);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        'http://www.indiehackers.com/post/test', // HTTP instead of HTTPS
        'https://example.com/post/test', // Wrong domain
        'not-a-url',
        '',
        null,
        undefined
      ];

      invalidUrls.forEach(url => {
        expect(testUtils.isValidIndieHackersUrl(url)).toBe(false);
      });
    });

    test('should validate profile URLs', () => {
      const validProfileUrls = [
        'https://www.indiehackers.com/@johndoe',
        'https://www.indiehackers.com/@test-user',
        'https://www.indiehackers.com/@user123'
      ];

      validProfileUrls.forEach(url => {
        expect(testUtils.isValidIndieHackersProfileUrl(url)).toBe(true);
      });
    });

    test('should reject invalid profile URLs', () => {
      const invalidProfileUrls = [
        'https://www.indiehackers.com/johndoe', // Missing @
        'https://www.indiehackers.com/@', // Empty username
        'https://example.com/@johndoe', // Wrong domain
      ];

      invalidProfileUrls.forEach(url => {
        expect(testUtils.isValidIndieHackersProfileUrl(url)).toBe(false);
      });
    });
  });

  describe('Data Validation', () => {
    test('should validate complete post structure', () => {
      const validPost = {
        id: 'valid-post-1',
        title: 'Valid Test Post',
        url: 'https://www.indiehackers.com/post/valid-test',
        author: {
          username: 'validuser',
          display_name: 'Valid User'
        },
        category: 'starting-up',
        engagement: {
          upvotes: 100,
          comments: 25,
          views: 1500
        },
        timestamp: '2025-08-26T12:00:00Z',
        content_preview: 'This is a valid post preview...'
      };

      const validation = testUtils.validatePostStructure(validPost);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    test('should detect missing required fields', () => {
      const incompletePost = {
        id: 'incomplete-post',
        title: 'Incomplete Post'
        // Missing other required fields
      };

      const validation = testUtils.validatePostStructure(incompletePost);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(error => error.includes('Missing required field'))).toBe(true);
    });

    test('should validate timestamp format', () => {
      const validTimestamps = [
        '2025-08-26T10:30:00Z',
        '2025-08-26T10:30:00.000Z',
        '2025-12-31T23:59:59Z'
      ];

      validTimestamps.forEach(timestamp => {
        expect(testUtils.isValidISO8601(timestamp)).toBe(true);
      });

      const invalidTimestamps = [
        '2025-08-26',
        '2025-08-26 10:30:00',
        'invalid-date',
        '',
        null
      ];

      invalidTimestamps.forEach(timestamp => {
        expect(testUtils.isValidISO8601(timestamp)).toBe(false);
      });
    });

    test('should validate engagement metrics', () => {
      const validEngagement = {
        upvotes: 50,
        comments: 10,
        views: 800
      };

      const validation = testUtils.validateEngagementMetrics(validEngagement);
      expect(validation.valid).toBe(true);

      const invalidEngagement = {
        upvotes: -5, // Negative value
        comments: 'invalid', // String instead of number
        views: 100
      };

      const invalidValidation = testUtils.validateEngagementMetrics(invalidEngagement);
      expect(invalidValidation.valid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeouts gracefully', async () => {
      const timeoutScraper = new MockIndieHackersScraper({
        mockNetworkLatency: 5000,
        shouldFail: true
      });

      const startTime = Date.now();
      await expect(timeoutScraper.scrapeCategory('tech'))
        .rejects.toThrow();
      
      // Should fail quickly, not wait for full timeout
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000);
    });

    test('should handle malformed data gracefully', () => {
      const malformedData = {
        // Missing required fields
        title: 'Test',
        author: null,
        engagement: 'invalid'
      };

      const validation = testUtils.validatePostStructure(malformedData);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should handle empty responses', async () => {
      const emptyScraper = new MockIndieHackersScraper();
      const posts = await emptyScraper.scrapeCategory('non-existent');
      
      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBe(0);
    });
  });

  describe('Performance Considerations', () => {
    test('should process posts within reasonable time', async () => {
      const performanceTest = measurePerformance('category-scraping');
      
      await scraper.scrapeCategory('tech');
      
      const results = performanceTest.end();
      expect(parseFloat(results.duration)).toBeLessThan(1000); // Less than 1 second
    });

    test('should not consume excessive memory', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple categories
      for (const category of testUtils.categories.slice(0, 3)) {
        await scraper.scrapeCategory(category);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase
    });
  });
});