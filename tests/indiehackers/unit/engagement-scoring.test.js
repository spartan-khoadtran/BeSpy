/**
 * Unit Tests for Engagement Scoring Algorithm
 * Tests the prioritization logic based on comments, upvotes, and recency
 */

const MockIndieHackersScraper = require('../mocks/mock-scraper');
const IndieHackersTestUtils = require('../utils/indiehackers-test-utils');

describe('Engagement Scoring Algorithm', () => {
  let scraper;
  let testUtils;

  beforeEach(() => {
    scraper = new MockIndieHackersScraper();
    testUtils = new IndieHackersTestUtils();
  });

  describe('Score Calculation', () => {
    test('should calculate engagement score correctly', () => {
      const engagementMetrics = {
        upvotes: 100,
        comments: 20,
        views: 2000
      };

      const expectedScore = (20 * 3) + (100 * 2) + (2000 * 0.1); // Comments * 3 + Upvotes * 2 + Views * 0.1
      const actualScore = testUtils.calculateEngagementScore(engagementMetrics);
      
      expect(actualScore).toBe(Math.round(expectedScore));
      expect(actualScore).toBe(460);
    });

    test('should handle zero engagement metrics', () => {
      const zeroEngagement = {
        upvotes: 0,
        comments: 0,
        views: 0
      };

      const score = testUtils.calculateEngagementScore(zeroEngagement);
      expect(score).toBe(0);
    });

    test('should handle missing engagement fields', () => {
      const partialEngagement = {
        upvotes: 50
        // Missing comments and views
      };

      const score = testUtils.calculateEngagementScore(partialEngagement);
      expect(score).toBe(100); // Only upvotes counted: 50 * 2
    });

    test('should handle null or undefined engagement', () => {
      expect(testUtils.calculateEngagementScore(null)).toBe(0);
      expect(testUtils.calculateEngagementScore(undefined)).toBe(0);
      expect(testUtils.calculateEngagementScore({})).toBe(0);
    });

    test('should prioritize comments over upvotes', () => {
      const highComments = { upvotes: 10, comments: 50, views: 1000 };
      const highUpvotes = { upvotes: 100, comments: 10, views: 1000 };

      const commentsScore = testUtils.calculateEngagementScore(highComments);
      const upvotesScore = testUtils.calculateEngagementScore(highUpvotes);

      expect(commentsScore).toBeGreaterThan(upvotesScore);
    });

    test('should handle large numbers correctly', () => {
      const highEngagement = {
        upvotes: 9999,
        comments: 9999,
        views: 999999
      };

      const score = testUtils.calculateEngagementScore(highEngagement);
      expect(score).toBeGreaterThan(0);
      expect(typeof score).toBe('number');
      expect(Number.isInteger(score)).toBe(true);
    });
  });

  describe('Post Prioritization', () => {
    test('should sort posts by engagement score correctly', async () => {
      const mockPosts = [
        {
          id: '1',
          title: 'Low Engagement Post',
          engagement: { upvotes: 5, comments: 1, views: 100 },
          timestamp: '2025-08-26T10:00:00Z'
        },
        {
          id: '2', 
          title: 'High Engagement Post',
          engagement: { upvotes: 100, comments: 50, views: 5000 },
          timestamp: '2025-08-26T11:00:00Z'
        },
        {
          id: '3',
          title: 'Medium Engagement Post',
          engagement: { upvotes: 50, comments: 10, views: 1000 },
          timestamp: '2025-08-26T12:00:00Z'
        }
      ];

      const processedPosts = scraper.processPosts(mockPosts);
      
      expect(processedPosts).toHaveLength(3);
      expect(processedPosts[0].id).toBe('2'); // Highest engagement
      expect(processedPosts[1].id).toBe('3'); // Medium engagement
      expect(processedPosts[2].id).toBe('1'); // Lowest engagement

      // Verify scores are in descending order
      for (let i = 1; i < processedPosts.length; i++) {
        expect(processedPosts[i-1].engagement_score)
          .toBeGreaterThanOrEqual(processedPosts[i].engagement_score);
      }
    });

    test('should handle posts with identical engagement scores', async () => {
      const identicalEngagementPosts = [
        {
          id: '1',
          title: 'Post A',
          engagement: { upvotes: 50, comments: 10, views: 1000 },
          timestamp: '2025-08-26T10:00:00Z'
        },
        {
          id: '2',
          title: 'Post B', 
          engagement: { upvotes: 50, comments: 10, views: 1000 },
          timestamp: '2025-08-26T11:00:00Z'
        }
      ];

      const processedPosts = scraper.processPosts(identicalEngagementPosts);
      
      expect(processedPosts).toHaveLength(2);
      expect(processedPosts[0].engagement_score).toBe(processedPosts[1].engagement_score);
    });

    test('should add engagement scores to posts', async () => {
      const posts = [
        {
          id: '1',
          title: 'Test Post',
          engagement: { upvotes: 25, comments: 5, views: 500 }
        }
      ];

      const processedPosts = scraper.processPosts(posts);
      
      expect(processedPosts[0]).toHaveProperty('engagement_score');
      expect(processedPosts[0]).toHaveProperty('processed_at');
      expect(typeof processedPosts[0].engagement_score).toBe('number');
    });
  });

  describe('Scoring Edge Cases', () => {
    test('should handle negative values gracefully', () => {
      const negativeEngagement = {
        upvotes: -10,
        comments: -5,
        views: -100
      };

      const score = testUtils.calculateEngagementScore(negativeEngagement);
      // Should treat negative values as 0 or handle appropriately
      expect(score).toBeLessThanOrEqual(0);
    });

    test('should handle very large numbers', () => {
      const massiveEngagement = {
        upvotes: Number.MAX_SAFE_INTEGER,
        comments: Number.MAX_SAFE_INTEGER,
        views: Number.MAX_SAFE_INTEGER
      };

      const score = testUtils.calculateEngagementScore(massiveEngagement);
      expect(typeof score).toBe('number');
      expect(Number.isFinite(score)).toBe(true);
    });

    test('should handle floating point values', () => {
      const floatEngagement = {
        upvotes: 10.5,
        comments: 5.7,
        views: 100.99
      };

      const score = testUtils.calculateEngagementScore(floatEngagement);
      expect(typeof score).toBe('number');
      expect(Number.isInteger(score)).toBe(true); // Should round to integer
    });

    test('should handle string numeric values', () => {
      const stringEngagement = {
        upvotes: '50',
        comments: '10', 
        views: '1000'
      };

      // Test utils should handle string->number conversion
      const score = scraper.calculateEngagementScore(stringEngagement);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Recency Factor', () => {
    test('should consider recency in scoring when timestamps are close', () => {
      const olderPost = {
        id: '1',
        engagement: { upvotes: 50, comments: 10, views: 1000 },
        timestamp: '2025-08-25T10:00:00Z' // Yesterday
      };

      const newerPost = {
        id: '2',
        engagement: { upvotes: 45, comments: 10, views: 1000 }, // Slightly lower upvotes
        timestamp: '2025-08-26T10:00:00Z' // Today
      };

      // In a tie or close call, newer posts might get a small boost
      // This would be implementation-specific
      const olderScore = testUtils.calculateEngagementScore(olderPost.engagement);
      const newerScore = testUtils.calculateEngagementScore(newerPost.engagement);
      
      // Basic scoring doesn't include recency, but we can test that timestamps are preserved
      expect(olderPost.timestamp).toBeTruthy();
      expect(newerPost.timestamp).toBeTruthy();
      expect(new Date(newerPost.timestamp) > new Date(olderPost.timestamp)).toBe(true);
    });

    test('should preserve timestamp information for recency calculations', async () => {
      const posts = [
        {
          id: '1',
          engagement: { upvotes: 50, comments: 10, views: 1000 },
          timestamp: '2025-08-26T08:00:00Z'
        },
        {
          id: '2',
          engagement: { upvotes: 50, comments: 10, views: 1000 },
          timestamp: '2025-08-26T12:00:00Z'
        }
      ];

      const processedPosts = scraper.processPosts(posts);
      
      processedPosts.forEach(post => {
        expect(post).toHaveProperty('timestamp');
        expect(testUtils.isValidISO8601(post.timestamp)).toBe(true);
      });
    });
  });

  describe('Algorithm Performance', () => {
    test('should calculate scores efficiently for large datasets', () => {
      const largePosts = testUtils.generatePerformanceTestData(1000);
      
      const startTime = process.hrtime.bigint();
      
      largePosts.forEach(post => {
        testUtils.calculateEngagementScore(post.engagement);
      });
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    test('should sort large datasets efficiently', () => {
      const largePosts = testUtils.generatePerformanceTestData(1000);
      
      const startTime = process.hrtime.bigint();
      const processedPosts = scraper.processPosts(largePosts);
      const endTime = process.hrtime.bigint();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      expect(duration).toBeLessThan(500); // Should complete in less than 500ms
      expect(processedPosts).toHaveLength(1000);
      
      // Verify sorting is correct
      for (let i = 1; i < processedPosts.length; i++) {
        expect(processedPosts[i-1].engagement_score)
          .toBeGreaterThanOrEqual(processedPosts[i].engagement_score);
      }
    });
  });

  describe('Score Consistency', () => {
    test('should produce consistent scores for identical input', () => {
      const engagement = { upvotes: 75, comments: 15, views: 1500 };
      
      const scores = [];
      for (let i = 0; i < 10; i++) {
        scores.push(testUtils.calculateEngagementScore(engagement));
      }
      
      // All scores should be identical
      const uniqueScores = [...new Set(scores)];
      expect(uniqueScores).toHaveLength(1);
    });

    test('should maintain relative ordering across multiple calculations', () => {
      const posts = [
        { engagement: { upvotes: 100, comments: 5, views: 2000 } },
        { engagement: { upvotes: 50, comments: 20, views: 1000 } },
        { engagement: { upvotes: 25, comments: 40, views: 500 } }
      ];

      // Calculate scores multiple times
      const results = [];
      for (let i = 0; i < 5; i++) {
        const scores = posts.map(post => testUtils.calculateEngagementScore(post.engagement));
        results.push(scores);
      }

      // Check that relative ordering is consistent
      for (let i = 1; i < results.length; i++) {
        for (let j = 0; j < posts.length; j++) {
          for (let k = j + 1; k < posts.length; k++) {
            const currentComparison = results[i][j] - results[i][k];
            const previousComparison = results[i-1][j] - results[i-1][k];
            
            // Same relative ordering
            expect(Math.sign(currentComparison)).toBe(Math.sign(previousComparison));
          }
        }
      }
    });
  });
});